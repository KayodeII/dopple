# 0010 — Self-serve schools and school branding

- Status: accepted
- Date: 2026-10-14

## Context

Until now a school could only be created by the seed script or by hand in SQL, and every school's web app was the same Dopple green. Schools should be able to sign themselves up from the website, and their web app should carry their own name, colour and logo. People also need a way to reach their school's sign-in page from the website, since each school lives at its own address (ADR 0007).

## Decision

- **Self-serve sign-up:** `POST /schools` on the platform host creates a school and its first admin. It takes the name, the address (slug), an optional city and colour, and the admin's name, email and password. The response gives the school's sign-in URL with the email filled in. It is rate-limited per client IP (`SCHOOL_SIGNUPS_PER_HOUR`, default 5).
- **The registry stays read-only for the app role** (migration 0001). A new school is written by `create_school()`, a `SECURITY DEFINER` function owned by the migration role, which inserts the tenant and its admin together. `update_school_profile()` changes only the name and colour of the school set for the transaction (`app.tenant_id`). These two functions are the app role's only way to write `tenants`.
- **Addresses:** 3–40 lowercase letters, digits or dashes, not starting or ending with a dash, and not reserved (`www`, `api`, `admin`, `dopple`, …; the list is in `parse-host.ts`). `GET /schools/availability?slug=` answers the form's live check; the unique constraint is the real guarantee.
- **Find your school:** `GET /schools?q=` (at least 2 characters) returns at most 8 active schools whose name or address contains the text, each with its sign-in URL. It never lists all schools.
- **Branding:**
  - `tenants.brand_color` holds `#rrggbb`, or null for Dopple's default.
  - Logos go in `school_logos`, in Postgres while files are small. They must be PNG, JPEG or WebP, up to 200 KB, and are checked by their bytes, not their declared type. SVG is refused because it can carry script, and logos are served from the school's own origin with `nosniff` and a sandboxing CSP.
  - The web app sets `--color-school` from the school's colour, and picks white or near-black text on it for contrast.
- **`school_logos` is readable by every school** (logos are public: sign-in pages and the website search), through a second, SELECT-only policy. Writes are still limited to the school's own row. Code that reads it must filter by `tenant_id` itself.
- **Web addresses:** `SCHOOL_URL_FORMAT` (`https://{host}` in production, `http://{host}:3200` locally) turns a school into its web app address. `{host}` is `<slug>.<PLATFORM_DOMAIN>` or the school's custom domain.

## Consequences

- Anyone can create a school. Emails are not verified until there is an email provider (open question). Abuse controls, such as a CAPTCHA or a review queue, are follow-ups.
- The sign-up limit is per client IP as the API sees it. Behind the website's server or the edge, that is the proxy's IP until the API trusts the forwarded address (`trust proxy`), so in that setup the limit applies to everyone together.
- The tenant cache can remember "no such school" for an address that is then signed up. The API clears it on sign-up, but only in its own process; with several API instances, the others keep it for up to `TENANT_CACHE_TTL_SECONDS`.
- Logos in Postgres are fine at this size. Move them to object storage when uploads grow (recordings will force that decision anyway).
