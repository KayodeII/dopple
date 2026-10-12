import { Module } from '@nestjs/common';
import { ClassMembersController } from './class-members.controller.js';
import { ClassStudentsService } from './class-students.service.js';
import { ClassSubjectsService } from './class-subjects.service.js';
import { ClassesController } from './classes.controller.js';
import { ClassesService } from './classes.service.js';

@Module({
  controllers: [ClassesController, ClassMembersController],
  providers: [ClassesService, ClassStudentsService, ClassSubjectsService],
})
export class ClassesModule {}
