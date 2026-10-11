import { Controller, Get } from '@nestjs/common';
import { Roles } from '../auth/decorators.js';
import { StudentsService } from './students.service.js';

@Roles('admin', 'teacher')
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list() {
    return this.students.list();
  }
}
