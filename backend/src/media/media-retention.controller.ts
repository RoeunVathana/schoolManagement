import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { MediaRetentionService } from './media-retention.service';

@ApiTags('media-retention')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('media-retention')
export class MediaRetentionController {
  constructor(private readonly retention: MediaRetentionService) {}

  @Get('status')
  status() { return this.retention.status(); }
}
