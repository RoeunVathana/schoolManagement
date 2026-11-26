import { Body, Controller, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CommunitySupportDto } from './dto/community-support.dto';
import { CommunitySpeechDto } from './dto/community-speech.dto';
import { CommunitySupportService } from './community-support.service';

@ApiTags('community-support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.CUSTOMER, Role.TEACHER)
@Controller('api/community-support')
export class CommunitySupportController {
  constructor(private readonly support: CommunitySupportService) {}

  @Post()
  answer(@CurrentUser() user: { id: string }, @Body() dto: CommunitySupportDto) {
    return this.support.answer(user.id, dto.question);
  }

  @Post('speech')
  async speech(@CurrentUser() user: { id: string }, @Body() dto: CommunitySpeechDto, @Res() response: Response) {
    const audio = await this.support.speech(user.id, dto.text, dto.language || 'en');
    response.set({ 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store', 'Content-Length': audio.length });
    response.send(audio);
  }
}
