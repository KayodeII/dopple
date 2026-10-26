import {
  Body,
  Controller,
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
  declineCorrectionBody,
  pendingCorrectionsQuery,
  requestCorrectionBody,
} from './corrections.dto.js';
import { CorrectionsService } from './corrections.service.js';

/** Parents ask; admins decide. */
@Controller()
export class CorrectionsController {
  constructor(private readonly corrections: CorrectionsService) {}

  @Roles('parent')
  @Post('children/:studentId/corrections')
  request(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body(new ZodPipe(requestCorrectionBody))
    body: z.infer<typeof requestCorrectionBody>,
  ) {
    return this.corrections.request(studentId, body);
  }

  @Roles('parent')
  @Get('children/:studentId/corrections')
  mine(@Param('studentId', ParseUUIDPipe) studentId: string) {
    return this.corrections.mine(studentId);
  }

  @Roles('admin')
  @Get('corrections')
  pending(
    @Query(new ZodPipe(pendingCorrectionsQuery))
    query: z.infer<typeof pendingCorrectionsQuery>,
  ) {
    return this.corrections.pending(query.studentId);
  }

  @Roles('admin')
  @Post('corrections/:id/apply')
  @HttpCode(200)
  apply(@Param('id', ParseUUIDPipe) id: string) {
    return this.corrections.apply(id);
  }

  @Roles('admin')
  @Post('corrections/:id/decline')
  @HttpCode(200)
  decline(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodPipe(declineCorrectionBody))
    body: z.infer<typeof declineCorrectionBody>,
  ) {
    return this.corrections.decline(id, body.reply);
  }
}
