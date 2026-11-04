import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { MailService } from '../auth/mail.service';
import { MailSettingsInput, MailSettingsService } from './mail-settings.service';

class UpdateMailSettingsDto implements MailSettingsInput {
  @IsOptional() @IsString() @MaxLength(255) host?: string;
  @IsOptional() @IsInt() @Min(1) @Max(65535) port?: number;
  @IsOptional() @IsBoolean() secure?: boolean;
  @IsOptional() @IsString() @MaxLength(254) user?: string;
  @IsOptional() @IsString() @MaxLength(256) password?: string;
  @IsOptional() @IsString() @MaxLength(320) from?: string;
}

@ApiTags('mail-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('mail-settings')
export class MailSettingsController {
  constructor(private readonly settings: MailSettingsService, private readonly mail: MailService) {}

  @Get()
  getSettings() { return this.mail.configuration(); }

  @Patch()
  @Permissions('edit')
  async saveSettings(@Body() body: UpdateMailSettingsDto) {
    const settings = await this.settings.saveSettings(body);
    await this.mail.reload();
    return settings;
  }

  @Delete()
  @Permissions('edit')
  async clearSettings() {
    const settings = await this.settings.clearSettings();
    await this.mail.reload();
    return settings;
  }

  @Post('test')
  @Permissions('edit')
  testConnection() { return this.mail.verifyCurrentConfiguration(); }
}
