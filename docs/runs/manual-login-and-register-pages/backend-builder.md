# Backend build report - manual-login-and-register-pages

Verdict: done (backend scope only; tests for register not written, by instruction).

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC2 (server side), AC8 | `POST /api/auth/register`: server validation per D1, bcrypt cost 10, parameterised INSERT with `type` hard-coded to `'user'` in SQL, `RETURNING` excludes the hash, rate limited, body/password/hash never logged |
| AC9 | login `payload` is now `{ token, user: { fullName, email, type } }`; register 201 has the same shape; 400/401/429 unchanged |
| AC12 (backend part) | `docs/context/backend.md`, `docs/context/project.md`, `Backend/.env.example` |

Approved risks used: R1 (public register, with rate limit, validation, forced type) and R3 (additive `payload.user`). No other risky change made. No migration, no dependency added.

## API contract
### POST /api/auth/register (public)
- Request: `{ fullName, email, password }`; other fields (including `type`, `confirmPassword`) are ignored.
- Rules: `fullName` string, trimmed, 1-100 chars; `email` string, trimmed, valid format, <= 254, stored lower-case; `password` string, >= 8 characters, <= 72 bytes (UTF-8), at least one letter (`\p{L}`) and one digit (ASCII `\d`).
- 201 `{ success: true, payload: { token, user: { fullName, email, type: "user" } } }`
- 400 `{ success: false, message: "Validation failed", errors: [{ field: "fullName"|"email"|"password", message }] }`
- 409 `{ success: false, message: "Email already registered" }` (from the `findByEmail` pre-check, or a pg `23505` thrown by `create`)
- 429 `{ success: false, message: "Too many registration attempts, please try again later" }` (+ `RateLimit` headers)
- 500 `{ success: false, message: "Internal server error" }`
- Rate limit: 10 requests / 1 h / IP, every request counted; env `REGISTER_RATE_LIMIT_MAX`, `REGISTER_RATE_LIMIT_WINDOW_MS` (invalid -> defaults); `createApp({ registerRateLimit: { max, windowMs } })` for tests.

### POST /api/auth/login
- Request and 400/401/429/500 unchanged.
- 200 `{ success: true, payload: { token, user: { fullName, email, type } } }`; JWT claims unchanged (`id`, `email`, `type`).

## Files created/changed
- Created: `Backend/src/middleware/registerRateLimit.ts`, `docs/runs/manual-login-and-register-pages/backend-builder.md`
- Changed: `Backend/src/app.ts`, `Backend/src/routes/authRoutes.ts`, `Backend/src/controllers/authController.ts`, `Backend/src/services/authService.ts`, `Backend/src/repositories/userRepository.ts` (`UserRecord.fullName`, `NewUser`, `CreatedUser`, `create`, `findByEmail` selects `full_name`), `Backend/src/middleware/loginRateLimit.ts` (exports `positiveInt`), `Backend/.env.example` (two register limit vars)
- Existing tests updated minimally for the login contract: `Backend/tests/auth.test.ts` (payload keys `["token","user"]`), `Backend/tests/health.schema.test.ts` (login query text now selects `full_name`), `Backend/tests/login.acceptance.test.ts` (row mapping expects `fullName`)
- Context: `docs/context/backend.md`, `docs/context/project.md`

## Commands
- `npm run build` (Backend): OK.
- `npm test` (Backend): 74 tests, 72 pass, 0 fail, 2 skipped (SIGTERM/SIGINT on Windows).
- Temporary in-memory smoke script (fake repository, deleted): register 201 with lower-cased e-mail, trimmed name and forced `user` type despite `type: "admin"` in the body; duplicate 409; invalid body 400 with per-field errors; login 200 with `user`.

## Notes for the tester
- Existing test fakes implement only `findByEmail`; `UserRepository` now also requires `create` (type-level only; tests are not type-checked by `tsc`, and nothing in them calls `create`). New fakes should implement it. A fake can signal a race by throwing an object with `code: "23505"` from `create`.
- Server password minimum counts characters, maximum counts bytes (bcrypt limit); the frontend mirror should use the same letter/digit rules (any Unicode letter, ASCII digit).
- 409 reveals registered e-mails (accepted in D2). Register limiter shares the single-bucket weakness behind nginx (known gap R6).

## Known gaps
- No register tests yet (Backend Tester).
- The register response includes a token the frontend discards (spec open question, default kept).
