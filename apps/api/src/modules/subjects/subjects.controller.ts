import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import { SubjectsService } from './subjects.service.js';

const createSubjectBody = z.object({
  name: z.string().trim().min(1).max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,10}$/, 'must be 2–10 letters, digits or dashes'),
});

/** Subjects the school teaches. Anyone signed in can read; admins create. */
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  list() {
    return this.subjects.list();
  }

  @Roles('admin')
  @Post()
  create(
    @Body(new ZodPipe(createSubjectBody))
    body: z.infer<typeof createSubjectBody>,
  ) {
    return this.subjects.create(body);
  }
}
