import {
  Body,
  Controller,
  Get,
  Header,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { z } from 'zod';
import { ZodPipe } from '../../common/zod.pipe.js';
import { Public } from '../auth/decorators.js';
import {
  createSchoolBody,
  searchQuery,
  slug,
  slugQuery,
} from './schools.dto.js';
import { SchoolsService } from './schools.service.js';

const signupsPerHour = () => Number(process.env.SCHOOL_SIGNUPS_PER_HOUR ?? 5);

/** Served on the platform host (dopple.school), not a school's: no school is set yet. */
@Public()
@Controller('schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  /** "Find your school" on the website's log-in page. */
  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  search(@Query(new ZodPipe(searchQuery)) query: z.infer<typeof searchQuery>) {
    return this.schools.search(query.q);
  }

  /** Is this address free? Says why not when the format is wrong. */
  @Get('availability')
  async availability(
    @Query(new ZodPipe(slugQuery)) query: z.infer<typeof slugQuery>,
  ) {
    const parsed = slug.safeParse(query.slug);
    if (!parsed.success) {
      return {
        slug: query.slug,
        available: false,
        reason: parsed.error.issues[0]!.message,
      };
    }
    const available = await this.schools.isAvailable(parsed.data);
    return {
      slug: parsed.data,
      available,
      reason: available ? null : 'is already taken',
    };
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: signupsPerHour, ttl: 60 * 60_000 } })
  @Post()
  create(
    @Body(new ZodPipe(createSchoolBody)) body: z.infer<typeof createSchoolBody>,
  ) {
    return this.schools.create(body);
  }
}
