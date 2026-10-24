import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Put,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Public, Roles } from '../auth/decorators.js';
import { brandColor } from '../schools/schools.dto.js';
import { readBody } from '../../common/read-body.js';
import { LOGO_MAX_BYTES, SchoolService } from './school.service.js';

const updateSchoolBody = z
  .object({
    name: z.string().trim().min(2).max(100),
    brandColor: brandColor.nullable(),
    accentColor: brandColor.nullable(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'Nothing to change');

/** The school at this address. Reading is public (sign-in page); changes are admin-only. */
@Controller('school')
export class SchoolController {
  constructor(private readonly school: SchoolService) {}

  @Public()
  @Get()
  profile() {
    return this.school.profile();
  }

  @Roles('admin')
  @Patch()
  update(
    @Body(new ZodPipe(updateSchoolBody)) body: z.infer<typeof updateSchoolBody>,
  ) {
    return this.school.update(body);
  }

  @Public()
  @Get('logo')
  async logo(@Res() res: Response) {
    const { contentType, content } = await this.school.logo();
    res
      .set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
        // Belt and braces: even opened directly, the response can run nothing.
        'Content-Security-Policy': "default-src 'none'; sandbox",
      })
      .send(content);
  }

  /** The body is the image itself (Content-Type image/png, image/jpeg or image/webp). */
  @Roles('admin')
  @Put('logo')
  async setLogo(@Req() req: Request) {
    return this.school.setLogo(await readBody(req, LOGO_MAX_BYTES));
  }

  @Roles('admin')
  @Delete('logo')
  @HttpCode(204)
  removeLogo() {
    return this.school.removeLogo();
  }
}
