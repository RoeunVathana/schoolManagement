import { Body, Controller, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Matches, Max, MaxLength, Min } from 'class-validator';
import { Role } from '@prisma/client';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { BakongSettingsInput, BakongSettingsService } from './bakong-settings.service';

class UpdateBakongSettingsDto implements BakongSettingsInput {
  @IsOptional() @IsBoolean() registrationPaymentRequired?: boolean;
  @IsOptional() @IsString() @Matches(/^\d+(?:\.\d{1,2})?$/) @MaxLength(12) registrationFee?: string;
  @IsOptional() @IsString() @IsIn(['USD', 'KHR']) registrationCurrency?: string;
  @IsOptional() @IsInt() @Min(1) @Max(10) paymentQrExpiresMinutes?: number;
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) @MaxLength(255) apiUrl?: string;
  @IsOptional() @IsString() @MaxLength(4096) apiToken?: string;
  @IsOptional() @IsBoolean() apiEnabled?: boolean;
  @IsOptional() @IsString() @MaxLength(255) accountId?: string;
  @IsOptional() @IsString() @MaxLength(25) bakongMerchantName?: string;
  @IsOptional() @IsString() @MaxLength(25) bakongMerchantNameKm?: string;
  @IsOptional() @IsString() @MaxLength(15) bakongMerchantCity?: string;
  @IsOptional() @IsString() @MaxLength(15) bakongMerchantCityKm?: string;
  @IsOptional() @IsString() @MaxLength(25) merchantName?: string;
  @IsOptional() @IsString() @MaxLength(15) merchantCity?: string;
  @IsOptional() @IsString() @MaxLength(25) merchantPhone?: string;
  @IsOptional() @IsString() @MaxLength(25) storeLabel?: string;
}

@ApiTags('bakong-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('bakong-settings')
export class BakongSettingsController {
  constructor(private readonly settings: BakongSettingsService) {}

  @Get()
  getSettings() { return this.settings.publicSettings(); }

  @Patch()
  @Permissions('edit')
  saveSettings(@Body() body: UpdateBakongSettingsDto) { return this.settings.saveSettings(body); }

  @Delete()
  @Permissions('edit')
  clearSettings() { return this.settings.clearSettings(); }
}
