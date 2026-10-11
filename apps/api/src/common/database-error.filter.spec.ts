import { DrizzleQueryError } from 'drizzle-orm/errors';
import { pgErrorCode } from './database-error.filter.js';

describe('pgErrorCode', () => {
  it('finds the Postgres code behind a Drizzle error', () => {
    const pg = Object.assign(new Error('duplicate key'), { code: '23505' });
    expect(pgErrorCode(new DrizzleQueryError('insert', [], pg))).toBe('23505');
  });

  it('ignores errors that are not from Postgres', () => {
    expect(pgErrorCode(new Error('boom'))).toBeUndefined();
    expect(
      pgErrorCode(Object.assign(new Error('x'), { code: 'ECONNREFUSED' })),
    ).toBeUndefined();
    expect(pgErrorCode('not an error')).toBeUndefined();
  });
});
