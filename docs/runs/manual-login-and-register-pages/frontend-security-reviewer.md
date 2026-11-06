# Frontend security review: manual-login-and-register-pages

Verdict: approved

Scope: files listed in `frontend-builder.md` (auth service/guard/models, login and register components and templates, header, environments, routing) plus `Frontend/nginx.conf` and `Frontend/package.json`. Read-only review; no code changed.

## Findings count
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 2 |
| low | 4 |

## Findings

### Medium

**M1. Angular 18.2.x has open `npm audit` advisories (no new dependencies added)**
- Package: `@angular/*` 18.2.14 (all runtime packages), `npm audit --omit=dev`: 0 critical, 4 high, 4 moderate (8 total). Reported as medium per policy (never blocking).
- Affected: `common`, `compiler`, `core`, `router` (high); `animations`, `forms`, `platform-browser`, `platform-browser-dynamic` (moderate). The advisories fall into these groups:
  - XSS in i18n bindings, SVG script/animation attributes, two-way binding and namespace sanitization bypass.
  - XSRF token leakage via protocol-relative or odd URLs in `HttpClient`.
  - `HttpTransferCache`, hydration and SSR issues.
  - DoS in `formatDate` and number formatting.
- Reachability in this change:
  - The app does not use i18n, SSR, hydration, `HttpTransferCache`, `formatDate` or `DecimalPipe`.
  - It does not use XSRF cookie handling; `apiUrl` is a fixed same-origin path (prod) or a fixed localhost URL (dev).
  - The only SVG is static inline markup in `app.component.html` with no bindings.
  - Practical exposure is low today, but the XSS class matters more because the JWT sits in `sessionStorage`.
- Fix: plan the Angular major upgrade (already a tracked follow-up in `docs/handover/601.md`). `npm audit` suggests v20/v22 (major bumps). Pin to the newest 18.2.x first if one exists.
- `npm outdated`: the whole Angular toolchain is behind (CLI/build-angular 18 vs 21/22, TypeScript 5.5 vs 7, `zone.js` 0.14.10 vs 0.16.3, `tslib` 2.8.1 vs 2.9.1 within range). Dev-only items (Jasmine, Karma reporters) are not security relevant.

**M2. No CSP or other browser hardening headers in nginx**
- File: `Frontend/nginx.conf` L31 (only `X-Content-Type-Options` is set).
- Problem: there is no `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `Permissions-Policy`. With JWT and profile data in `sessionStorage` (R2/R4 accepted), a CSP is the main compensating control against token theft via XSS, particularly given M1. Also, nginx listens on plain HTTP 8080 (L25), so TLS termination must happen in front of it in any real deployment; otherwise the token and passwords travel in cleartext.
- Fix: add a CSP (`default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`; verify Angular's inline styles), plus `X-Frame-Options: DENY` and `Referrer-Policy: no-referrer`. Document the TLS expectation.

### Low

**L1. Register shows server 400 messages verbatim**
- File: `Frontend/src/app/features/auth/register/register.component.ts` L125, rendered via `{{ msg }}` in `register.component.html`.
- Problem: output is interpolation-escaped, so there is no XSS. The mapped field name is checked against existing form controls and `field`/`message` are type-checked. Risk is limited to content/information disclosure if the backend ever returns internal text.
- Fix (optional): map known server messages to client strings, or cap message length.

**L2. Account enumeration through register 409**
- File: `register.component.ts` L112 ("Email already registered").
- Problem: the UI reveals whether an email is registered. This is the spec'd behaviour and inherent to the API contract. Login correctly uses a generic 401 message and does not distinguish unknown e-mail from wrong password. The register rate limit on the backend mitigates bulk probing.
- Fix: accept, or change the API to a generic response with out-of-band confirmation in a later task.

**L3. Session persists only client-side; logout does not revoke the token**
- File: `Frontend/src/app/core/auth.service.ts` `logout()` / `loadSession()`.
- Problem: `logout()` only removes the `sessionStorage` entry; the JWT stays valid server-side until `exp`. Expiry is decoded client-side for UI only (correctly commented), and checked on load and in `guestGuard` only. Not a blocker given R2/R4 and that no authenticated calls exist yet.
- Fix: when authenticated endpoints arrive, add an interceptor (attach the token only to `environment.apiUrl` requests, handle 401 by signing out) and consider short token TTL or server-side revocation.

**L4. Wildcard lazy route and no 404/protected-route guard**
- File: `Frontend/src/app/app-routing.module.ts` L6.
- Problem: `path: ''` loads `AuthModule` for any unmatched URL. There is no data exposure, only an unexpected chunk load. No open redirect exists: no `returnUrl`/redirect parameter is read, and `guestGuard` redirects to a fixed `/`. The `registered=1` query param is compared to a constant, never rendered.
- Fix: add a 404 route and a `canActivate` auth guard when protected pages are introduced.

## Checks with no issue found
- Secrets/tokens in code or environment files: none (`environment.ts` and `environment.prod.ts` hold only `apiUrl`).
- XSS sinks: no `innerHTML`, `bypassSecurityTrust*`, `eval` or `document.cookie` in `Frontend/src`; all user and server data uses text interpolation (header `user.fullName`, field errors).
- Sensitive data in logs/URLs: the only `console` call is the bootstrap error handler in `main.ts`; passwords are never stored or placed in URLs; `confirmPassword` is never sent; the register token is discarded (no auto sign-in); login/register query params carry only `registered=1`.
- Storage: token and `{ fullName, email, type }` in `sessionStorage` only (approved R2/R4, not flagged). Stored data is validated on read (`isAuthUser`, `exp`), malformed or expired entries are removed. No `localStorage`.
- Auth guard coverage: `/login` and `/register` guarded by `guestGuard`; no protected routes were added.
- Error messages: 401, 429 and other errors map to generic strings; no raw `HttpErrorResponse` or stack details shown.
- Over-fetching: only `fullName`, `email`, `type` are kept from the login payload.
- URL/CORS assumptions: prod uses same-origin `/api` (nginx proxies `/api/` only, drops client `X-Forwarded-For`); dev uses `http://localhost:3000/api` with backend CORS defaulting to `http://localhost:4200` (wildcard rejected in production). The production bundle contains no `localhost:3000` (per the builder; the command in the terminal history is consistent).
- Form hardening: `type="password"` inputs, correct `autocomplete` tokens, double-submit guard.
- Dependencies: no `package.json` changes in this task.
