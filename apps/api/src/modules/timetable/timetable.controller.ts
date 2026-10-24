import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import {
  createSlotBody,
  myTimetableQuery,
  termQuery,
} from './timetable.dto.js';
import { TimetableService } from './timetable.service.js';

/** Class timetables are readable by anyone signed in; admins build them. */
@Controller()
export class TimetableController {
  constructor(private readonly timetable: TimetableService) {}

  @Get('classes/:classId/timetable')
  forClass(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query(new ZodPipe(termQuery)) query: z.infer<typeof termQuery>,
  ) {
    return this.timetable.forClass(classId, query.termId);
  }

  @Roles('admin', 'teacher', 'student', 'parent')
  @Get('timetable/me')
  forMe(
    @Query(new ZodPipe(myTimetableQuery))
    query: z.infer<typeof myTimetableQuery>,
  ) {
    return this.timetable.forMe(query.termId, query.studentId);
  }

  @Roles('admin')
  @Post('classes/:classId/timetable')
  create(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Body(new ZodPipe(createSlotBody)) body: z.infer<typeof createSlotBody>,
  ) {
    return this.timetable.create(classId, body);
  }

  @Roles('admin')
  @Delete('classes/:classId/timetable/:slotId')
  @HttpCode(204)
  remove(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ) {
    return this.timetable.remove(classId, slotId);
  }
}
