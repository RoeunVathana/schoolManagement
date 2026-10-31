import { isAbsolute, join, relative, resolve, sep } from 'path';

export const MEDIA_FOLDERS = [
  'posts', 'stories', 'chat', 'groups', 'profiles', 'covers', 'courses',
  'assignments', 'homework', 'exams', 'exam-submissions', 'course-materials', 'certificates',
] as const;
export type MediaFolder = typeof MEDIA_FOLDERS[number];

// Resolve at request time: ConfigModule loads .env after modules are imported.
export function uploadsRoot(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()) {
  return resolve(env.UPLOAD_DIR?.trim() || env.RAILWAY_VOLUME_MOUNT_PATH?.trim() || join(cwd, 'uploads'));
}

export function uploadsOnVolume(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()) {
  const mount = env.RAILWAY_VOLUME_MOUNT_PATH?.trim();
  if (!mount || !isAbsolute(mount)) return false;
  const child = relative(resolve(mount), uploadsRoot(env, cwd));
  return child === '' || (!isAbsolute(child) && child !== '..' && !child.startsWith(`..${sep}`));
}

// Only accept URLs produced by our upload handlers, never filesystem paths.
export function localUploadPath(url: string, env: NodeJS.ProcessEnv = process.env) {
  const match = /^\/?uploads\/([^/]+)\/([^/\\\x00]+)$/.exec(url);
  if (!match || !MEDIA_FOLDERS.includes(match[1] as MediaFolder)) return null;
  if (match[2] === '.' || match[2] === '..' || match[2].includes(':')) return null;
  return join(uploadsRoot(env), match[1], match[2]);
}
