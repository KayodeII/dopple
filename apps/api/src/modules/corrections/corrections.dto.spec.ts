import { requestCorrectionBody } from './corrections.dto.js';

describe('requestCorrectionBody', () => {
  it('keeps only what was asked, trimmed, with blanks as null', () => {
    expect(
      requestCorrectionBody.parse({
        changes: { lga: ' Ikeja ', homeAddress: '', allergies: 'Dust' },
      }),
    ).toEqual({
      changes: { lga: 'Ikeja', homeAddress: null, allergies: 'Dust' },
      note: null,
    });
  });

  it("refuses the school's own fields and empty requests", () => {
    for (const changes of [
      { admissionNo: 'X-1' },
      { admittedOn: '2020-01-01' },
      { userId: null },
      {},
    ]) {
      expect(requestCorrectionBody.safeParse({ changes }).success).toBe(false);
    }
  });

  it('checks values as the admission form does', () => {
    for (const changes of [
      { genotype: 'XY' },
      { stateOfOrigin: 'Atlantis' },
      { dateOfBirth: '2999-01-01' },
    ]) {
      expect(requestCorrectionBody.safeParse({ changes }).success).toBe(false);
    }
  });
});
