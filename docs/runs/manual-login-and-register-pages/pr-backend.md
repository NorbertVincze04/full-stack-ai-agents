# manual-login-and-register-pages: Login and register pages (backend)

Branch: `main` (current branch; no new branch proposed)
Work item: none (manual task, no Azure work item URL in `docs/tasks/manual-login-and-register-pages.md`)

## Summary
Backend part of the login and register pages task:
- New public `POST /api/auth/register` (validation, bcrypt, `type` forced to `user`, rate limited).
- `POST /api/auth/login` now also returns `payload.user = { fullName, email, type }` (additive).
- `userRepository.create` added; `findByEmail` also selects `full_name`.
- No migration, no new dependency.

Approved risks used: R1 (public register endpoint, 409 enumeration) and R3 (additive login payload).

## Acceptance criteria (backend scope)
- [x] AC2 (server side): register 201, 400 per D1, 409 duplicate (pre-check and `23505` race), e-mail lower-cased, name trimmed.
- [x] AC8: `type` is the SQL literal `'user'`, bcrypt cost 10, parameterised SQL, rate limit, server validation, no password or hash returned or logged.
- [x] AC9: login keeps `token` and 400/401/429; `payload.user` added; register 201 has the same shape.
- [x] AC11 (backend part): `npm test` and `npm run build` pass in `Backend/`.
- [x] AC12 (backend part): `docs/context/backend.md`, `docs/context/project.md`, `Backend/.env.example` updated.
- Frontend criteria (AC1, AC3 to AC7, AC10, frontend part of AC11) are not covered by this PR description.

## API contract
### POST /api/auth/register (public)
- Request: `{ fullName, email, password }`; other fields (including `type`, `confirmPassword`) are ignored.
- Rules: `fullName` string, trimmed, 1-100 chars; `email` string, trimmed, valid format, <= 254, stored lower-case; `password` string, >= 8 chars, <= 72 bytes (UTF-8), at least one letter and one digit.
- 201 `{ success: true, payload: { token, user: { fullName, email, type: "user" } } }`
- 400 `{ success: false, message: "Validation failed", errors: [{ field, message }] }`
- 409 `{ success: false, message: "Email already registered" }`
- 429 `{ success: false, message: "Too many registration attempts, please try again later" }`
- 500 `{ success: false, message: "Internal server error" }`
- Rate limit: 10 requests / 1 h / IP, every request counted. Env: `REGISTER_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_WINDOW_MS`.

### POST /api/auth/login
- Request and 400/401/429/500 unchanged.
- 200 `{ success: true, payload: { token, user: { fullName, email, type } } }`; JWT claims unchanged (`id`, `email`, `type`).

## Migration
None. The existing `users` table is used as is.

## Test results
- `npm run build` (Backend): OK.
- `npm test` (Backend): 122 tests, 120 pass, 0 fail, 2 skipped (SIGTERM/SIGINT on Windows, pre-existing). 48 tests added in `Backend/tests/register.test.ts`.
- No coverage script exists.

## Open review and security findings
Verdicts: code review approved, security approved. No blocker or high findings.

| Id | Severity | Finding | Suggested action |
| --- | --- | --- | --- |
| Review M1 / Security M1 | medium | Rate-limit buckets are keyed by `req.ip`; behind the nginx container all clients share one bucket (10 registrations / 1 h can block everyone). Known gap R6. | Separate task: forward client IP in nginx and set `trust proxy`. |
| Security M2 | medium | `npm audit`: `body-parser` 2.0.0-2.3.0 DoS (GHSA-27r3-jxmh-p828, transitive via `express`); `express-rate-limit` 8.7.3 patch available. | Human runs `npm audit fix` in `Backend/` (lock file change, not done here). |
| Review L1 | low | `docs/context/backend.md` "Tests" section still says register tests are not written; the tests table row omits `register.test.ts` and `login.acceptance.test.ts`. Stale text is in files included in this PR. | Fix before commit (this mode does not edit source or docs). |
| Review L2 | low | `registerRateLimit.ts` imports `positiveInt` from `loginRateLimit.ts`. | Move to a shared helper. |
| Review L3 | low | Length checks use UTF-16 code units for min password and `fullName` max. | Optional. |
| Review L4 / Security L4 | low | `fullName` accepts control characters. | Optional `\p{Cc}` rejection. |
| Review L5 | low | `findByEmail` pre-check skips bcrypt (timing); a hand-inserted mixed-case e-mail would not be matched. | Accepted (D2). |
| Review L6 / Security L5 / Tester | low | No test of the `userRepository.create` SQL; old fakes lack `create`. | Add a test next to the login query test in `health.schema.test.ts`. |
| Security L1 | low | `JWT_SECRET` strength is not checked. | Fail fast under 32 chars, in a later task. |
| Security L2 | low | Login does not cap `email` and `password` length. | Reuse register caps. |
| Security L3 | low | Register response returns a token the frontend discards. | Accepted per D3; omit if the contract is amended. |

## How to verify
1. `cd Backend; npm run build; npm test`.
2. With the DB and `JWT_SECRET` configured: `POST /api/auth/register` with a valid body returns 201 with `payload.user.type = "user"`, even when the body sends `type: "admin"`; repeating it returns 409; an invalid body returns 400 with per-field errors.
3. `POST /api/auth/login` with that account returns `payload.token` and `payload.user`.
4. The 11th register request from one IP within an hour returns 429.
