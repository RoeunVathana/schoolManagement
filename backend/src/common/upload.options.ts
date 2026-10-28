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
