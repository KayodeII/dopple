import { Body, Controller, Param, ParseUUIDPipe, Put } from '@nestjs/common';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { ConsentPurpose } from '../../database/schema.js';
import { Roles } from '../auth/decorators.js';
import {
  answerConsentBody,
  consentPurpose,
  recordConsentBody,
} from './consents.dto.js';
import { ConsentsService } from './consents.service.js';

/** Each call adds an answer; the reply is where every purpose now stands. */
@Controller()
export class ConsentsController {
  constructor(private readonly consents: ConsentsService) {}

  @Roles('admin')
  @Put('students/:studentId/consents/:purpose')
  record(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('purpose', new ZodPipe(consentPurpose)) purpose: ConsentPurpose,
    @Body(new ZodPipe(recordConsentBody))
    body: z.infer<typeof recordConsentBody>,
  ) {
    return this.consents.record(studentId, purpose, body);
  }

  @Roles('parent')
  @Put('children/:studentId/consents/:purpose')
  answer(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('purpose', new ZodPipe(consentPurpose)) purpose: ConsentPurpose,
    @Body(new ZodPipe(answerConsentBody))
    body: z.infer<typeof answerConsentBody>,
  ) {
    return this.consents.answerAsParent(studentId, purpose, body.given);
  }
}
