import { Module } from '@nestjs/common';
import { CourseMaterialsController } from './course-materials.controller';

@Module({ controllers: [CourseMaterialsController] })
export class CourseMaterialsModule {}
