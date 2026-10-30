import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';

export const homeworkUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/homework', { recursive: true }); cb(null, 'uploads/homework'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  // Multer uses the largest allowed size here; submissions apply the stricter 50 MB image limit in the controller.
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp', '.zip'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PDF, DOC, DOCX, TXT, Excel, PowerPoint, image and ZIP files are allowed'), false);
    cb(null, true);
  },
};

export const assignmentUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/assignments', { recursive: true }); cb(null, 'uploads/assignments'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  // Multer uses the largest allowed size here; the controller applies the stricter 50 MB image limit.
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PDF, PNG, JPG, JPEG and WEBP files are allowed'), false);
    cb(null, true);
  },
};

export const examImageUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/exams', { recursive: true }); cb(null, 'uploads/exams'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PNG, JPG, JPEG and WEBP exam images are allowed'), false);
    cb(null, true);
  },
};

export const examSubmissionUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/exam-submissions', { recursive: true }); cb(null, 'uploads/exam-submissions'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp', '.zip'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PDF, DOC, DOCX, TXT, Excel, PowerPoint, image and ZIP files are allowed'), false);
    cb(null, true);
  },
};

export const courseImageUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/courses', { recursive: true }); cb(null, 'uploads/courses'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PNG, JPG, JPEG and WEBP images are allowed'), false);
    cb(null, true);
  },
};

export const courseMaterialUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/course-materials', { recursive: true }); cb(null, 'uploads/course-materials'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.pdf', '.epub', '.mobi', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp', '.zip'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PDF, EPUB, MOBI, DOC, DOCX, TXT, Excel, PowerPoint, image and ZIP files are allowed'), false);
    cb(null, true);
  },
};

export const certificateUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/certificates', { recursive: true }); cb(null, 'uploads/certificates'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PDF, PNG, JPG, JPEG and WEBP certificate files are allowed'), false);
    cb(null, true);
  },
};

export const profileImageUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/profiles', { recursive: true }); cb(null, 'uploads/profiles'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(extname(file.originalname).toLowerCase())) return cb(new BadRequestException('Only PNG, JPG, JPEG and WEBP profile images are allowed'), false);
    cb(null, true);
  },
};

export const coverImageUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/covers', { recursive: true }); cb(null, 'uploads/covers'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const extension = extname(file.originalname).toLowerCase();
    if (!file.mimetype.startsWith('image/') || !allowed.includes(extension)) return cb(new BadRequestException('Only PNG, JPG, JPEG and WEBP cover images are allowed.'), false);
    cb(null, true);
  },
};

export const postMediaUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/posts', { recursive: true }); cb(null, 'uploads/posts'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedImages = ['.png', '.jpg', '.jpeg', '.jfif', '.webp', '.gif', '.bmp', '.avif', '.heic', '.heif', '.tif', '.tiff'];
    const allowedVideos = ['.mp4', '.webm', '.mov', '.m4v'];
    const extension = extname(file.originalname).toLowerCase();
    const validImage = file.mimetype.startsWith('image/') && allowedImages.includes(extension);
    const validVideo = file.mimetype.startsWith('video/') && allowedVideos.includes(extension);
    if (!validImage && !validVideo) return cb(new BadRequestException('Please upload a supported image or MP4, WEBM, MOV, or M4V video.'), false);
    cb(null, true);
  },
};

export const postImageUpload = postMediaUpload;

export const storyMediaUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/stories', { recursive: true }); cb(null, 'uploads/stories'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedImages = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const allowedVideos = ['.mp4', '.webm', '.mov', '.m4v'];
    const extension = extname(file.originalname).toLowerCase();
    const validImage = file.mimetype.startsWith('image/') && allowedImages.includes(extension);
    const validVideo = file.mimetype.startsWith('video/') && allowedVideos.includes(extension);
    if (!validImage && !validVideo) return cb(new BadRequestException('Only PNG/JPG/WEBP/GIF images or MP4/WEBM/MOV videos can be used in stories.'), false);
    cb(null, true);
  },
};

export const storyImageUpload = storyMediaUpload;

export const chatMediaUpload = {
  storage: diskStorage({
    destination: (_req, _file, cb) => { mkdirSync('uploads/chat', { recursive: true }); cb(null, 'uploads/chat'); },
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req: unknown, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    const allowedImages = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const allowedVideos = ['.mp4', '.webm', '.mov', '.m4v'];
    const extension = extname(file.originalname).toLowerCase();
    const validImage = file.mimetype.startsWith('image/') && allowedImages.includes(extension);
    const validVideo = file.mimetype.startsWith('video/') && allowedVideos.includes(extension);
    if (!validImage && !validVideo) return cb(new BadRequestException('Only PNG/JPG/WEBP/GIF images or MP4/WEBM/MOV videos can be sent in chat.'), false);
    cb(null, true);
  },
};

// Keep the old export name for any existing imports.
export const chatImageUpload = chatMediaUpload;
