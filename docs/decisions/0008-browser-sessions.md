# 0008 — Browser sessions: refresh token in an HttpOnly cookie

- Status: accepted
- Date: 2026-10-14

## Context

The web app is now the only client for every role (ADR 0007). The API returns the 30-day refresh token in the JSON body (ADR 0004), so a browser app would have to keep it where page scripts can read it. One XSS bug would then leak sessions that last a month. Access tokens last 15 minutes and can stay in memory.

## Decision

- A request that sends `X-Dopple-Session: cookie` gets its refresh token as a cookie, **never in the body**: on `/auth/sign-in` and `/auth/refresh`. `/auth/refresh` and `/auth/sign-out` read the token from that cookie when the body has none.
- The cookie is `__Host-dopple_refresh`: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, no `Domain`, `Max-Age` = the refresh-token lifetime. The `__Host-` prefix makes browsers enforce those attributes, so the cookie is bound to one school's host. A sibling school's subdomain cannot set or overwrite it.
- **CSRF:** the cookie only counts when the custom header is present. A cross-site form cannot send custom headers, and a cross-origin `fetch` that does would need a CORS preflight, which the API never grants. `SameSite=Strict` is a second layer.
- A failed refresh or a sign-out clears the cookie.
- Requests without the header keep working as before: tokens in the body, for scripts, tests and future native clients.
- The web app and the API share the school's origin: the edge routes the API under the school's own host, so the cookie is first-party and no CORS is needed.

## Consequences

- The web app keeps the access token in memory only. On page load it calls `/auth/refresh` to get one; on 401 it shows sign-in.
- `Secure` cookies need HTTPS. Browsers treat `localhost` and `*.localhost` as secure, so local development on `<slug>.dopple.localhost` works over plain HTTP.
- Enabling CORS on the API later would weaken the CSRF defence. Any CORS policy must not allow the `X-Dopple-Session` header from other origins.
