import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { storyImageUpload } from '../common/upload.options';
import { CreateStoryDto } from './dto/create-story.dto';
import { UpdateStoryDto } from './dto/update-story.dto';
import { StoriesService } from './stories.service';

@ApiTags('stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/stories')
export class StoriesController {
  constructor(private readonly stories: StoriesService) {}

  @Get()
  list(@CurrentUser() user: { id: string }) { return this.stories.listForViewer(user.id); }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', storyImageUpload))
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateStoryDto, @UploadedFile() file?: Express.Multer.File) {
    return this.stories.create(user.id, { ...dto, imageUrl: file ? `/uploads/stories/${file.filename}` : undefined });
  }

  @Patch(':id')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', storyImageUpload))
  update(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() dto: UpdateStoryDto, @UploadedFile() file?: Express.Multer.File) {
    return this.stories.update(id, user.id, { ...dto, imageUrl: file ? `/uploads/stories/${file.filename}` : undefined });
  }

  @Delete(':id')
  remove(@CurrentUser() user: { id: string }, @Param('id') id: string) { return this.stories.remove(id, user.id); }
}
