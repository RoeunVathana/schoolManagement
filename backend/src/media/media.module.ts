import { Global, Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { MediaRetentionController } from './media-retention.controller';
import { MediaRetentionService } from './media-retention.service';
import { MediaStorageService } from './media-storage.service';

@Global()
@Module({ imports: [TelegramModule], controllers: [MediaRetentionController], providers: [MediaStorageService, MediaRetentionService], exports: [MediaStorageService, MediaRetentionService] })
export class MediaModule {}
