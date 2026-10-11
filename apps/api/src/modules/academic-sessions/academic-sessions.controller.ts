import { Body, Controller, Get, Post } from '@nestjs/common';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import {
  createSessionBody,
  type CreateSessionBody,
} from './academic-sessions.dto.js';
import { AcademicSessionsService } from './academic-sessions.service.js';

/** School years ("sessions") and their terms. Anyone signed in can read; admins create. */
@Controller('sessions')
export class AcademicSessionsController {
  constructor(private readonly sessions: AcademicSessionsService) {}

  @Get()
  list() {
    return this.sessions.list();
  }

  @Roles('admin')
  @Post()
  create(@Body(new ZodPipe(createSessionBody)) body: CreateSessionBody) {
    return this.sessions.create(body);
  }
}
