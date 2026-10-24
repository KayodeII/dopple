import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { readBody } from '../../common/read-body.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import {
  createStudentBody,
  healthBody,
  listStudentsQuery,
  updateStudentBody,
} from './students.dto.js';
import { PHOTO_MAX_BYTES, StudentsService } from './students.service.js';

/** Student records hold children's details: staff only, and only admins change them. */
@Roles('admin', 'teacher')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(
    @Query(new ZodPipe(listStudentsQuery))
    query: z.infer<typeof listStudentsQuery>,
  ) {
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

  @Roles('admin')
  @Put(':id/health')
  setHealth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(healthBody)) body: z.infer<typeof healthBody>,
  ) {
    return this.students.setHealth(id, body);
  }

  /** The passport photo. Students and parents may see their own; the service checks. */
  @Roles('admin', 'teacher', 'student', 'parent')
  @Get(':id/photo')
  async photo(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { contentType, content } = await this.students.photo(id);
    res
      .set({
        'Content-Type': contentType,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      })
      .send(content);
  }

  /** The body is the image itself (Content-Type image/png, image/jpeg or image/webp). */
  @Roles('admin')
  @Put(':id/photo')
  async setPhoto(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.students.setPhoto(id, await readBody(req, PHOTO_MAX_BYTES));
  }

  @Roles('admin')
  @Delete(':id/photo')
  @HttpCode(204)
  removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.students.removePhoto(id);
  }
}
