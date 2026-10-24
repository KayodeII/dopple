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
  Query,
} from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Roles } from '../auth/decorators.js';
import {
  addGuardianBody,
  searchGuardiansQuery,
  updateGuardianBody,
} from './guardians.dto.js';
import { GuardiansService } from './guardians.service.js';

/**
 * Staff read a student's guardians (form teachers call parents); only admins change
 * them. Parents see their own children.
 */
@Controller()
export class GuardiansController {
  constructor(private readonly guardians: GuardiansService) {}

  @Roles('admin', 'teacher')
  @Get('students/:studentId/guardians')
  forStudent(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.guardians.forStudent(studentId);
  }

  @Roles('admin')
  @Post('students/:studentId/guardians')
  add(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body(new ZodPipe(addGuardianBody)) body: z.infer<typeof addGuardianBody>,
  ) {
    return this.guardians.add(studentId, body);
  }

  @Roles('admin')
  @Delete('students/:studentId/guardians/:guardianId')
  @HttpCode(204)
  unlink(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
  ) {
    return this.guardians.unlink(studentId, guardianId);
  }

  @Roles('admin')
  @Get('guardians')
  search(
    @Query(new ZodPipe(searchGuardiansQuery))
    query: z.infer<typeof searchGuardiansQuery>,
  ) {
    return this.guardians.search(query.q);
  }

  @Roles('admin')
  @Patch('guardians/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(updateGuardianBody))
    body: z.infer<typeof updateGuardianBody>,
  ) {
    return this.guardians.update(id, body);
  }

  @Roles('parent')
  @Get('children')
  children() {
    return this.guardians.children();
  }
}
