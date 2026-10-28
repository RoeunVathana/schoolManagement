import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaymentService } from './payment.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentService) {}

  @ApiOperation({ summary: 'Get a public registration payment by token' })
  @Get('registration/:token')
  getRegistrationPayment(@Param('token') token: string) { return this.payments.getRegistrationPayment(token); }

  @ApiOperation({ summary: 'Verify a registration payment with Bakong' })
  @Post('registration/:token/check')
  checkRegistrationPayment(@Param('token') token: string) { return this.payments.checkRegistrationPayment(token); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Create a KHQR payment for a course' })
  @Post('course/:courseId')
  createCoursePayment(@Param('courseId') courseId: string, @CurrentUser() user: any) { return this.payments.createCoursePayment(courseId, user.id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Get the current student course payment' })
  @Get('course/:token')
  getCoursePayment(@Param('token') token: string, @CurrentUser() user: any) { return this.payments.getCoursePayment(token, user.id); }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  @ApiOperation({ summary: 'Verify a course payment with Bakong' })
  @Post('course/:token/check')
  checkCoursePayment(@Param('token') token: string, @CurrentUser() user: any) { return this.payments.checkCoursePayment(token, user.id); }
}
