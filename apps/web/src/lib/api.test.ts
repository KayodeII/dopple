import { describe, expect, it } from 'vitest';
import { errorFrom } from './api';

describe('errorFrom', () => {
  it('keeps the API message', () => {
    const error = errorFrom(409, {
      message: 'This overlaps an existing record',
    });
    expect(error.status).toBe(409);
    expect(error.message).toBe('This overlaps an existing record');
  });

  it('joins validation messages and keeps them per field', () => {
    const error = errorFrom(400, {
      message: [
        { field: 'endsAt', message: 'must be after startsAt' },
        { field: '', message: 'Nothing to change' },
      ],
    });
    expect(error.message).toBe(
      'endsAt: must be after startsAt. Nothing to change',
    );
    expect(error.fields).toHaveLength(2);
  });

  it('falls back when the body is not the API shape', () => {
    expect(errorFrom(502, undefined).message).toBe(
      'Something went wrong (502)',
    );
  });
});
