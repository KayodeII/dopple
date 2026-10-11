import { Controller, Get, Header } from '@nestjs/common';
import { Public } from '../auth/decorators.js';
import { ShowcaseService } from './showcase.service.js';

/**
 * Public, platform-level endpoint (no school host needed), used by the
 * marketing site's "Schools already ringing the bell" logo wall.
 */
@Public()
@Controller('showcase')
export class ShowcaseController {
  constructor(private readonly showcase: ShowcaseService) {}

  @Get('schools')
  @Header('Cache-Control', 'public, max-age=300')
  async schools() {
    const schools = await this.showcase.list();
    return { count: schools.length, schools };
  }
}
