import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { ClassStudentsService } from './class-students.service.js';
import { ClassSubjectsService } from './class-subjects.service.js';

const assignSubjectBody = z.object({
  teacherId: z.uuid().nullable().default(null),
});

/**
 * Who is in a class and what it takes. Class lists hold children's names, so
 * only staff can read them; anyone signed in can see a class's subjects.
 */
@Controller('classes/:classId')
export class ClassMembersController {
  constructor(
    private readonly students: ClassStudentsService,
    private readonly subjects: ClassSubjectsService,
  ) {}

  @Roles('admin', 'teacher')
  @Get('students')
  listStudents(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.students.list(classId);
  }

  @Roles('admin')
  @Put('students/:studentId')
  @HttpCode(204)
  enrol(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.students.enrol(classId, studentId);
  }

  @Roles('admin')
  @Delete('students/:studentId')
  @HttpCode(204)
  unenrol(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.students.remove(classId, studentId);
  }

  @Get('subjects')
  listSubjects(@Param('classId', ParseUUIDPipe) classId: string) {
    return this.subjects.list(classId);
  }

  @Roles('admin')
  @Put('subjects/:subjectId')
  @HttpCode(204)
  assignSubject(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
    @Body(new ZodPipe(assignSubjectBody))
    body: z.infer<typeof assignSubjectBody>,
  ) {
    return this.subjects.assign(classId, subjectId, body.teacherId);
  }

  @Roles('admin')
  @Delete('subjects/:subjectId')
  @HttpCode(204)
  removeSubject(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('subjectId', ParseUUIDPipe) subjectId: string,
  ) {
    return this.subjects.remove(classId, subjectId);
  }
}
