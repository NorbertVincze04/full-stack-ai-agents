# Backend context

## Stack and commands
Node >= 22.18, TypeScript ESM (`module: nodenext`, `.ts` import extensions, `erasableSyntaxOnly`), Express 5, `cors`, `dotenv`, `pg`, `bcryptjs`, `jsonwebtoken`, `express-rate-limit`. Dev tooling: `tsx`, `typescript`.

| Command (in `Backend/`) | Purpose |
| --- | --- |
| `npm start` | `node src/server.ts` (native TS type stripping) |
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc` -> `dist/` |
| `npm test` | `node --test "tests/**/*.test.ts"` |

## Structure (path -> role)

| Path | Role |
| --- | --- |
| `src/app.ts` | `createApp(options?)`: CORS (guarded `*`), `express.json()`, `/api/auth` router, error handler. Options: `userRepository`, `loginRateLimit` ({ max, windowMs }) |
| `src/server.ts` | loads `dotenv`, fails fast (exit 1) if `JWT_SECRET`/`DATABASE_URL` missing, creates the `pg` Pool, listens, logs `hello world` |
| `src/routes/authRoutes.ts` | `POST /login` + rate limiter |
| `src/controllers/authController.ts` | body validation (400), maps results to 200/401 |
| `src/services/authService.ts` | email normalisation, bcrypt compare (dummy hash for unknown user), JWT signing (HS256) |
| `src/repositories/userRepository.ts` | `findByEmail` on `public.users` (parameterised); `Queryable` type so a Pool or a fake can be injected |
| `src/middleware/loginRateLimit.ts` | `express-rate-limit` factory (10 / 15 min / IP, failed attempts only) |
| `src/middleware/errorHandler.ts` | invalid JSON -> 400, anything else -> 500 `Internal server error` (message-only log) |
| `migrations/001_create_users.sql` | `CREATE TABLE IF NOT EXISTS public.users`; applied by a human only |
| `tests/app.test.ts`, `tests/auth.test.ts`, `tests/server.test.ts` | app/CORS, login + rate limit with a fake repository, startup |
| `.env.example` | documented env vars |

Layering: routes -> controllers -> services -> repositories.

## Config / environment

| Var | Default | Use |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:4200` | allowed origin; `*` only when `NODE_ENV !== production` (else `createApp()` throws); never credentials |
| `JWT_SECRET` | none (required) | HS256 signing key; no default; startup and login fail without it |
| `JWT_EXPIRES_IN` | `8h` | token lifetime |
| `DATABASE_URL` | none (required) | PostgreSQL connection string for database `ico-env` |
| `LOGIN_RATE_LIMIT_MAX` | `10` | failed logins per window per IP; invalid -> default |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | window; invalid -> default |

## API or routes

| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `POST /api/auth/login` | none | `{ email, password }` | 200 `{ success, payload: { token } }`; 400 `{ success, message: "Validation failed", errors: [{ field, message }] }`; 401 `{ success, message: "Invalid credentials" }`; 429 rate limited (+ `Retry-After`); 500 `Internal server error` |

JWT claims: `id`, `email`, `type`. Everything else returns 404.

## Data
`ico-env` is the database name; tables live in schema `public`. `public.users` (`id` uuid, `full_name`, `email` unique, `password_hash` bcrypt, `type` admin|user, `created_at`) is defined in `migrations/001_create_users.sql`, not applied by the app. No seed: users are inserted by hand (lower-case email). `bookings` not created yet.

## Conventions
- Import local modules with the `.ts` extension.
- Parameterised SQL only; secrets only from environment; never log passwords, hashes or bodies.
- Response shape `{ success, payload?, message?, errors? }`.
- Unexpected errors propagate (Express 5) to `errorHandler`.

## Tests
`node:test` + `describe/it`; no DB or network access (fake repository, small `max` for the rate limit). `server.test.ts` passes dummy `JWT_SECRET`/`DATABASE_URL` (the Pool does not connect until queried).

## Decisions and known gaps
- Express 5 `listen` callback also runs on bind errors (port conflict still logs `hello world`).
- `PORT` and empty `CORS_ORIGIN` are not validated; no helmet.
- Rate limit is in-memory, per process, keyed by `req.ip`; no `trust proxy` set (behind a proxy all clients share one bucket); no account lockout.
- `npm audit`: high advisory in transitive `body-parser` (via `express`), fix via `npm audit fix`; not addressed in this task.
