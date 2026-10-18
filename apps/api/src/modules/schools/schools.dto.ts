import { z } from 'zod';
import { RESERVED_SUBDOMAINS } from '../../tenancy/parse-host.js';

/** A school's address: greenfield → greenfield.dopple.school. */
export const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/,
    'must be 3–40 lowercase letters, digits or dashes, not starting or ending with a dash',
  )
  .refine((value) => !RESERVED_SUBDOMAINS.has(value), 'is reserved');

/** "#2F7A55" → "#2f7a55". Null means Dopple's default colour. */
export const brandColor = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, 'must be a colour like #2f7a55');

export const createSchoolBody = z.object({
  name: z.string().trim().min(2).max(100),
  slug,
  city: z.string().trim().min(1).max(80).optional(),
  brandColor: brandColor.optional(),
  adminName: z.string().trim().min(1).max(80),
  adminEmail: z.email().max(320),
  password: z.string().min(10, 'must be at least 10 characters').max(1024),
});
export type CreateSchoolBody = z.infer<typeof createSchoolBody>;

export const searchQuery = z.object({ q: z.string().trim().min(2).max(80) });
export const slugQuery = z.object({ slug: z.string().max(100) });
