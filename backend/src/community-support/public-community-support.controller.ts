import { Body, Controller, Ip, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommunitySupportDto } from './dto/community-support.dto';
import { CommunitySupportService } from './community-support.service';

@ApiTags('community-support')
@Controller('api/community-support')
export class PublicCommunitySupportController {
  constructor(private readonly support: CommunitySupportService) {}

  @Post('public')
  @ApiOperation({ summary: 'Ask CampusFlow AI support without signing in' })
  answer(@Ip() ip: string, @Body() dto: CommunitySupportDto) {
    return this.support.answer(`guest:${ip || 'unknown'}`, dto.question);
  }
}
