import { Body, Controller, Delete, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { postImageUpload } from '../common/upload.options';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@ApiTags('posts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', postImageUpload))
  create(@CurrentUser() user: { id: string }, @Body() dto: CreatePostDto, @UploadedFile() file?: Express.Multer.File) {
    return this.posts.create(user.id, { ...dto, imageUrl: file ? `/uploads/posts/${file.filename}` : undefined });
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', postImageUpload))
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdatePostDto, @UploadedFile() file?: Express.Multer.File) {
    return this.posts.update(id, user.id, { ...dto, imageUrl: file ? `/uploads/posts/${file.filename}` : undefined });
  }
  @Post(':id/reaction') react(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.addReaction(id, user.id); }
  @Delete(':id/reaction') unreact(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.removeReaction(id, user.id); }
  @Delete(':id') remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.posts.remove(id, user.id); }
}
