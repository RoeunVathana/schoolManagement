import { Body, Controller, Ip, Post, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { CommunitySupportDto } from './dto/community-support.dto';
import { CommunitySpeechDto } from './dto/community-speech.dto';
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

  @Post('public/speech')
  @ApiOperation({ summary: 'Generate spoken CampusFlow AI support without signing in' })
  async speech(@Ip() ip: string, @Body() dto: CommunitySpeechDto, @Res() response: Response) {
    const result = await this.support.speech(`guest:${ip || 'unknown'}`, dto.text, dto.language || 'en');
    response.set({ 'Content-Type': result.contentType, 'Cache-Control': 'no-store', 'Content-Length': result.audio.length });
    response.send(result.audio);
  }
}
