import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ProgrammingContentService } from './programming-content.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('programming-content')
@Controller('programming-content')
export class ProgrammingContentController {
  constructor(private readonly content: ProgrammingContentService) {}

  @Get(':slug') get(@Param('slug') slug: string) {
    return this.content.getPublic(slug);
  }
}

@ApiTags('admin-programming-content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/programming-content')
export class ProgrammingContentAdminController {
  constructor(private readonly content: ProgrammingContentService) {}

  @Get() list() { return this.content.listAdmin(); }
  @Get(':slug') get(@Param('slug') slug: string) { return this.content.getAdmin(slug); }
  @Post() create(@Body() body: unknown, @CurrentUser() user: any) { return this.content.create(body, user.id); }
  @Patch(':slug') update(@Param('slug') slug: string, @Body() body: unknown) { return this.content.update(slug, body); }
  @Delete(':slug') remove(@Param('slug') slug: string) { return this.content.remove(slug); }
}
