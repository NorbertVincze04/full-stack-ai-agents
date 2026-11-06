# Handover - manual-login-and-register-pages - Login and register pages

- Task: `docs/tasks/manual-login-and-register-pages.md` (source: manual, no Azure work item)
- Spec: `docs/specs/manual-login-and-register-pages.md`
- Area: frontend, backend (no database change, no container change)
- Commit: none. The human chose to skip both the backend and the frontend commits. Nothing is committed or pushed; all changes are uncommitted in the working tree on `main`.
- Final status: **done** (all 12 acceptance criteria verified; no blocker open)

## Summary
Adds `/login` and `/register` pages to the Angular app and a public `POST /api/auth/register` endpoint to the backend. A signed-in user sees their full name and an open-door (inline SVG) logout button in the header instead of the `Login` button. The login response now also carries `payload.user`. The human confirmed the implementation in the acceptance check; frontend specs and backend tests were added afterwards and pass.

## What was implemented
### Frontend
- Lazy `AuthModule` with `/login` and `/register` (reactive forms, validators mirror the backend rules, server 400/401/409/429 mapped to messages, double-submit guard, accessible labels and errors). A matcher route loads the auth chunk only on `/login` and `/register`.
- Register: `fullName`, `email`, `password`, `confirmPassword` (client-side only, never sent). Success goes to `/login?registered=1` with a success message; the user is not signed in and the register token is discarded.
- `AuthService` (`Frontend/src/app/core/`): `login`, `register`, `logout`, `currentUser$`; session in `sessionStorage` (key `deskbooking.auth`, token + `{ fullName, email, type }`); JWT `exp` decoded for UI only; expired or malformed entries removed on load, in the guard and by an expiry timer.
- `guestGuard`: signed-in users opening `/login` or `/register` go to `/`.
- Header: `Login` button to `/login` when signed out; user's full name (text interpolation) plus native `<button aria-label="Log out">` with an inline SVG door icon (no dependency) when signed in; logout clears the session and goes to `/`. Header wraps on narrow screens (UX H1 fix).
- `environment.ts` (`apiUrl: http://localhost:3000/api`) and `environment.prod.ts` (`apiUrl: /api`), swapped by `fileReplacements` in the production build so the nginx container keeps working through its `/api/` proxy.
- 84 new Jasmine specs (`AuthService`, `guestGuard`, login page, register page, signed-in/out header) and a test helper.

### Backend
- `POST /api/auth/register` (public): server validation per D1, bcrypt cost 10, parameterised INSERT with `type` hard-coded to `'user'`, `RETURNING` without the hash, duplicate e-mail 409 (pre-check and pg `23505`), rate limited, body/password/hash never logged.
- `POST /api/auth/login`: additive `payload.user = { fullName, email, type }`; `findByEmail` also selects `full_name`.
- `userRepository.create`, `registerRateLimit` middleware, `positiveInt` exported from `loginRateLimit`.
- 48 new tests in `Backend/tests/register.test.ts` plus minimal updates to three existing test files.

### Database
No migration. The existing `users` table (`full_name`, `email` unique, `password_hash`, `type`, `created_at`) is used as is.

### Containers
Not involved. No change to `compose.yaml`, `Frontend/nginx.conf` or the Containerfiles. Stack: `db` (PostgreSQL), `backend` (port 3000, not published), `frontend` (nginx, `127.0.0.1:${FRONTEND_PORT:-4200}` -> 8080, proxies `/api/` to the backend). Start with `podman compose up --build` from the repo root; variables are read from the git-ignored `.env` in the repo root (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET` required; values not recorded here).

## Files changed
Backend (modified): `Backend/.env.example`, `src/app.ts`, `src/controllers/authController.ts`, `src/middleware/loginRateLimit.ts`, `src/repositories/userRepository.ts`, `src/routes/authRoutes.ts`, `src/services/authService.ts`, `tests/auth.test.ts`, `tests/health.schema.test.ts`, `tests/login.acceptance.test.ts`.
Backend (new): `src/middleware/registerRateLimit.ts`, `tests/register.test.ts`.

Frontend (modified): `angular.json`, `src/app/app-routing.module.ts`, `app.component.{css,html,ts,spec.ts}`, `app.module.ts`, `info-route.spec.ts`.
Frontend (new): `src/environments/environment.ts`, `environment.prod.ts`; `src/app/core/auth.models.ts`, `auth.service.ts`, `auth.service.spec.ts`, `guest.guard.ts`, `guest.guard.spec.ts`; `src/app/features/auth/` (`auth.module.ts`, `auth-routing.module.ts`, `auth-validators.ts`, `auth-form.css`, `login/login.component.{ts,html,spec.ts}`, `register/register.component.{ts,html,spec.ts}`); `src/app/app.component.auth.spec.ts`; `src/app/testing/auth-test-utils.ts`.

Docs: `docs/context/backend.md`, `frontend.md`, `project.md`; task, spec, run reports and this handover.

`git diff --stat`: 21 modified files, 314 insertions, 53 deletions (excluding untracked files).

## Tools and technologies
Angular 18 (NgModule, reactive forms, `HttpClient`, functional guard, lazy routes), Express 5, TypeScript, `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`, Jasmine/Karma, `node:test`, nginx, Podman Compose.

## Dependencies added
None. `package.json` and lock files are unchanged in both projects. R5 (Font Awesome) was resolved with an inline SVG.

## API contract
### POST /api/auth/register (public)
- Request: `{ fullName, email, password }`; other fields (including `type`, `confirmPassword`) are ignored.
- Rules: `fullName` trimmed 1-100; `email` valid, <= 254, stored lower-case; `password` >= 8 characters, <= 72 bytes, a letter and a digit.
- 201 `{ success: true, payload: { token, user: { fullName, email, type: "user" } } }`
- 400 `{ success: false, message: "Validation failed", errors: [{ field, message }] }`
- 409 `{ success: false, message: "Email already registered" }`
- 429 `{ success: false, message: "Too many registration attempts, please try again later" }`
- 500 `{ success: false, message: "Internal server error" }`
- Rate limit: 10 requests / 1 h / IP, every request counted. Env: `REGISTER_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_WINDOW_MS` (both optional, documented in `Backend/.env.example`).

### POST /api/auth/login
200 `{ success: true, payload: { token, user: { fullName, email, type } } }`; 400/401/429/500 and JWT claims (`id`, `email`, `type`) unchanged.

## Migration to apply
None.

## How to run and verify
1. Backend: `cd Backend; npm run build; npm test`.
2. Frontend: `cd Frontend; npm run build; npm run test:ci`.
3. Dev: run the backend (needs `JWT_SECRET`, `DATABASE_URL` in `Backend/.env`) and `ng serve` (API at `http://localhost:3000/api`).
4. Container: `podman compose up --build`, open `http://localhost:4200`. Register at `/register`, log in at `/login`, check the name and door button in the header, click the door to log out.

## Acceptance criteria
Human acceptance (`human-accepted: true`) covers the visual and behavioural criteria; automated evidence is listed where it exists.

| AC | Status | Evidence |
| --- | --- | --- |
| AC1 Login from `/login`, lands on `/`, generic error on invalid credentials | Verified | Human acceptance; login page specs (success, 401, 429, 5xx); `AuthService` specs |
| AC2 Register with D1 validation (client and server), 409 message, redirect to `/login` with message, not signed in, new account can log in | Verified | Human acceptance; register page specs; backend `register.test.ts` (201, 400 per rule, 409, `23505`, "new account can then log in") |
| AC3 Header shows the full name instead of `Login` | Verified | Human acceptance; `app.component.auth.spec.ts` |
| AC4 Open-door inline SVG logout button, keyboard operable, accessible name, logout to `/` | Verified | Human acceptance; header specs (`aria-label`, `aria-hidden` SVG, logout clears storage and navigates). 44x44 px size and focus style not unit-tested (no e2e runner), accepted by the human |
| AC5 Lazy `/login` and `/register`, cross-links, header `Login` to `/login`, no `Register` link | Verified | Human acceptance; login/register/header specs; code reviewer re-review 1 (matcher route) |
| AC6 Signed-in user on `/login` or `/register` goes to `/` | Verified | `guest.guard.spec.ts`; human acceptance |
| AC7 Session survives reload (`sessionStorage`), expired or malformed token means signed out | Verified | `auth.service.spec.ts` (restore, expired, malformed, expiry timer); human acceptance |
| AC8 Register forces `type = 'user'`, bcrypt, parameterised SQL, rate limit, server validation, no password or hash returned or logged | Verified | `register.test.ts` (type forced, bcrypt hash, 429, no hash in response); backend code review and security review confirmed the INSERT. The `create` SQL text has no dedicated test (low, see findings) |
| AC9 Login keeps `token` and 400/401/429; `payload.user` added; register 201 same shape | Verified | `auth.test.ts`, `register.test.ts` (`user` object, claims, 401/400 unchanged) |
| AC10 `apiUrl` from `environment`; `/api` in the production build | Verified | Frontend builder (production bundle contains `/api`, no `localhost:3000`); `AuthService` specs use `environment.apiUrl`; human acceptance |
| AC11 Tests per FR13; builds and test commands succeed | Verified | Frontend `npm run test:ci` 97/97 and `npm run build` OK (`frontend-tester.md`); Backend `npm test` 122 tests, 120 pass, 2 skipped (Windows signals, pre-existing), `npm run build` OK (`backend-tester.md`) |
| AC12 Context docs updated per FR14 | Verified | Re-verified after the human fixed the two stale lines: `docs/context/backend.md` line 79 now references `Backend/tests/register.test.ts` (120 pass, 2 skipped); `docs/context/frontend.md` line 49 now lists 97 specs (13 existing + 84 new) and the new spec files. Routes, endpoint, structure, decisions and environment files are documented in `backend.md` and `frontend.md`; `Backend/.env.example` contains `REGISTER_RATE_LIMIT_MAX` and `REGISTER_RATE_LIMIT_WINDOW_MS` |

Summary: 12 of 12 Verified.

## Open findings
### Backend (code review: approved, security: approved; blocker 0, high 0)
| Id | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| Review M1 / Security M1 | medium | Rate-limit buckets keyed by `req.ip`; behind nginx all clients share one bucket (10 registrations / 1 h can block everyone). Known gap R6 | Separate task: forward the client IP in nginx and set `trust proxy` |
| Security M2 | medium | `npm audit`: `body-parser` 2.0.0-2.3.0 DoS (GHSA-27r3-jxmh-p828, transitive via `express`); `express-rate-limit` patch available | Human runs `npm audit fix` in `Backend/` (npm rates it high; per policy a dependency advisory below critical does not block `done`) |
| Review L1 | low | Stale register-tests line in `docs/context/backend.md` | Resolved (doc fixed) |
| Review L2-L6, Security L1-L5 | low | `positiveInt` coupling, UTF-16 length counting, control characters in `fullName`, pre-check timing, no test of `userRepository.create` SQL, no `JWT_SECRET` strength check, no length caps on login input, unused token in the register response | Optional follow-ups |

### Frontend (code, UX, security reviewers: approved after re-review 1; blocker 0, high 0)
| Id | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| Security M1 | medium | Angular 18.2.x `npm audit` advisories (4 high, 4 moderate); mostly unreachable here | Planned Angular upgrade (tracked in `docs/handover/601.md`); these are dependency advisories, not critical |
| Security M2 | medium | No CSP, `X-Frame-Options` or `Referrer-Policy` in `Frontend/nginx.conf`; nginx serves plain HTTP, so TLS must be terminated in front | Separate containers task |
| UX M1-M6 | medium | Focus and error summary after failed submit; focus lost after logout and redirect; same page title on all routes; password rules not shown up front and "72 bytes" wording; `disabled` submit button and no live region; no "Signed in as" context, no `title` on the logout button, silent sign-out on expiry, empty `/` page | Follow-up UX task |
| Code N1-N3, L1-L6; UX L1-L7; Security L1-L4 | low | Expiry timer in the Angular zone, side effects in `map`, duplicated auth paths, `errorFor` duplication, untyped server-error cast, stale server errors block resubmit, whitespace-only login e-mail, no cancel on destroy, header polish, 409 enumeration (accepted), logout does not revoke the token, no 404 route | Optional or accepted |
| Frontend context doc | low | `docs/context/frontend.md` line 49 was stale | Resolved (doc fixed) |

## Review coverage
| Reviewer | Ran | Notes |
| --- | --- | --- |
| Backend Code Reviewer | Yes | Routes, controllers, services and repository changed. Approved |
| Backend Security | Yes | Security-relevant. Approved |
| Backend Tester | Yes | Pass, 48 tests added |
| Database Builder / Migrator | Skipped | `database-changes: no` |
| Frontend Builder | Yes | Plus fix iteration 1 |
| Frontend UX Reviewer | Yes | Approved after re-review 1 |
| Frontend Code Reviewer | Yes | Approved after re-review 1 |
| Frontend Security Reviewer | Yes | Approved |
| Frontend Tester | Run on human request ("run frontend tests") | Pass, 97/97. The reviewers were not re-run after this round, which only added specs and a test helper (no application code changed) |
| Containers | Not involved | No container change |

## Approved risks
| Risk | Human decision | What was implemented |
| --- | --- | --- |
| R1 public `POST /api/auth/register` | Approved as described | Public endpoint with rate limit, server validation, forced `type = 'user'`, 409 on duplicate e-mail (e-mail enumeration accepted) |
| R2 JWT in `sessionStorage` | Approved as described | Token stored in `sessionStorage` (per tab), expiry checked on load, in the guard and by timer |
| R3 login response extended with `payload.user` | Approved as described | Additive `user` object on login and register; `token` and error behaviour unchanged |
| R4 name, e-mail and type in `sessionStorage` | Approved as described | `{ fullName, email, type }` stored next to the token; shape validated on read |
| R5 Font Awesome dependency | Human chose the safer alternative | Inline SVG open-door icon, no dependency added |

## Blocking `done`
Nothing. All acceptance criteria are verified; no blocker, no non-dependency high finding and no critical dependency advisory is open (task `status: done`; no Azure work item, source is manual).

## Follow-ups
- Commit the work on a feature branch (the PR rules do not allow committing to `main`); the PR descriptions are in `docs/runs/manual-login-and-register-pages/pr-backend.md` and `pr-frontend.md`.
- Run `npm audit fix` in `Backend/`; plan the Angular upgrade.
- Containers task: client IP forwarding (`X-Forwarded-For`) with `trust proxy`, security headers and CSP in `Frontend/nginx.conf`, TLS expectation.
- UX follow-ups M1-M6 and a home page for `/`.
- Add a test for the `userRepository.create` SQL.
- Optional: omit the unused `token` from the register response (needs a contract amendment).
- Keyboard and focus styles of the logout button were not tested in a browser or by an e2e run.
