import { Controller, Get } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Public } from '../modules/auth/decorators.js';
import { TENANT_KEY, type Tenant } from './tenant.js';

/** The school at this address, for the web app's sign-in page. Public: names are not secret. */
@Public()
@Controller('school')
export class SchoolController {
  constructor(private readonly cls: ClsService) {}

  @Get()
  current() {
    const { slug, name } = this.cls.get<Tenant>(TENANT_KEY);
    return { slug, name };
  }
}
