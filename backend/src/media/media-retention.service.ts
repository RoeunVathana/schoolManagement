import { ConfigService } from '@nestjs/config';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { promises as fs } from 'fs';
import { basename, join, resolve } from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { MediaStorageService } from './media-storage.service';

type MediaSourceType = 'POST' | 'POST_MEDIA' | 'STORY' | 'MESSAGE' | 'GROUP';

type MediaReference = {
  sourceType: MediaSourceType;
  sourceId: string;
  url: string;
  createdAt: Date;
  mediaType: string | null;
};

type MediaCandidate = {
  url: string;
  references: MediaReference[];
  createdAt: Date;
};

type ArchiveSummary = {
  reason: string;
  archived: number;
  skipped: number;
  failed: number;
  bytesFreed: number;
};

@Injectable()
export class MediaRetentionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MediaRetentionService.name);
  private startTimer?: NodeJS.Timeout;
  private interval?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
    private readonly storage: MediaStorageService,
  ) {}

  onModuleInit() {
    const startDelay = this.number('MEDIA_RETENTION_START_DELAY_MS', 60_000, 0, 86_400_000);
    const intervalMs = this.number('MEDIA_RETENTION_CHECK_INTERVAL_HOURS', 24, 1, 720) * 60 * 60 * 1000;
    this.startTimer = setTimeout(() => {
      void this.runScheduled();
      this.interval = setInterval(() => void this.runScheduled(), intervalMs);
    }, startDelay);
  }

  onModuleDestroy() {
    if (this.startTimer) clearTimeout(this.startTimer);
    if (this.interval) clearInterval(this.interval);
  }

  async status() {
    const stats = await this.storageStats();
    const telegramConfig = await this.telegram.resolveConfig();
    const limitGb = this.number('MEDIA_STORAGE_LIMIT_GB', 0, 0, 10_000);
    return {
      enabled: telegramConfig.enabled && Boolean(telegramConfig.botToken && telegramConfig.chatId),
      mediaStorage: String(this.config.get('MEDIA_STORAGE') || 'local').toLowerCase(),
      retentionMonths: this.number('MEDIA_RETENTION_MONTHS', 6, 1, 120),
      storage: {
        bytes: stats.bytes,
        files: stats.files,
        limitBytes: limitGb > 0 ? Math.round(limitGb * 1024 ** 3) : null,
      },
      archivedRecords: await this.prisma.mediaArchive.count(),
    };
  }

  private async runScheduled() {
    if (this.running) return;
    this.running = true;
    try {
      const telegramConfig = await this.telegram.resolveConfig();
      if (!telegramConfig.enabled || !telegramConfig.botToken || !telegramConfig.chatId) {
        this.logger.warn('Media retention skipped: Telegram backup is not configured or is disabled.');
        return;
      }

      await this.withAdvisoryLock(async () => {
        const stats = await this.storageStats();
        const limitGb = this.number('MEDIA_STORAGE_LIMIT_GB', 0, 0, 10_000);
        const limitBytes = limitGb > 0 ? limitGb * 1024 ** 3 : 0;
        const underPressure = limitBytes > 0 && stats.bytes >= limitBytes;
        const reason = underPressure ? 'STORAGE_LIMIT' : 'SIX_MONTH_RETENTION';
        const ageDays = underPressure ? this.number('MEDIA_EARLY_MIN_AGE_DAYS', 30, 1, 3650) : 0;
        const cutoff = new Date(Date.now() - (underPressure ? ageDays : this.number('MEDIA_RETENTION_MONTHS', 6, 1, 120) * 30.44) * 24 * 60 * 60 * 1000);
        const targetBytes = underPressure ? limitBytes * this.number('MEDIA_STORAGE_TARGET_RATIO', 0.8, 0.1, 0.99) : 0;
        const summary = await this.archiveCandidates({ cutoff, reason, targetBytes, currentBytes: stats.bytes });
        if (summary.archived || summary.failed) await this.telegram.sendMediaRetentionReport(summary);
      });
    } catch (error) {
      this.logger.error(`Media retention run failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.running = false;
    }
  }

  private async archiveCandidates(input: { cutoff: Date; reason: string; targetBytes: number; currentBytes: number }): Promise<ArchiveSummary> {
    const summary: ArchiveSummary = { reason: input.reason, archived: 0, skipped: 0, failed: 0, bytesFreed: 0 };
    const candidates = await this.collectCandidates(input.cutoff);
    for (const candidate of candidates) {
      if (input.targetBytes > 0 && input.currentBytes - summary.bytesFreed <= input.targetBytes) break;
      const existing = await this.prisma.mediaArchive.findUnique({ where: { originalUrl: candidate.url } });
      const source = await this.storage.prepareForArchive(candidate.url);
      if (!source) {
        if (existing) {
          await this.clearReferences(candidate.references);
          summary.archived += 1;
        } else {
          summary.skipped += 1;
        }
        continue;
      }

      let fileSize = 0;
      try {
        const fileStat = await fs.stat(source.path).catch(() => null);
        if (!fileStat) {
          if (existing) {
            await this.clearReferences(candidate.references);
            summary.archived += 1;
          } else {
            summary.skipped += 1;
          }
          continue;
        }
        fileSize = fileStat.size;
        if (!fileSize) {
          summary.skipped += 1;
          continue;
        }

        if (!existing) {
          const messageIds = await this.uploadInChunks(source.path, source.fileName, candidate);
          await this.prisma.mediaArchive.create({
            data: {
              originalUrl: candidate.url,
              sourceType: candidate.references[0].sourceType,
              sourceId: candidate.references[0].sourceId,
              fileName: source.fileName,
              mediaType: (candidate.references.find((reference) => reference.mediaType)?.mediaType as any) || null,
              fileSize: BigInt(fileSize),
              telegramMessageIds: JSON.stringify(messageIds),
              reason: input.reason,
            },
          });
        }

        await source.deleteSource();
        await this.clearReferences(candidate.references);
        summary.archived += 1;
        summary.bytesFreed += fileSize;
      } catch (error) {
        summary.failed += 1;
        this.logger.error(`Media archive failed for ${basename(source.path)}: ${error instanceof Error ? error.message : 'unknown error'}`);
      } finally {
        await source.cleanup().catch(() => undefined);
      }
    }
    return summary;
  }

  private async uploadInChunks(filePath: string, fileName: string, candidate: MediaCandidate) {
    const chunkBytes = this.number('MEDIA_ARCHIVE_CHUNK_MB', 45, 1, 49) * 1024 * 1024;
    const delayMs = this.number('MEDIA_ARCHIVE_DELAY_MS', 1100, 0, 60_000);
    const fileSize = (await fs.stat(filePath)).size;
    const totalChunks = Math.ceil(fileSize / chunkBytes);
    const handle = await fs.open(filePath, 'r');
    const messageIds: number[] = [];
    try {
      for (let index = 0; index < totalChunks; index += 1) {
        const offset = index * chunkBytes;
        const length = Math.min(chunkBytes, fileSize - offset);
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, offset);
        const chunkName = totalChunks === 1 ? fileName : `${fileName}.part-${String(index + 1).padStart(3, '0')}-of-${String(totalChunks).padStart(3, '0')}`;
        const result = await this.telegram.sendDocument({
          buffer,
          fileName: chunkName,
          mimeType: candidate.references[0].mediaType === 'VIDEO' ? 'video/mp4' : 'application/octet-stream',
          caption: `CampusFlow media archive\nSource: ${candidate.references[0].sourceType}:${candidate.references[0].sourceId}\nCreated: ${candidate.createdAt.toISOString()}\nPart ${index + 1}/${totalChunks}`,
        });
        if (!result.sent) throw new Error(result.reason || 'Telegram did not accept the archive file.');
        if (result.messageId) messageIds.push(result.messageId);
        if (delayMs && index < totalChunks - 1) await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
      return messageIds;
    } finally {
      await handle.close();
    }
  }

  private async collectCandidates(cutoff: Date) {
    const candidates = new Map<string, MediaCandidate>();
    const add = (reference: MediaReference) => {
      if (!reference.url) return;
      const current = candidates.get(reference.url);
      if (current) {
        current.references.push(reference);
        if (reference.createdAt < current.createdAt) current.createdAt = reference.createdAt;
        return;
      }
      candidates.set(reference.url, { url: reference.url, references: [reference], createdAt: reference.createdAt });
    };

    const [posts, postMedia, stories, messages, groups] = await Promise.all([
      this.prisma.post.findMany({ where: { imageUrl: { not: null }, createdAt: { lt: cutoff } }, select: { id: true, imageUrl: true, mediaType: true, createdAt: true } }),
      this.prisma.postMedia.findMany({ where: { createdAt: { lt: cutoff } }, select: { id: true, url: true, mediaType: true, createdAt: true } }),
      this.prisma.story.findMany({ where: { imageUrl: { not: null }, createdAt: { lt: cutoff } }, select: { id: true, imageUrl: true, mediaType: true, createdAt: true } }),
      this.prisma.message.findMany({ where: { imageUrl: { not: null }, createdAt: { lt: cutoff } }, select: { id: true, imageUrl: true, mediaType: true, createdAt: true } }),
      this.prisma.communityGroup.findMany({ where: { coverImageUrl: { not: null }, updatedAt: { lt: cutoff } }, select: { id: true, coverImageUrl: true, updatedAt: true } }),
    ]);

    posts.forEach((row) => add({ sourceType: 'POST', sourceId: row.id, url: row.imageUrl!, createdAt: row.createdAt, mediaType: row.mediaType }));
    postMedia.forEach((row) => add({ sourceType: 'POST_MEDIA', sourceId: row.id, url: row.url, createdAt: row.createdAt, mediaType: row.mediaType }));
    stories.forEach((row) => add({ sourceType: 'STORY', sourceId: row.id, url: row.imageUrl!, createdAt: row.createdAt, mediaType: row.mediaType }));
    messages.forEach((row) => add({ sourceType: 'MESSAGE', sourceId: row.id, url: row.imageUrl!, createdAt: row.createdAt, mediaType: row.mediaType }));
    groups.forEach((row) => add({ sourceType: 'GROUP', sourceId: row.id, url: row.coverImageUrl!, createdAt: row.updatedAt, mediaType: null }));
    return [...candidates.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  private async clearReferences(references: MediaReference[]) {
    await this.prisma.$transaction(references.map((reference) => {
      if (reference.sourceType === 'POST_MEDIA') return this.prisma.postMedia.deleteMany({ where: { id: reference.sourceId, url: reference.url } });
      if (reference.sourceType === 'POST') return this.prisma.post.updateMany({ where: { id: reference.sourceId, imageUrl: reference.url }, data: { imageUrl: null, mediaType: null } });
      if (reference.sourceType === 'STORY') return this.prisma.story.updateMany({ where: { id: reference.sourceId, imageUrl: reference.url }, data: { imageUrl: null, mediaType: null } });
      if (reference.sourceType === 'MESSAGE') return this.prisma.message.updateMany({ where: { id: reference.sourceId, imageUrl: reference.url }, data: { imageUrl: null, mediaType: null } });
      return this.prisma.communityGroup.updateMany({ where: { id: reference.sourceId, coverImageUrl: reference.url }, data: { coverImageUrl: null } });
    }));
  }

  private async storageStats() {
    const root = resolve(process.cwd(), 'uploads');
    let bytes = 0;
    let files = 0;
    const visit = async (directory: string): Promise<void> => {
      const entries = await fs.readdir(directory, { withFileTypes: true }).catch(() => [] as import('fs').Dirent[]);
      for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) await visit(path);
        else if (entry.isFile()) {
          const stat = await fs.stat(path).catch(() => null);
          if (stat) { bytes += stat.size; files += 1; }
        }
      }
    };
    await visit(root);
    return { bytes, files };
  }

  private async withAdvisoryLock(work: () => Promise<void>) {
    const lock = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_try_advisory_lock(hashtext('campusflow_media_retention')) AS locked`;
    if (!lock[0]?.locked) return;
    try { await work(); }
    finally { await this.prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext('campusflow_media_retention'))`; }
  }

  private number(key: string, fallback: number, min: number, max: number) {
    const value = Number(this.config.get(key) ?? fallback);
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value));
  }
}
