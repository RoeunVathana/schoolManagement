import { Body, Controller, Delete, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { postMediaUpload } from '../common/upload.options';
import { MediaStorageService } from '../media/media-storage.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly posts: PostsService, private readonly media: MediaStorageService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', postMediaUpload))
  async create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto, @UploadedFile() file?: Express.Multer.File) {
    const media = file ? await this.media.upload(file, 'posts') : undefined;
    return this.posts.create(user.id, { ...dto, imageUrl: media?.url, mediaType: media?.mediaType });
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', postMediaUpload))
  async update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdatePostDto, @UploadedFile() file?: Express.Multer.File) {
    const media = file ? await this.media.upload(file, 'posts') : undefined;
    return this.posts.update(id, user.id, { ...dto, imageUrl: media?.url, mediaType: media?.mediaType });
  }
  @Post(':id/reaction') react(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.addReaction(id, user.id); }
  @Delete(':id/reaction') unreact(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.removeReaction(id, user.id); }
  @Delete(':id') remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.remove(id, user.id); }
}
