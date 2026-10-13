import { randomUUID } from 'node:crypto';
import { createSlotBody } from './timetable.dto.js';

const slot = (overrides: object = {}) => ({
  termId: randomUUID(),
  subjectId: randomUUID(),
  weekday: 1,
  startsAt: '08:00',
  endsAt: '08:40',
  ...overrides,
});

const errors = (input: object) =>
  createSlotBody
    .safeParse(input)
    .error?.issues.map((i) => `${i.path.join('.')}: ${i.message}`) ?? [];

describe('createSlotBody', () => {
  it('accepts a period on a weekday', () => {
    expect(errors(slot())).toEqual([]);
    expect(
      errors(slot({ weekday: 7, startsAt: '23:00', endsAt: '23:59' })),
    ).toEqual([]);
  });

  it('rejects times that are not HH:MM on a 24-hour clock', () => {
    for (const startsAt of ['8:00', '24:00', '08:60', '08:00:00', '8am']) {
      expect(errors(slot({ startsAt })), startsAt).toContain(
        'startsAt: must be a 24-hour time, HH:MM',
      );
    }
  });

  it('rejects a period that ends before it starts', () => {
    expect(errors(slot({ endsAt: '08:00' }))).toEqual([
      'endsAt: must be after startsAt',
    ]);
    expect(errors(slot({ startsAt: '09:00', endsAt: '08:40' }))).toEqual([
      'endsAt: must be after startsAt',
    ]);
  });

  it('rejects weekdays outside 1 to 7', () => {
    expect(errors(slot({ weekday: 0 }))).toHaveLength(1);
    expect(errors(slot({ weekday: 8 }))).toHaveLength(1);
    expect(errors(slot({ weekday: 1.5 }))).toHaveLength(1);
  });
});
