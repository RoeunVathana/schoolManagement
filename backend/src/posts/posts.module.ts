import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({ imports: [FriendsModule], controllers: [PostsController], providers: [PostsService], exports: [PostsService] })
export class PostsModule {}
