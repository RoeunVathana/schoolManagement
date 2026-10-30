import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { basename } from 'path';

export type CommunityMediaType = 'IMAGE' | 'VIDEO';

@Injectable()
export class MediaStorageService {
  private readonly mode: string;
  private readonly projectId: string;
  private readonly bucketName: string;

  constructor(private readonly config: ConfigService) {
    this.mode = String(this.config.get('MEDIA_STORAGE') || 'local').toLowerCase();
    this.projectId = String(this.config.get('FIREBASE_PROJECT_ID') || '');
    this.bucketName = String(this.config.get('FIREBASE_STORAGE_BUCKET') || `${this.projectId}.firebasestorage.app`);
  }

  async upload(file: Express.Multer.File, folder: 'posts' | 'stories' | 'chat'): Promise<{ url: string; mediaType: CommunityMediaType }> {
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
    const destination = `community/${folder}/${basename(file.filename)}`;

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

  private firebaseApp() {
    const existing = getApps()[0];
    if (existing) return existing;

    const clientEmail = String(this.config.get('FIREBASE_CLIENT_EMAIL') || '').trim();
    const privateKey = String(this.config.get('FIREBASE_PRIVATE_KEY') || '').replace(/\\n/g, '\n').trim();
    if (clientEmail && privateKey) {
      return initializeApp({ credential: cert({ projectId: this.projectId, clientEmail, privateKey }), storageBucket: this.bucketName });
    }

    try {
      return initializeApp({ projectId: this.projectId, storageBucket: this.bucketName });
    } catch {
      throw new ServiceUnavailableException('Firebase Admin credentials are missing. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY for cloud media uploads.');
    }
  }
}
