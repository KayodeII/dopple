import { z } from 'zod';
import { CONSENT_PURPOSES } from '../../database/schema.js';

export const consentPurpose = z.enum(CONSENT_PURPOSES);

/** A parent answering for themselves. */
export const answerConsentBody = z.object({ given: z.boolean() });

/** An admin recording a signed paper form: whose answer it was. */
export const recordConsentBody = answerConsentBody.extend({
  guardianId: z.uuid(),
});
export type RecordConsentBody = z.infer<typeof recordConsentBody>;
