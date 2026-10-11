import { Global, Inject, Module } from '@nestjs/common';
import { type Env, loadEnv } from './env.js';

export const ENV = Symbol('ENV');

/** Inject the validated environment: `constructor(@InjectEnv() env: Env)`. */
export const InjectEnv = () => Inject(ENV);

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): Env => loadEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
