import { Module } from '@nestjs/common';
import { ProgrammingContentController, ProgrammingContentAdminController } from './programming-content.controller';
import { ProgrammingContentService } from './programming-content.service';

@Module({
  controllers: [ProgrammingContentController, ProgrammingContentAdminController],
  providers: [ProgrammingContentService],
  exports: [ProgrammingContentService],
})
export class ProgrammingContentModule {}
