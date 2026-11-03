import { Body, Controller, Post } from '@nestjs/common';
import { RunCodeDto } from './dto/run-code.dto';
import { CodeRunnerService } from './code-runner.service';

@Controller('code')
export class CodeRunnerController {
  constructor(private readonly runner: CodeRunnerService) {}

  @Post('run')
  run(@Body() body: RunCodeDto) {
    return this.runner.execute(body.language, body.code, body.stdin || '');
  }
}
