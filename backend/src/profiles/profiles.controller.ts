import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/users')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get(':id/profile') profile(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.profiles.getProfile(user.id, id); }
  @Get(':id/friends') friends(@Param('id') id: string) { return this.profiles.listFriends(id); }
}
