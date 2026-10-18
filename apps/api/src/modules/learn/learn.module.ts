import { Module } from '@nestjs/common';
import { LearnController } from './learn.controller.js';
import { LearnService } from './learn.service.js';

@Module({
  controllers: [LearnController],
  providers: [LearnService],
})
export class LearnModule {}
