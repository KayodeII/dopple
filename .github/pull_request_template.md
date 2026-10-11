## What and why

<!-- One or two sentences: what changes and why it is needed. Link the issue. -->

## How to test

<!-- Steps a reviewer can follow. -->

## UI changes

<!--
Required when this PR changes anything a user sees
(apps/site, apps/web, apps/desktop, packages/ui).
CI checks both sections below.

Capture screenshots (or a short screen recording) from the running UI built
from this branch — browser DevTools, Playwright, etc. Do not use AI-generated
images, Figma exports, or mock placeholders as evidence.

Drag the captures into the boxes below. For a brand-new screen with no prior
UI, write "New screen" under Before (After still needs a real screenshot).
Delete this whole section if there is no UI change.
-->

### Before

### After

## Checklist

- [ ] `pnpm check` passes
- [ ] Tenant-owned data goes through `TenantDb.run()`; isolation test updated if tenancy changed
- [ ] New env vars added to `env.ts` and `.env.example`
- [ ] `docs/context/CONTEXT.md` updated
- [ ] No `Co-authored-by` trailers in commits
