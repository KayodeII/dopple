import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { StudentsService } from './students.service.js';

const updateStudentBody = z.object({ userId: z.uuid().nullable() });

@Roles('admin', 'teacher')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list() {
    return this.students.list();
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateStudentBody))
    body: z.infer<typeof updateStudentBody>,
  ) {
    return this.students.linkUser(id, body.userId);
  }
}
