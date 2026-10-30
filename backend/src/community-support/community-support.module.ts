import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommunitySupportController } from './community-support.controller';
import { CommunitySupportService } from './community-support.service';
import { PublicCommunitySupportController } from './public-community-support.controller';

@Module({ imports: [ConfigModule], controllers: [CommunitySupportController, PublicCommunitySupportController], providers: [CommunitySupportService], exports: [CommunitySupportService] })
export class CommunitySupportModule {}
