import { createCipheriv, randomBytes } from 'node:crypto';
import { promises as fs, createWriteStream } from 'node:fs';
import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const TELEGRAM_API = `https://api.telegram.org/bot${required('TELEGRAM_BOT_TOKEN')}`;
const chatId = required('TELEGRAM_CHAT_ID');
const alertChatId = String(process.env.TELEGRAM_ALERT_CHAT_ID || chatId).trim();
const databaseUrl = required('DATABASE_URL');
const encryptionKey = readEncryptionKey();
const chunkBytes = Math.min(49, Math.max(1, Number(process.env.BACKUP_CHUNK_MB || 45))) * 1024 * 1024;
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputPath = join(tmpdir(), `campusflow-${stamp}.sql.gz.enc`);

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function readEncryptionKey() {
  const value = required('BACKUP_ENCRYPTION_KEY');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('BACKUP_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
}

async function telegram(method, body, file, targetChatId = chatId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
  try {
    let response;
    if (file) {
      const form = new FormData();
      form.append('chat_id', targetChatId);
      form.append('caption', body.caption || '');
      form.append('document', new Blob([await fs.readFile(file.path)], { type: 'application/octet-stream' }), file.name);
      response = await fetch(`${TELEGRAM_API}/${method}`, { method: 'POST', body: form, signal: controller.signal });
    } else {
      response = await fetch(`${TELEGRAM_API}/${method}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: targetChatId, ...body }),
        signal: controller.signal,
      });
    }
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(result?.description || `Telegram HTTP ${response.status}`);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function notify(text) {
  try {
    await telegram('sendMessage', { text, disable_web_page_preview: true }, undefined, alertChatId);
  } catch (error) {
    console.error(`Telegram notification failed: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

async function createEncryptedDump() {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  const header = Buffer.concat([Buffer.from('CFLB'), Buffer.from([1]), iv]);
  await fs.writeFile(outputPath, header);

  const dump = spawn('pg_dump', ['--no-owner', '--no-privileges', '--format=plain', '--dbname', databaseUrl], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  dump.stderr.on('data', (chunk) => { stderr = `${stderr}${chunk}`.slice(-4000); });
  const exit = new Promise((resolve) => dump.once('close', (code, signal) => resolve({ code, signal })));

  try {
    await pipeline(dump.stdout, createGzip({ level: 9 }), cipher, createWriteStream(outputPath, { flags: 'a' }));
  } catch (error) {
    dump.kill('SIGTERM');
    await exit;
    throw error;
  }

  const result = await exit;
  if (result.code !== 0) throw new Error(`pg_dump failed${stderr ? `: ${stderr.trim()}` : ''}`);
  await fs.appendFile(outputPath, cipher.getAuthTag());
  return fs.stat(outputPath);
}

async function sendBackup(fileSize) {
  const total = Math.ceil(fileSize / chunkBytes);
  const handle = await fs.open(outputPath, 'r');
  const name = basename(outputPath);
  try {
    for (let index = 0; index < total; index += 1) {
      const offset = index * chunkBytes;
      const length = Math.min(chunkBytes, fileSize - offset);
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, offset);
      const partName = total === 1 ? name : `${name}.part-${String(index + 1).padStart(3, '0')}-of-${String(total).padStart(3, '0')}`;
      const partPath = await bufferToTempFile(buffer, partName);
      await telegram('sendDocument', {
        caption: `CampusFlow encrypted database backup\nCreated: ${new Date().toISOString()}\nPart ${index + 1}/${total}`,
      }, { path: partPath, name: partName });
      await fs.rm(partPath, { force: true });
    }
  } finally {
    await handle.close();
  }
  await notify([
    '✅ BACKUP AVAILABLE',
    'CampusFlow database backup uploaded successfully.',
    `Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`,
    `Parts verified by Telegram: ${total}/${total}`,
    'Encryption: AES-256-GCM',
    'Admin access: open the private backup chat and keep the encryption key available.',
  ].join('\n'));
}

async function bufferToTempFile(buffer, name) {
  const path = join(tmpdir(), name);
  // The caller removes this file after Telegram accepts the upload.
  await fs.writeFile(path, buffer);
  return path;
}

async function run() {
  try {
    const stat = await createEncryptedDump();
    await sendBackup(stat.size);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    console.error(`Backup failed: ${message}`);
    await notify([
      '❌ BACKUP NOT AVAILABLE',
      'CampusFlow database backup was not uploaded.',
      `Time: ${new Date().toISOString()}`,
      `Reason: ${message.slice(0, 500)}`,
      'Admin action: check Railway cron logs and Telegram permissions before retrying.',
    ].join('\n'));
    process.exitCode = 1;
  } finally {
    await fs.rm(outputPath, { force: true });
  }
}

await run();
