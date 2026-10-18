import { Module } from '@nestjs/common';
import { SchoolController } from './school.controller.js';
import { SchoolService } from './school.service.js';

@Module({
  controllers: [SchoolController],
  providers: [SchoolService],
})
export class SchoolModule {}
