import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommunitySupportController } from './community-support.controller';
import { CommunitySupportService } from './community-support.service';

@Module({ imports: [ConfigModule], controllers: [CommunitySupportController], providers: [CommunitySupportService] })
export class CommunitySupportModule {}
