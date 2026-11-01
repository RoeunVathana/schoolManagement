import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { postMediaUpload } from '../common/upload.options';
import { MediaStorageService } from '../media/media-storage.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostReactionDto } from './dto/post-reaction.dto';
import { CreatePostCommentDto } from './dto/create-post-comment.dto';
import { PostsService } from './posts.service';
import { CacheService } from '../cache/cache.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly posts: PostsService, private readonly media: MediaStorageService, private readonly cache: CacheService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }, { name: 'image', maxCount: 1 }], postMediaUpload))
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto, @UploadedFiles() files?: { images?: Express.Multer.File[]; image?: Express.Multer.File[] }) {
    const mediaFiles = [...(files?.images || []), ...(files?.image || [])];
    if (mediaFiles.length > 10) throw new BadRequestException('You can attach up to 10 images or videos per post.');
    const media = await Promise.all(mediaFiles.map((file) => this.media.upload(file, 'posts')));
    const post = await this.posts.create(user.id, { ...dto, media });
    await this.cache.invalidatePrefix('cache:community:');
    return post;
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }, { name: 'image', maxCount: 1 }], postMediaUpload))
  async update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdatePostDto, @UploadedFiles() files?: { images?: Express.Multer.File[]; image?: Express.Multer.File[] }) {
    const mediaFiles = [...(files?.images || []), ...(files?.image || [])];
    if (mediaFiles.length > 10) throw new BadRequestException('You can attach up to 10 images or videos per post.');
    const media = mediaFiles.length ? await Promise.all(mediaFiles.map((file) => this.media.upload(file, 'posts'))) : undefined;
    const post = await this.posts.update(id, user.id, { ...dto, media });
    await this.cache.invalidatePrefix('cache:community:');
    return post;
  }
  @Post(':id/reaction') async react(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto?: PostReactionDto) { const result = await this.posts.addReaction(id, user.id, dto?.type); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Delete(':id/reaction') async unreact(@CurrentUser() user: { id: string }, @Param('id') id: string) { const result = await this.posts.removeReaction(id, user.id); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Get(':id/comments') comments(@CurrentUser() user: { id: string }, @Param('id') id: string, @Query('limit') limit?: string) { return this.posts.listComments(id, user.id, Number(limit) || 30); }
  @Post(':id/comments') async comment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: CreatePostCommentDto) { const result = await this.posts.createComment(id, user.id, dto.content); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Patch(':id/comments/:commentId') async updateComment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('commentId') commentId: string, @Body() dto: CreatePostCommentDto) { const result = await this.posts.updateComment(id, commentId, user.id, dto.content); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Delete(':id/comments/:commentId') async removeComment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('commentId') commentId: string) { const result = await this.posts.removeComment(id, commentId, user.id); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Post(':id/comments/:commentId/like') async likeComment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('commentId') commentId: string, @Body() dto?: PostReactionDto) { const result = await this.posts.addCommentLike(id, commentId, user.id, dto?.type); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Delete(':id/comments/:commentId/like') async unlikeComment(@CurrentUser() user: { id: string }, @Param('id') id: string, @Param('commentId') commentId: string) { const result = await this.posts.removeCommentLike(id, commentId, user.id); await this.cache.invalidatePrefix('cache:community:'); return result; }
  @Delete(':id') async remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { const result = await this.posts.remove(id, user.id); await this.cache.invalidatePrefix('cache:community:'); return result; }
}
