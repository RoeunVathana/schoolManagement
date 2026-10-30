import { BadRequestException, Body, Controller, Delete, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { postMediaUpload } from '../common/upload.options';
import { MediaStorageService } from '../media/media-storage.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostReactionDto } from './dto/post-reaction.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly posts: PostsService, private readonly media: MediaStorageService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }, { name: 'image', maxCount: 1 }], postMediaUpload))
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto, @UploadedFiles() files?: { images?: Express.Multer.File[]; image?: Express.Multer.File[] }) {
    const mediaFiles = [...(files?.images || []), ...(files?.image || [])];
    if (mediaFiles.length > 10) throw new BadRequestException('You can attach up to 10 images or videos per post.');
    const media = await Promise.all(mediaFiles.map((file) => this.media.upload(file, 'posts')));
    return this.posts.create(user.id, { ...dto, media });
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'images', maxCount: 10 }, { name: 'image', maxCount: 1 }], postMediaUpload))
  async update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdatePostDto, @UploadedFiles() files?: { images?: Express.Multer.File[]; image?: Express.Multer.File[] }) {
    const mediaFiles = [...(files?.images || []), ...(files?.image || [])];
    if (mediaFiles.length > 10) throw new BadRequestException('You can attach up to 10 images or videos per post.');
    const media = mediaFiles.length ? await Promise.all(mediaFiles.map((file) => this.media.upload(file, 'posts'))) : undefined;
    return this.posts.update(id, user.id, { ...dto, media });
  }
  @Post(':id/reaction') react(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto?: PostReactionDto) { return this.posts.addReaction(id, user.id, dto?.type); }
  @Delete(':id/reaction') unreact(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.removeReaction(id, user.id); }
  @Delete(':id') remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.remove(id, user.id); }
}
