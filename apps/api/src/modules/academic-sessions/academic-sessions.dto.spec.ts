import { createSessionBody } from './academic-sessions.dto.js';

const session = {
  name: '2026/2027',
  startsOn: '2026-09-07',
  endsOn: '2027-07-23',
  terms: [
    {
      number: 1,
      name: 'First term',
      startsOn: '2026-09-07',
      endsOn: '2026-12-11',
    },
    {
      number: 2,
      name: 'Second term',
      startsOn: '2027-01-11',
      endsOn: '2027-04-02',
    },
    {
      number: 3,
      name: 'Third term',
      startsOn: '2027-04-26',
      endsOn: '2027-07-23',
    },
  ],
};

const problems = (input: unknown) => {
  const result = createSessionBody.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join('.')} ${i.message}`);
};

describe('createSessionBody', () => {
  it('accepts a normal three-term year, in any order', () => {
    expect(problems(session)).toEqual([]);
    expect(
      problems({ ...session, terms: [...session.terms].reverse() }),
    ).toEqual([]);
  });

  it('defaults to no terms', () => {
    expect(
      createSessionBody.parse({ ...session, terms: undefined }).terms,
    ).toEqual([]);
  });

  it('rejects a session that ends before it starts', () => {
    expect(problems({ ...session, endsOn: '2026-01-01', terms: [] })).toEqual([
      'endsOn must be after startsOn',
    ]);
  });

  it('rejects terms outside the session, overlapping or numbered twice', () => {
    const [first, second] = session.terms;
    expect(
      problems({ ...session, terms: [{ ...first, startsOn: '2026-08-01' }] }),
    ).toEqual(['terms.0 must fall within the session']);
    expect(
      problems({
        ...session,
        terms: [first, { ...second, startsOn: '2026-12-01' }],
      }),
    ).toEqual(['terms.1.startsOn must be after term 1 ends']);
    expect(
      problems({ ...session, terms: [first, { ...second, number: 1 }] }),
    ).toEqual(['terms.1.number is used twice']);
  });

  it('rejects dates that are not ISO dates', () => {
    expect(problems({ ...session, startsOn: '07/09/2026' })).toContain(
      'startsOn Invalid ISO date',
    );
  });
});
