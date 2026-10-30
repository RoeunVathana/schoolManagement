import { Module } from '@nestjs/common';
import { FriendsModule } from '../friends/friends.module';
import { PostsModule } from '../posts/posts.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({ imports: [FriendsModule, PostsModule], controllers: [ProfilesController], providers: [ProfilesService] })
export class ProfilesModule {}
