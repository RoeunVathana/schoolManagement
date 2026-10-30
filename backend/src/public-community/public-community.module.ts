import { Module } from '@nestjs/common';
import { PublicCommunityController } from './public-community.controller';

@Module({ controllers: [PublicCommunityController] })
export class PublicCommunityModule {}
