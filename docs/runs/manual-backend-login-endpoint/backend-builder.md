# Backend build - manual-backend-login-endpoint

Verdict: done

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC1 | `authService.login` signs HS256 JWT `{ id, email, type }`, `expiresIn` = `JWT_EXPIRES_IN` or `8h`; payload is only `{ token }` |
| AC2 | Unknown email and wrong password both throw `InvalidCredentialsError` -> 401 `Invalid credentials`; bcrypt compare against a lazily built dummy hash when the user is missing |
| AC3 | Controller validates `email` (non-empty string after trim) and `password` (non-empty string) -> 400 with `errors[{field,message}]`; repository not called |
| AC4 | `JWT_SECRET` read from env at login time, no default; missing -> throws (500) before any lookup; `server.ts` exits 1 if `JWT_SECRET` or `DATABASE_URL` is missing/empty |
| AC5 | `SELECT id, email, password_hash, type FROM public.users WHERE email = $1`; hash never returned or logged (error handler logs `err.message` only) |
| AC6 | Migration untouched (already created by Database Builder); never executed |
| AC7 | `createApp()`: default `http://localhost:4200`; `CORS_ORIGIN=*` honoured only when `NODE_ENV !== "production"`, else throws; no credentials |
| AC8 | `tests/auth.test.ts` (200, 401 x2, 400 variants, 500 repo failure, missing secret, repo not called on 400) |
| AC9 | `npm run build` and `npm test` pass (19 tests) |
| AC10 | `Backend/.env.example` and `docs/context/backend.md` updated |
| AC11 | `express-rate-limit` on the login route only: default 10 / 15 min / IP, `skipSuccessfulRequests`, 429 JSON, `Retry-After`, `RateLimit-*`; `createApp({ loginRateLimit: { max, windowMs } })`; env `LOGIN_RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_WINDOW_MS`, invalid -> defaults; test uses `max: 2` |

## API contract
`POST /api/auth/login`, no auth, body `{ email: string, password: string }`.

| Status | Body |
| --- | --- |
| 200 | `{ success: true, payload: { token } }` |
| 400 | `{ success: false, message: "Validation failed", errors: [{ field: "email"\|"password", message }] }` (malformed JSON: `{ success: false, message: "Invalid JSON body" }`) |
| 401 | `{ success: false, message: "Invalid credentials" }` |
| 429 | `{ success: false, message: "Too many login attempts, please try again later" }` + `Retry-After` |
| 500 | `{ success: false, message: "Internal server error" }` |

## Files created/changed
Created: `Backend/src/routes/authRoutes.ts`, `Backend/src/controllers/authController.ts`, `Backend/src/services/authService.ts`, `Backend/src/repositories/userRepository.ts`, `Backend/src/middleware/loginRateLimit.ts`, `Backend/src/middleware/errorHandler.ts`, `Backend/tests/auth.test.ts`.
Changed: `Backend/src/app.ts`, `Backend/src/server.ts`, `Backend/package.json`, `Backend/package-lock.json`, `Backend/.env.example`, `Backend/tests/server.test.ts` (dummy env for startup tests + fail-fast test), `docs/context/backend.md`, `docs/context/project.md`.

## Dependencies added (R7)
`pg ^8.23.1`, `bcryptjs ^3.0.3`, `jsonwebtoken ^9.0.3`, `express-rate-limit ^8.7.2`; dev: `@types/pg`, `@types/jsonwebtoken`. `npm test` script added.

## Commands run
- `npm install ...` in `Backend/` - ok.
- `npm audit` - 1 high (transitive `body-parser` 2.0.0-2.3.0 DoS, via `express`), no critical; not a blocker, not fixed (out of scope; `npm audit fix` available).
- `npm run build` - ok.
- `npm test` - 19 pass, 0 fail. No real database contacted.

## Assumptions / known gaps
- `createApp()` without `userRepository` uses a repository that throws (500 on login); only `server.ts` wires the real `pg` Pool.
- The `pg` Pool does not connect until the first query, so startup tests use a dummy `DATABASE_URL`.
- Existing `tests/server.test.ts` had to change because startup now requires `JWT_SECRET` and `DATABASE_URL` (FR9/FR10).
- Rate limit keyed by `req.ip`, no `trust proxy` (Q12); in-memory store; no lockout.
- Nobody can log in until a user is inserted manually (no seed, Q6); migration must be applied by the human.
