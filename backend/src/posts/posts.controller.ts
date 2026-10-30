import { Body, Controller, Delete, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post() create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto) { return this.posts.create(user.id, dto); }
  @Patch(':id') update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdatePostDto) { return this.posts.update(id, user.id, dto); }
  @Delete(':id') remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.remove(id, user.id); }
}
