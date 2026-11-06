# Backend code review - manual-login-and-register-pages

Verdict: approved

Approved risks respected: R1 (public register, rate limited, validated, `type` forced to `user`) and R3 (additive `payload.user`). No other risky change found (no migration, no dependency change).

Reviewed: `Backend/src/app.ts`, `routes/authRoutes.ts`, `controllers/authController.ts`, `services/authService.ts`, `repositories/userRepository.ts`, `middleware/registerRateLimit.ts`, `middleware/loginRateLimit.ts`, `Backend/.env.example`, `docs/context/backend.md`, `docs/context/project.md`, plus `backend-builder.md` and `backend-tester.md`.

Build: `npm run build` (Backend) -> exit 0. Tester reports 122 tests, 120 pass, 0 fail, 2 skipped (Windows signals, pre-existing).

## Acceptance criteria (backend part)
| AC | Result |
| --- | --- |
| AC2 server side (201, 400 per D1, 409, lower-cased e-mail, trimmed name) | met |
| AC8 `type` forced to `user`, bcrypt cost 10, parameterised SQL, rate limit, server validation, no hash/password returned or logged | met. `type` is a SQL literal `'user'` in the INSERT; `RETURNING` excludes `password_hash`; the controller reads only `fullName`, `email`, `password` |
| AC9 login keeps `token` and 400/401/429; `payload.user` added; register 201 has the same shape | met |
| AC12 backend docs | met, with the stale text in L1 |

Layering (routes -> controllers -> services -> repositories), response shape `{ success, payload?, message?, errors? }`, `.ts` import extensions and error propagation to `errorHandler` follow the existing pattern. `getJwtSecret()` is called before the insert, so a missing secret cannot leave an account created with a 500 response. The `23505` race maps to 409. The INSERT columns match `002_ico_env_users.sql` and `001_create_users.sql` (`id` and `created_at` have defaults, `type` passes the CHECK).

## Findings

### Blocker
None.

### High
None.

### Medium
- M1. `Backend/src/middleware/registerRateLimit.ts` (whole limiter), `Backend/src/app.ts` L44-L48. The limiter counts every request, keyed by `req.ip`, and `trust proxy` is not set. Behind the nginx container (the compose stack) `req.ip` is the proxy, so all users share one bucket of 10 per hour. A single client, or ordinary use, can block registration for everyone for an hour. The login limiter only counts failures, so it is less exposed. This is the known gap R6 and is documented in `backend.md`, so it does not block approval. Suggested fix, in a separate task: forward the client IP in nginx (`X-Forwarded-For`) and set `trust proxy` to the proxy hop. Optionally raise `REGISTER_RATE_LIMIT_MAX` in the container config until then.

### Low
- L1. `docs/context/backend.md`, "Tests" section: "Register tests are not written yet ... fake repositories must implement `create`" is stale, because `Backend/tests/register.test.ts` now exists. The Structure table row for tests also omits `register.test.ts` and `login.acceptance.test.ts`. Suggested fix: update both.
- L2. `Backend/src/middleware/registerRateLimit.ts` L3. It imports `positiveInt` from `loginRateLimit.ts`, which couples two sibling middlewares. Suggested fix: move `positiveInt` to a small shared helper, for example `src/config/`.
- L3. `Backend/src/controllers/authController.ts` L50-L54. The password minimum and the `fullName` limit use `String.length` (UTF-16 code units), while the maximum uses bytes. An astral character (emoji) counts as 2 toward the minimum and toward the 100-character name limit. Not a security issue. Suggested fix: use `[...value].length` if exact character counts matter, and keep the frontend mirror consistent.
- L4. `Backend/src/controllers/authController.ts` L26-L36. `fullName` accepts control characters and newlines. It is stored as is, and the Angular header escapes it, so there is no XSS risk. Suggested fix: reject `\p{C}` if it is ever rendered outside Angular templates (e-mails, logs).
- L5. `Backend/src/services/authService.ts` L83. The `findByEmail` pre-check returns before the bcrypt hash, so response time shows whether the e-mail is registered. The 409 already reveals it (accepted in D2, R1), so there is no extra exposure. The pre-check is a lookup against a case-sensitive unique index. A hand-inserted mixed-case e-mail would not be found, and the register would then succeed as a second account. This is covered by the "lower-case email" data convention.
- L6. No test of the `userRepository.create` SQL (query text, `$1..$3` values, `type` literal, `RETURNING` without `password_hash`, schema quoting). Also, the fakes in `auth.test.ts` and `login.acceptance.test.ts` lack `create`; this is harmless at run time because tests are not type-checked. Suggested fix: add a test next to the login query test in `health.schema.test.ts`.

## Summary
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 1 |
| low | 6 |
