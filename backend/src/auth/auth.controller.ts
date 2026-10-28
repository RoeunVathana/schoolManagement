import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { profileImageUpload } from '../common/upload.options';

class RegisterDto { @IsString() fullName!: string; @IsEmail() email!: string; @MinLength(10) @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/, { message: 'Password must contain uppercase, lowercase, number and special character.' }) password!: string; @IsOptional() phone?: string; @IsOptional() @IsEnum(Role) role?: Role; @IsOptional() specialization?: string; @IsOptional() @IsIn(['en', 'km']) language?: string; }
class LoginDto { @IsEmail() email!: string; @IsString() password!: string; @IsOptional() @IsEnum(Role) role?: Role; }
class RefreshDto { @IsString() refreshToken!: string; }
class UpdateProfileDto { @IsOptional() @IsString() fullName?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @MinLength(8) password?: string; @IsOptional() @IsString() gender?: string; @IsOptional() @IsString() dateOfBirth?: string; @IsOptional() @IsString() address?: string; @IsOptional() @IsString() guardianName?: string; @IsOptional() @IsString() guardianPhone?: string; @IsOptional() @IsString() specialization?: string; @IsOptional() @IsIn(['en', 'km']) language?: string; }

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') @UseInterceptors(FileInterceptor('profileImage', profileImageUpload)) register(@Body() dto: RegisterDto, @UploadedFile() file?: Express.Multer.File) { return this.auth.register({ ...dto, profileImageUrl: file ? `/uploads/profiles/${file.filename}` : undefined }); }
  @Post('login') login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password, dto.role); }
  @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refreshToken); }
  @Post('logout') logout(@Body() dto: RefreshDto) { return this.auth.logout(dto.refreshToken); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Get('profile') profile(@CurrentUser() user: any) { return this.auth.getProfile(user.id); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Patch('profile') updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) { return this.auth.updateProfile(user.id, dto); }
  @ApiBearerAuth() @UseGuards(JwtAuthGuard) @Post('profile/image') @UseInterceptors(FileInterceptor('profileImage', profileImageUpload)) async updateProfileImage(@CurrentUser() user: any, @UploadedFile() file?: Express.Multer.File) { if (!file) throw new BadRequestException('Please select a profile image'); return this.auth.updateProfileImage(user.id, `/uploads/profiles/${file.filename}`); }
}
