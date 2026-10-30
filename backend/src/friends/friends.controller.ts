import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FriendRequestDto } from './dto/friend-request.dto';
import { FriendsService } from './friends.service';

@ApiTags('friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/friends')
export class FriendsController {
  constructor(private readonly friends: FriendsService) {}

  @Post('request') request(@CurrentUser() user: { id: string }, @Body() dto: FriendRequestDto) { return this.friends.sendRequest(user.id, dto.receiverId); }
  @Patch('request/:id/accept') accept(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.friends.acceptRequest(id, user.id); }
  @Patch('request/:id/reject') reject(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.friends.rejectRequest(id, user.id); }
  @Delete('request/:id') cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.friends.cancelRequest(id, user.id); }
  @Delete(':id') unfriend(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.friends.unfriend(user.id, id); }
  @Get() list(@CurrentUser() user: { id: string }) { return this.friends.listFriends(user.id); }
  @Get('requests') requests(@CurrentUser() user: { id: string }) { return this.friends.listRequests(user.id); }
  @Get('search') search(@CurrentUser() user: { id: string }, @Query('q') query = '') { return this.friends.search(user.id, query); }
  @Get('suggestions') suggestions(@CurrentUser() user: { id: string }) { return this.friends.suggestions(user.id); }
}
