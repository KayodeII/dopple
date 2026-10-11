import {
  Catch,
  ConflictException,
  HttpException,
  UnprocessableEntityException,
  type ArgumentsHost,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

/** Postgres error code, looking through Drizzle's wrapper (DrizzleQueryError.cause). */
export function pgErrorCode(error: unknown): string | undefined {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return undefined;
}

const responses: Record<string, () => HttpException> = {
  '23505': () =>
    new ConflictException('A record with these details already exists'),
  // Also what a reference to another school's row looks like: same answer as "missing".
  '23503': () =>
    new UnprocessableEntityException('A referenced record does not exist'),
  '23514': () =>
    new UnprocessableEntityException('The values break a validation rule'),
};

/**
 * Turns constraint violations into 409/422 instead of 500, so services can rely
 * on the database for uniqueness and references rather than check-then-insert races.
 */
@Catch()
export class DatabaseErrorFilter extends BaseExceptionFilter {
  override catch(exception: unknown, host: ArgumentsHost) {
    const mapped = responses[pgErrorCode(exception) ?? ''];
    super.catch(mapped ? mapped() : exception, host);
  }
}
