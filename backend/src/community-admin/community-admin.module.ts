import { Module } from '@nestjs/common';
import { CommunityAdminController } from './community-admin.controller';
import { CommunityAdminService } from './community-admin.service';

@Module({
  controllers: [CommunityAdminController],
  providers: [CommunityAdminService],
})
export class CommunityAdminModule {}
