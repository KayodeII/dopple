import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { LearnService } from './learn.service.js';

/** Free lessons for anyone (ADR 0011): public, no school needed, cacheable. */
@Public()
@Controller('learn')
export class LearnController {
  constructor(private readonly learn: LearnService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300')
  catalogue() {
    return this.learn.catalogue();
  }

  @Get('classes/:slug')
  @Header('Cache-Control', 'public, max-age=300')
  classLevel(@Param('slug') slug: string) {
    return this.learn.classLevel(slug);
  }

  @Get('topics/:slug')
  @Header('Cache-Control', 'public, max-age=300')
  topic(@Param('slug') slug: string) {
    return this.learn.topic(slug);
  }
}
