import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
}
