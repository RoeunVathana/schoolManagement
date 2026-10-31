import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { coverImageUpload, profileImageUpload } from '../common/upload.options';

class RegisterDto { @IsString() @MaxLength(120) fullName!: string; @IsEmail() @MaxLength(254) email!: string; @MinLength(10) @MaxLength(256) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' }) password!: string; @IsOptional() @IsString() @MaxLength(40) phone?: string; @IsOptional() @IsEnum(Role) role?: Role; @IsOptional() @IsString() @MaxLength(120) specialization?: string; @IsOptional() @IsIn(['en', 'km']) language?: string; }
class LoginDto { @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() @MaxLength(254) email!: string; @IsString() @MaxLength(256) password!: string; @IsOptional() @IsEnum(Role) role?: Role; }
class GoogleLoginDto { @IsString() @MaxLength(8192) idToken!: string; @IsEnum(Role) role!: Role; }
class RefreshDto { @IsString() @MinLength(20) @MaxLength(4096) refreshToken!: string; }
class PresenceDto { @IsOptional() @IsBoolean() online?: boolean; }
class UpdateProfileDto { @IsOptional() @IsString() @MaxLength(256) currentPassword?: string; @IsOptional() @IsString() @MaxLength(120) fullName?: string; @IsOptional() @IsString() @MaxLength(40) phone?: string; @IsOptional() @MinLength(10) @MaxLength(256) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' }) password?: string; @IsOptional() @IsString() @MaxLength(30) gender?: string; @IsOptional() @IsString() @MaxLength(30) dateOfBirth?: string; @IsOptional() @IsString() @MaxLength(500) address?: string; @IsOptional() @IsString() @MaxLength(120) guardianName?: string; @IsOptional() @IsString() @MaxLength(40) guardianPhone?: string; @IsOptional() @IsString() @MaxLength(120) specialization?: string; @IsOptional() @IsString() @MaxLength(2000) bio?: string; @IsOptional() @IsString() @MaxLength(120) location?: string; @IsOptional() @IsString() @MaxLength(500) website?: string; @IsOptional() @IsString() @MaxLength(200) school?: string; @IsOptional() @IsString() @MaxLength(200) course?: string; @IsOptional() @IsString() @MaxLength(40) yearLevel?: string; @IsOptional() @IsIn(['en', 'km']) language?: string; }
class AdminForgotPasswordDto { @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string; }
class AdminResetPasswordDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value) @IsEmail() email!: string;
  @IsString() @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit code.' }) otp!: string;
  @IsString() @MinLength(10) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' }) password!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @UseInterceptors(FileInterceptor('profileImage', profileImageUpload)) register(@Body() dto: RegisterDto, @UploadedFile() file?: Express.Multer.File) { return this.auth.register({ ...dto, profileImageUrl: file ? `/uploads/profiles/${file.filename}` : undefined }); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password, dto.role); }
  @Post('google') google(@Body() dto: GoogleLoginDto) { return this.auth.loginWithGoogle(dto.idToken, dto.role); }
  @Post('forgot-password') forgotPassword(@Body() dto: AdminForgotPasswordDto) { return this.auth.requestPasswordReset(dto.email); }
  @Post('reset-password') resetPassword(@Body() dto: AdminResetPasswordDto) { return this.auth.resetPassword(dto.email, dto.otp, dto.password); }
  @Post('admin/forgot-password') forgotAdminPassword(@Body() dto: AdminForgotPasswordDto) { return this.auth.requestAdminPasswordReset(dto.email); }
  @Post('admin/reset-password') resetAdminPassword(@Body() dto: AdminResetPasswordDto) { return this.auth.resetAdminPassword(dto.email, dto.otp, dto.password); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
  @Post('logout') logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('profile') profile(@CurrentUser() user: any) { return this.auth.getProfile(user.id); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Patch('presence') presence(@CurrentUser() user: any, @Body() dto: PresenceDto) { return this.auth.updatePresence(user.id, dto.online !== false); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Patch('profile') updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(user.id, dto); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('profile/image') @UseInterceptors(FileInterceptor('profileImage', profileImageUpload)) async updateProfileImage(@CurrentUser() user: any, @UploadedFile() file?: Express.Multer.File) { if (!file) throw new BadRequestException('Please select a profile image'); return this.auth.updateProfileImage(user.id, `/uploads/profiles/${file.filename}`); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('profile/cover') @UseInterceptors(FileInterceptor('coverImage', coverImageUpload)) async updateCoverImage(@CurrentUser() user: any, @UploadedFile() file?: Express.Multer.File) { if (!file) throw new BadRequestException('Please select a cover image'); return this.auth.updateCoverImage(user.id, `/uploads/covers/${file.filename}`); }
}
