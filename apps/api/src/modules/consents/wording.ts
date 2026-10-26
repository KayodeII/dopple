// No relative imports at runtime: scripts/seed.mjs imports this file directly.
import type { ConsentPurpose } from '../../database/schema.js';

/**
 * What the parent agrees to, word for word. Each answer stores the wording it was
 * given against, so changing a sentence here never changes what a parent agreed to.
 */
export const CONSENT_WORDING: Record<ConsentPurpose, string> = {
  record:
    "I agree that the school may keep my child's admission record (personal details, origin, address and religion) to run their schooling, and share it only where the law requires.",
  health:
    "I agree that the school may keep my child's health details (blood group, genotype, allergies, conditions and medicines) so that staff can look after them and act in an emergency.",
  photo:
    "I agree that the school may keep my child's passport photo for their record and ID card, seen only by the school's staff, my child and their parents.",
};
