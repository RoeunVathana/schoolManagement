import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { basename, extname, isAbsolute, join, relative, resolve } from 'path';
import { tmpdir } from 'os';

export type CommunityMediaType = 'IMAGE' | 'VIDEO';

export type MediaFolder =
  | 'posts'
  | 'stories'
  | 'chat'
  | 'groups'
  | 'profiles'
  | 'covers'
  | 'courses'
  | 'assignments'
  | 'homework'
  | 'exams'
  | 'exam-submissions'
  | 'course-materials'
  | 'certificates';

export type ArchiveMediaSource = {
  path: string;
  fileName: string;
  mimeType?: string;
  deleteSource: () => Promise<void>;
  cleanup: () => Promise<void>;
};

@Injectable()
export class MediaStorageService {
  private readonly mode: string;
  private readonly projectId: string;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    const configuredMode = String(this.config.get('MEDIA_STORAGE') || '').trim().toLowerCase();
    const nodeEnv = String(this.config.get('NODE_ENV') || 'development').toLowerCase();
    const hasRailwayVolume = Boolean(String(this.config.get('RAILWAY_VOLUME_MOUNT_PATH') || '').trim());
    this.mode = configuredMode || (nodeEnv === 'production' && !hasRailwayVolume ? 'firebase' : 'local');
    this.projectId = String(this.config.get('FIREBASE_PROJECT_ID') || 'shoolmanagement-65b53');
    this.bucketName = String(this.config.get('FIREBASE_STORAGE_BUCKET') || `${this.projectId}.firebasestorage.app`);
  }

  async upload(file: Express.Multer.File, folder: MediaFolder): Promise<{ url: string; mediaType: CommunityMediaType }> {
    const mediaType: CommunityMediaType = file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE';
    if (this.mode !== 'firebase' && this.mode !== 'google') {
      return { url: `/uploads/${folder}/${basename(file.filename)}`, mediaType };
    }

    if (!this.projectId || !this.bucketName) {
      throw new ServiceUnavailableException('Cloud media storage is not configured. Set Firebase project and storage environment variables.');
    }

    const app = this.firebaseApp();
    const bucket = getStorage(app).bucket(this.bucketName);
    const token = randomUUID();
    const destination = `campusflow/${folder}/${basename(file.filename)}`;

    try {
      await bucket.upload(file.path, {
        destination,
        metadata: {
          contentType: file.mimetype,
          cacheControl: 'public,max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      });
      return {
        url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destination)}?alt=media&token=${token}`,
        mediaType,
      };
    } catch (error) {
      throw new ServiceUnavailableException(`Could not upload media to cloud storage: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      await fs.rm(file.path, { force: true }).catch(() => undefined);
    }
  }

  async remove(url?: string | null) {
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      const localPath = this.safeLocalPath(url);
      if (localPath) await fs.rm(localPath, { force: true }).catch(() => undefined);
      return;
    }
    if (this.mode !== 'firebase' && this.mode !== 'google') return;
    const parsed = this.firebaseObjectFromUrl(url);
    if (!parsed) return;
    await getStorage(this.firebaseApp()).bucket(this.bucketName).file(parsed.destination).delete({ ignoreNotFound: true }).catch(() => undefined);
  }

  async prepareForArchive(url: string): Promise<ArchiveMediaSource | null> {
    if (!url) return null;

    if (!/^https?:\/\//i.test(url)) {
      const localPath = this.safeLocalPath(url);
      if (!localPath) return null;
      const fileName = basename(localPath);
      return {
        path: localPath,
        fileName,
        deleteSource: async () => fs.rm(localPath, { force: true }),
        cleanup: async () => undefined,
      };
    }

    if (this.mode !== 'firebase' && this.mode !== 'google') return null;
    const parsed = this.firebaseObjectFromUrl(url);
    if (!parsed) return null;

    const tempPath = join(tmpdir(), `campusflow-media-${randomUUID()}${extname(parsed.destination)}`);
    const bucket = getStorage(this.firebaseApp()).bucket(this.bucketName);
    const remoteFile = bucket.file(parsed.destination);
    try {
      await remoteFile.download({ destination: tempPath });
      return {
        path: tempPath,
        fileName: basename(parsed.destination),
        deleteSource: async () => { await remoteFile.delete({ ignoreNotFound: true }); },
        cleanup: async () => fs.rm(tempPath, { force: true }),
      };
    } catch {
      await fs.rm(tempPath, { force: true }).catch(() => undefined);
      return null;
    }
  }

  private safeLocalPath(url: string) {
    const relativeUrl = url.replace(/^\/?/, '').replace(/\\/g, '/');
    if (!/^uploads\/(posts|stories|chat|groups|profiles|covers|courses|assignments|homework|exams|exam-submissions|course-materials|certificates)\//i.test(relativeUrl)) return null;
    const root = resolve(process.cwd(), 'uploads');
    const filePath = resolve(process.cwd(), relativeUrl);
    const pathFromRoot = relative(root, filePath);
    if (!pathFromRoot || pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) return null;
    return filePath;
  }

  private firebaseObjectFromUrl(url: string) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== 'firebasestorage.googleapis.com') return null;
      const bucketName = parsed.pathname.match(/^\/v0\/b\/([^/]+)\/o\//)?.[1];
      const encodedDestination = parsed.pathname.match(/^\/v0\/b\/[^/]+\/o\/(.+)$/)?.[1];
      if (!bucketName || !encodedDestination || decodeURIComponent(bucketName) !== this.bucketName) return null;
      const destination = decodeURIComponent(encodedDestination);
      if (!destination.startsWith('campusflow/') && !destination.startsWith('community/')) return null;
      return { destination };
    } catch {
      return null;
    }
  }

  private firebaseApp() {
    const existing = getApps()[0];
    if (existing) return existing;

    const clientEmail = String(this.config.get('FIREBASE_CLIENT_EMAIL') || '').trim();
    const privateKey = String(this.config.get('FIREBASE_PRIVATE_KEY') || '').replace(/\\n/g, '\n').trim();
    if (clientEmail && privateKey) {
      return initializeApp({ credential: cert({ projectId: this.projectId, clientEmail, privateKey }), storageBucket: this.bucketName });
    }

    throw new ServiceUnavailableException('Firebase Admin credentials are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for persistent cloud media uploads.');
  }
}
