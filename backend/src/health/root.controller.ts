import { Controller, Get } from '@nestjs/common';

@Controller()
export class RootController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'campusflow-api',
      health: '/health',
    };
  }
}
