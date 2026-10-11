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
import { ClassesService } from './classes.service.js';

const fields = {
  name: z.string().trim().min(1).max(40),
  level: z.string().trim().min(1).max(40),
  formTeacherId: z.uuid().nullable(),
};

const createClassBody = z.object({
  sessionId: z.uuid(),
  ...fields,
  formTeacherId: fields.formTeacherId.optional(),
});

const updateClassBody = z
  .object(fields)
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'nothing to update');

const listQuery = z.object({ sessionId: z.uuid().optional() });

/** Class groups, e.g. "JSS 1A". Anyone signed in can read; admins create and edit. */
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Get()
  list(@Query(new ZodPipe(listQuery)) query: z.infer<typeof listQuery>) {
    return this.classes.list(query);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.classes.get(id);
  }

  @Roles('admin')
  @Post()
  create(
    @Body(new ZodPipe(createClassBody)) body: z.infer<typeof createClassBody>,
  ) {
    return this.classes.create(body);
  }

  @Roles('admin')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateClassBody)) body: z.infer<typeof updateClassBody>,
  ) {
    return this.classes.update(id, body);
  }
}
