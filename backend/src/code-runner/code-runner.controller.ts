import { Body, Controller, Get, Post } from '@nestjs/common';
import { RunCodeDto } from './dto/run-code.dto';
import { CodeRunnerService } from './code-runner.service';

@Controller('code')
export class CodeRunnerController {
  constructor(private readonly runner: CodeRunnerService) {}

  @Get('status')
  status() {
    // Deliberately exposes only whether a runner is available and its host.
    // Credentials and the complete runner URL remain server-side.
    return this.runner.configuration();
  }

  @Post('run')
  run(@Body() body: RunCodeDto) {
    return this.runner.execute(body.language, body.code, body.stdin || '');
  }
}
