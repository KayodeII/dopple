import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { StudentsService } from './students.service.js';

const name = z.string().trim().min(1).max(80);
const studentFields = {
  admissionNo: z.string().trim().min(1).max(30),
  firstName: name,
  lastName: name,
  userId: z.uuid().nullable(),
};
const createStudentBody = z.object({
  ...studentFields,
  userId: studentFields.userId.optional(),
});
const updateStudentBody = z
  .object(studentFields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change');
const listQuery = z.object({ q: z.string().trim().max(80).optional() });

/** Student records hold children's details: staff only, and only admins change them. */
@Roles('admin', 'teacher')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.students.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.students.get(id);
  }

  @Roles('admin')
  @Post()
  create(
    @Body(new ZodPipe(createStudentBody))
    body: z.infer<typeof createStudentBody>,
  ) {
    return this.students.create(body);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateStudentBody))
    body: z.infer<typeof updateStudentBody>,
  ) {
    return this.students.update(id, body);
  }
}
