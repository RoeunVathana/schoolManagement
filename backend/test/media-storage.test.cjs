require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { join, relative, isAbsolute } = require('node:path');
const { tmpdir } = require('node:os');
const express = require('express');
const multer = require('multer');
const { ConfigService } = require('@nestjs/config');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const { uploadsRoot, uploadsOnVolume, localUploadPath } = require('../src/common/upload-paths');
const options = require('../src/common/upload.options');
const { MediaStorageService } = require('../src/media/media-storage.service');
const { MediaRetentionService } = require('../src/media/media-retention.service');
const { CertificatesController } = require('../src/certificates/certificates.controller');
const { CourseMaterialsController } = require('../src/course-materials/course-materials.controller');

async function temporaryVolume(t) {
  const directory = await fs.mkdtemp(join(tmpdir(), 'campusflow-storage-test-'));
  const keys = ['UPLOAD_DIR', 'RAILWAY_VOLUME_MOUNT_PATH'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  delete process.env.UPLOAD_DIR;
  process.env.RAILWAY_VOLUME_MOUNT_PATH = directory;
  t.after(async () => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    const child = relative(tmpdir(), directory);
    assert.ok(!isAbsolute(child) && child.startsWith('campusflow-storage-test-') && !child.includes('..'));
    await fs.rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('volume selection works regardless of Docker working directory and rejects an override outside the volume', () => {
  const mount = join(tmpdir(), 'media-volume');
  for (const cwd of [join(tmpdir(), 'app'), join(tmpdir(), 'app', 'backend')]) {
    assert.equal(uploadsRoot({ RAILWAY_VOLUME_MOUNT_PATH: mount }, cwd), mount);
    assert.ok(uploadsOnVolume({ RAILWAY_VOLUME_MOUNT_PATH: mount }, cwd));
  }
  assert.ok(uploadsOnVolume({ RAILWAY_VOLUME_MOUNT_PATH: mount, UPLOAD_DIR: join(mount, 'uploads') }));
  assert.equal(uploadsOnVolume({ RAILWAY_VOLUME_MOUNT_PATH: mount, UPLOAD_DIR: `${mount}-other` }), false);
  assert.equal(uploadsOnVolume({ UPLOAD_DIR: mount }), false);
});

test('upload paths reject traversal, unrelated folders, drive paths and nested files', () => {
  for (const url of ['/uploads/profiles/../../secret', '/uploads/profiles/..', '/uploads/profiles/C:secret', '/uploads/profiles/a\\b', '/uploads/private/file', '/uploads/profiles/sub/file', 'https://example.com/image']) {
    assert.equal(localUploadPath(url), null, url);
  }
});

test('all upload types are readable after server restart on the same volume', async (t) => {
  const directory = await temporaryVolume(t);
  const storage = new MediaStorageService(new ConfigService({ MEDIA_STORAGE: 'local' }));
  const routes = {
    homework: options.homeworkUpload, assignments: options.assignmentUpload,
    exams: options.examImageUpload, 'exam-submissions': options.examSubmissionUpload,
    courses: options.courseImageUpload, 'course-materials': options.courseMaterialUpload,
    certificates: options.certificateUpload, profiles: options.profileImageUpload,
    covers: options.coverImageUpload, groups: options.groupImageUpload,
    posts: options.postMediaUpload, stories: options.storyMediaUpload, chat: options.chatMediaUpload,
  };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jvRkAAAAASUVORK5CYII=', 'base64');
  const start = async () => {
    const app = express();
    app.use('/uploads', express.static(uploadsRoot()));
    for (const [folder, settings] of Object.entries(routes)) {
      app.post(`/${folder}`, multer(settings).single('file'), async (req, res, next) => {
        try { res.json(await storage.upload(req.file, folder)); }
        catch (error) { next(error); }
      });
    }
    const server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    return { base: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
  };
  let instance = await start();
  const urls = [];
  try {
    for (const folder of Object.keys(routes)) {
      const form = new FormData();
      form.append('file', new Blob([png], { type: 'image/png' }), 'sample.png');
      const response = await fetch(`${instance.base}/${folder}`, { method: 'POST', body: form });
      assert.equal(response.status, 200, folder);
      const { url } = await response.json();
      urls.push(url);
      assert.deepEqual(await fs.readFile(localUploadPath(url)), png);
      assert.ok(localUploadPath(url).startsWith(directory));
    }
    await instance.close();
    instance = await start();
    for (const url of urls) {
      const response = await fetch(`${instance.base}${url}`);
      assert.equal(response.status, 200, url);
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), png);
    }
    const source = await storage.prepareForArchive(urls[0]);
    assert.deepEqual(await fs.readFile(source.path), png);
    await source.cleanup();
    assert.deepEqual(await fs.readFile(source.path), png);
    await storage.remove(urls[0]);
    await assert.rejects(fs.access(source.path));
  } finally { await instance.close(); }
});

test('a Firebase Auth app without credentials cannot silently become the Storage app', async (t) => {
  const app = initializeApp({ projectId: 'auth-only-test' });
  t.after(() => deleteApp(app));
  const storage = new MediaStorageService(new ConfigService({ MEDIA_STORAGE: 'firebase', FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '' }));
  await assert.rejects(storage.upload({ mimetype: 'image/png', filename: 'file.png' }, 'profiles'), /Admin credentials are missing/);
});

test('failed cloud upload preserves the staging file and successful upload removes it', async (t) => {
  const directory = await temporaryVolume(t);
  const path = join(directory, 'staged.png');
  await fs.writeFile(path, 'image fixture');
  const app = initializeApp({ projectId: 'storage-test' }, 'storage-test');
  t.after(() => deleteApp(app));
  const storage = new MediaStorageService(new ConfigService({ MEDIA_STORAGE: 'firebase' }));
  storage.firebaseApp = () => app;
  let fail = true;
  t.mock.method(getStorage(app), 'bucket', () => ({
    name: 'test-bucket',
    upload: async () => { if (fail) throw new Error('private provider details'); },
  }));
  const file = { path, filename: 'staged.png', mimetype: 'image/png' };
  await assert.rejects(storage.upload(file, 'profiles'), (error) => {
    assert.equal(error.getStatus(), 503);
    assert.ok(!error.message.includes('private provider details'));
    return true;
  });
  assert.equal(await fs.readFile(path, 'utf8'), 'image fixture');
  fail = false;
  const result = await storage.upload(file, 'profiles');
  assert.match(result.url, /^https:\/\/firebasestorage.googleapis.com\//);
  await assert.rejects(fs.access(path));
});

test('Telegram backup keeps live media and database references by default, including repeat runs', async (t) => {
  const directory = await temporaryVolume(t);
  const path = join(directory, 'backed-up.png');
  await fs.writeFile(path, 'keep this image');
  let existing = null;
  let backups = 0;
  let clears = 0;
  let deleted = 0;
  const candidate = { url: '/uploads/posts/backed-up.png', createdAt: new Date(0), references: [{ sourceType: 'POST', sourceId: 'post', mediaType: 'IMAGE' }] };
  const prisma = { mediaArchive: {
    findUnique: async () => existing,
    create: async () => { existing = { id: 'archive' }; },
  } };
  const storage = { prepareForArchive: async () => ({ path, fileName: 'backed-up.png', cleanup: async () => {}, deleteSource: async () => { deleted++; await fs.unlink(path); } }) };
  const service = new MediaRetentionService(prisma, { get: () => undefined }, {}, storage);
  service.collectCandidates = async () => [candidate];
  service.uploadInChunks = async () => { backups++; return [1]; };
  service.clearReferences = async () => { clears++; };
  const input = { cutoff: new Date(), reason: 'STORAGE_LIMIT', targetBytes: 1, currentBytes: 100 };
  const result = await service.archiveCandidates(input);
  assert.equal(result.archived, 1);
  assert.equal(result.bytesFreed, 0);
  assert.equal((await service.archiveCandidates(input)).skipped, 1);
  assert.equal(backups, 1);
  assert.equal(deleted, 0);
  assert.equal(clears, 0);
  assert.equal(await fs.readFile(path, 'utf8'), 'keep this image');
});

test('failed database replacement or deletion never removes the existing certificate or material', async () => {
  let removals = 0;
  const failure = async () => { throw new Error('database unavailable'); };
  const media = { upload: async () => ({ url: '/uploads/certificates/new.png' }), remove: async () => { removals++; } };
  const prisma = { courseCertificate: { findUnique: async () => ({ fileUrl: '/uploads/certificates/old.png' }), upsert: failure, delete: failure }, courseMaterial: { delete: failure } };
  const certificates = new CertificatesController(prisma, media);
  certificates.assertCourseAccess = async () => ({ courseName: 'course' });
  certificates.assertEnrollment = async () => ({});
  certificates.assertCertificateAccess = async () => ({ fileUrl: '/uploads/certificates/old.png' });
  await assert.rejects(certificates.upload({ courseId: 'course', studentId: 'student', title: 'Certificate' }, { originalname: 'new.png' }, { id: 'teacher' }), /database unavailable/);
  await assert.rejects(certificates.remove('certificate', {}), /database unavailable/);
  const materials = new CourseMaterialsController(prisma, media);
  materials.assertMaterialAccess = async () => ({ fileUrl: '/uploads/course-materials/old.pdf' });
  await assert.rejects(materials.remove('material', {}), /database unavailable/);
  assert.equal(removals, 0);
});
