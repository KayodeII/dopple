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
import { createFeesBody, listFeesQuery } from './fees.dto.js';
import { FeesService } from './fees.service.js';

/** Admins bill and see every fee; students see and pay their own (parents after guardians). */
@Controller('fees')
export class FeesController {
  constructor(private readonly fees: FeesService) {}

  @Roles('admin')
  @Get('account')
  account() {
    return this.fees.account();
  }

  @Roles('admin')
  @Post('account')
  connectAccount() {
    return this.fees.connectAccount();
  }

  @Roles('admin')
  @Get()
  list(
    @Query(new ZodPipe(listFeesQuery)) query: z.infer<typeof listFeesQuery>,
  ) {
    return this.fees.list(query);
  }

  @Roles('student')
  @Get('me')
  mine() {
    return this.fees.mine();
  }

  @Roles('admin')
  @Post()
  create(
    @Body(new ZodPipe(createFeesBody)) body: z.infer<typeof createFeesBody>,
  ) {
    return this.fees.create(body);
  }

  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.fees.remove(id);
  }

  @Roles('student')
  @Post(':id/pay')
  pay(@Param('id', ParseUUIDPipe) id: string) {
    return this.fees.startPayment(id);
  }
}
