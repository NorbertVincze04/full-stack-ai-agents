# manual-login-and-register-pages: Login and register pages (frontend)

Branch: `main` (current branch; no new branch proposed). Committing and pushing directly to `main` is not allowed by the PR rules, so the human must put this work on a feature branch before the commit/push step.
Work item: none (manual task, no Azure work item URL in `docs/tasks/manual-login-and-register-pages.md`)

## Summary
Frontend part of the login and register pages task:
- Lazy `AuthModule` with `/login` and `/register` (reactive forms, validators mirror the backend rules, server 400/401/409/429 mapped to messages).
- `AuthService` (session in `sessionStorage`, JWT `exp` decoded for UI only, expiry timer) and functional `guestGuard`.
- Header shows the user's name and an open-door log out button when signed in; the `Login` button links to `/login`.
- `environment.ts` / `environment.prod.ts` (`apiUrl`), swapped by `fileReplacements` in the production build.
- Jasmine specs for `AuthService`, `guestGuard`, login and register pages, and the signed-in/signed-out header (84 new tests) plus a test helper.
- No new dependency.

## Acceptance criteria (frontend scope)
- [x] AC1: user can log in (`/login`, redirects to `/`).
- [x] AC2: user can register (`/register`, then `/login?registered=1`, token ignored).
- [x] AC3: header shows the user's name instead of `Login`.
- [x] AC4: open-door log out button to the right of the name; clears the session and navigates to `/`.
- [x] AC5: lazy routes, cross-links, header `Login` button to `/login`.
- [x] AC6: `guestGuard` redirects signed-in users away from both pages.
- [x] AC7: session in `sessionStorage`; expired or malformed entries removed (on load, in the guard and by timer).
- [x] AC10: `apiUrl` from the environment (`/api` in production, `http://localhost:3000/api` in development).
- [x] AC11 (frontend part): Jasmine specs for `AuthService`, `guestGuard`, login page, register page and header (FR13), see `frontend-tester.md`.
- [x] AC12 (frontend part): `docs/context/frontend.md` and `docs/context/project.md` updated.
- Backend criteria (AC2 server side, AC8, AC9) are covered in `pr-backend.md`.

## Test results
- `npm run build` (Frontend): OK, auth lazy chunk 44.00 kB, initial 279.67 kB, no budget warnings.
- `npm run test:ci` (Frontend): 97 of 97 pass (13 existing + 84 new), 0 failed, no warnings. Tester verdict: pass.
- No ESLint in the project.
- Not covered by unit tests: keyboard operability, 44x44 px size and focus styles of the log out button (CSS; no e2e runner exists).
- Not exercised in a browser or against the running backend.

## Review verdicts
- Code review: approved (re-review 1), no blocker or high.
- UX review: approved (re-review 1), no blocker; the earlier high finding (header overflow at 320 px) is resolved.
- Security review: approved, no blocker or high.

## Open review findings
| Id | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| Code M1 | medium | Resolved: specs added by the tester (97/97 pass). The route matcher has no dedicated spec, but the login and register specs navigate through it. | None. |
| Security M1 | medium | Angular 18.2.x has open `npm audit` advisories (4 high, 4 moderate; mostly unreachable here). | Planned Angular upgrade (see `docs/handover/601.md`). |
| Security M2 | medium | No CSP, `X-Frame-Options` or `Referrer-Policy` in `Frontend/nginx.conf`; nginx serves plain HTTP, so TLS must be terminated in front. JWT is in `sessionStorage`. | Add headers in a separate task; document the TLS expectation. |
| UX M1 | medium | No focus or error summary management after a failed submit. | Follow-up. |
| UX M2 | medium | Focus is lost after logout and after the login/register redirect. | Follow-up. |
| UX M3 | medium | Page title is the same on all routes. | Add route `title`. |
| UX M4 | medium | Password rules are not shown up front; "72 bytes" wording. | Add a hint and reword. |
| UX M5 | medium | `disabled` submit button drops focus; progress not in a live region. | Use `aria-disabled` plus `role="status"`. |
| UX M6 | medium | No "Signed in as" context, no `title` on the log out button, silent sign-out on token expiry, empty `/` page after login. | Follow-up. |
| Code N1 | low | Expiry timer runs inside the Angular zone (affects `whenStable` and future `fakeAsync` specs). | Use `runOutsideAngular`. |
| Code N2 | low | Side effects in `map` in `login()`; client clock skew can fail a valid login. | Use `tap`; relax the client `exp` check. |
| Code N3 | low | Auth paths duplicated in the matcher and the feature routes; matcher only covered indirectly. | Optional dedicated spec. |
| Code L1-L6 | low | `errorFor` duplication, untyped server-error cast, stale server errors block resubmit, whitespace-only login e-mail, no request cancel on destroy, plain mutable fields. | Optional. |
| UX L1-L7 | low | Host typography, truncated name only readable via tooltip, header `Login` active on `/login`, no hover states, e-mail input hints, Info page second `<h1>`, wrapped actions left-aligned. | Optional. |
| Security L1-L4 | low | Server 400 messages shown verbatim, 409 account enumeration (spec'd), logout does not revoke the token, no 404 route or protected-route guard. | Accepted or later tasks. |
| Backend (see `pr-backend.md`) | medium/low | Rate-limit bucket behind nginx, `npm audit` in `Backend/`, stale text in `docs/context/backend.md`. | Handled in the backend PR. |

## Files to commit (frontend scope)
Modified:
- `Frontend/angular.json`
- `Frontend/src/app/app-routing.module.ts`
- `Frontend/src/app/app.component.css`
- `Frontend/src/app/app.component.html`
- `Frontend/src/app/app.component.spec.ts` (adds HttpClient test providers)
- `Frontend/src/app/app.component.ts`
- `Frontend/src/app/app.module.ts`
- `Frontend/src/app/info-route.spec.ts`
- `docs/context/frontend.md`
- `docs/context/project.md`

New:
- `Frontend/src/environments/environment.ts`
- `Frontend/src/environments/environment.prod.ts`
- `Frontend/src/app/core/auth.models.ts`
- `Frontend/src/app/core/auth.service.ts`
- `Frontend/src/app/core/guest.guard.ts`
- `Frontend/src/app/features/auth/auth-form.css`
- `Frontend/src/app/features/auth/auth-routing.module.ts`
- `Frontend/src/app/features/auth/auth-validators.ts`
- `Frontend/src/app/features/auth/auth.module.ts`
- `Frontend/src/app/features/auth/login/login.component.html`
- `Frontend/src/app/features/auth/login/login.component.ts`
- `Frontend/src/app/features/auth/register/register.component.html`
- `Frontend/src/app/features/auth/register/register.component.ts`
- `Frontend/src/app/app.component.auth.spec.ts`
- `Frontend/src/app/core/auth.service.spec.ts`
- `Frontend/src/app/core/guest.guard.spec.ts`
- `Frontend/src/app/features/auth/login/login.component.spec.ts`
- `Frontend/src/app/features/auth/register/register.component.spec.ts`
- `Frontend/src/app/testing/auth-test-utils.ts`
- `docs/tasks/manual-login-and-register-pages.md`
- `docs/specs/manual-login-and-register-pages.md`
- `docs/runs/manual-login-and-register-pages/frontend-builder.md`
- `docs/runs/manual-login-and-register-pages/frontend-tester.md`
- `docs/runs/manual-login-and-register-pages/frontend-code-reviewer.md`
- `docs/runs/manual-login-and-register-pages/frontend-security-reviewer.md`
- `docs/runs/manual-login-and-register-pages/frontend-ux-reviewer.md`
- `docs/runs/manual-login-and-register-pages/pr-frontend.md`

Not included (backend scope, for the backend commit): everything under `Backend/`, `docs/context/backend.md`, and `docs/runs/manual-login-and-register-pages/backend-*.md` and `pr-backend.md`.

Diff stat (tracked files in scope): 8 frontend files changed (about 76 insertions, 14 deletions) plus the context docs; the new files (including all new specs and the test helper) are untracked. `auth-test-utils.ts` is not part of the app build (`tsconfig.app.json` only includes `main.ts`).

## Proposed commit message
```
manual-login-and-register-pages: Login and register pages (frontend)

Add lazy /login and /register pages, AuthService with sessionStorage
session and expiry handling, guestGuard, and a header with the user's
name and an open-door log out button. API base URL comes from
environment files (/api in production). Add Jasmine specs for the auth
service, guard, pages and header (97 tests pass).
```

## How to verify
1. `cd Frontend; npm ci; npm run build; npm run test:ci` (97 tests pass).
2. Start the backend (with DB and `JWT_SECRET`) and `npm start` in `Frontend/`.
3. Open `/register`, create an account: redirected to `/login?registered=1` with a success message. Registering the same e-mail shows "Email already registered".
4. Log in on `/login`: redirected to `/`, the header shows the user's name and the door button instead of `Login`. Wrong password shows "Invalid email or password".
5. Reload the page: still signed in (same tab). Open `/login` while signed in: redirected to `/`.
6. Click the door button: signed out, header shows `Login` again.
7. At 320 px width the signed-in header wraps without horizontal scroll.
8. `npm run build` output should not contain `localhost:3000`.
