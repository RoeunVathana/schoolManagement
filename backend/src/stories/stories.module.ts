import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({ imports: [FriendsModule], controllers: [StoriesController], providers: [StoriesService], exports: [StoriesService] })
export class StoriesModule {}
