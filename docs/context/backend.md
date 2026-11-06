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
| `src/app.ts` | `createApp(options?)`: CORS (guarded `*`), `express.json()`, `/api/auth` and `/api/health` routers, error handler. Options: `userRepository`, `loginRateLimit` ({ max, windowMs }), `registerRateLimit` ({ max, windowMs }), `dbProbe` (`Queryable`; none -> health answers 503), `healthTimeoutMs` (default 2000) |
| `src/server.ts` | loads `dotenv`, fails fast (exit 1) if `JWT_SECRET`/`DATABASE_URL` missing or `DB_SCHEMA` invalid, creates the `pg` Pool (5 s connection/query timeouts), passes it as repository DB and `dbProbe`, listens, logs `hello world`; SIGTERM/SIGINT close the server and pool (forced exit after 5 s) |
| `src/config/dbSchema.ts` | `parseDbSchema(raw)`: unset/empty -> `public`, else must match `^[A-Za-z0-9_-]+$` (throws otherwise) |
| `src/routes/authRoutes.ts` | `POST /login` + login limiter, `POST /register` + register limiter |
| `src/routes/healthRoutes.ts`, `controllers/healthController.ts`, `services/healthService.ts`, `repositories/healthRepository.ts` | `GET /api/health`: `SELECT 1` via the injected `Queryable`, `Promise.race` timeout, fixed bodies |
| `src/controllers/authController.ts` | login and register body validation (400), maps results to 200/201/401/409 |
| `src/services/authService.ts` | `login` and `register`: email normalisation, bcrypt (cost 10; compare with dummy hash for unknown user), JWT signing (HS256), `EmailAlreadyRegisteredError` (pre-check or pg `23505`), returns `{ token, user: { fullName, email, type } }` |
| `src/repositories/userRepository.ts` | `createUserRepository(db, schema = "public")`, `findByEmail` (incl. `full_name`) and `create` (INSERT with `type` fixed to `'user'`, `RETURNING` id, email, type, full_name); parameterised; `public.users` for `public`, `"<schema>".users` otherwise; `Queryable` type so a Pool or a fake can be injected |
| `src/middleware/loginRateLimit.ts` | `express-rate-limit` factory (10 / 15 min / IP, failed attempts only); exports `positiveInt` |
| `src/middleware/registerRateLimit.ts` | `express-rate-limit` factory (10 / 1 h / IP, every request counted) |
| `src/middleware/errorHandler.ts` | invalid JSON -> 400, anything else -> 500 `Internal server error` (message-only log) |
| `migrations/001_create_users.sql` | `CREATE TABLE IF NOT EXISTS public.users`; applied by a human only |
| `db/migrations/001..003_ico_env_*.sql` | container init SQL: schema `"ico-env"`, `users`, `bookings`, `schema_migrations`; idempotent; mounted into the `db` container (not applied by the app) |
| `tests/app.test.ts`, `tests/auth.test.ts`, `tests/register.test.ts`, `tests/server.test.ts`, `tests/health.schema.test.ts`, `tests/health.extra.test.ts`, `tests/login.acceptance.test.ts` | app/CORS, login + rate limit with a fake repository, register (validation, 201/409/429, type forced to user), startup, health route, `DB_SCHEMA` validation and login query schema, extra health and login acceptance cases |
| `.env.example` | documented env vars |

Layering: routes -> controllers -> services -> repositories.

## Config / environment

| Var | Default | Use |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:4200` | allowed origin; `*` only when `NODE_ENV !== production` (else `createApp()` throws); never credentials |
| `JWT_SECRET` | none (required) | HS256 signing key; no default; startup and login fail without it |
| `JWT_EXPIRES_IN` | `8h` | token lifetime |
| `DATABASE_URL` | none (required) | PostgreSQL connection string (database `ico-env` on Cloud Foundry; `POSTGRES_DB`, default `deskbooking`, in the container) |
| `DB_SCHEMA` | `public` | schema of `users`; validated against `^[A-Za-z0-9_-]+$` at startup (exit 1 if invalid); `public` -> `public.users`, others quoted (`"ico-env".users`); container sets `ico-env` |
| `LOGIN_RATE_LIMIT_MAX` | `10` | failed logins per window per IP; invalid -> default |
| `LOGIN_RATE_LIMIT_WINDOW_MS` | `900000` | window; invalid -> default |
| `REGISTER_RATE_LIMIT_MAX` | `10` | register requests per window per IP (all counted); invalid -> default |
| `REGISTER_RATE_LIMIT_WINDOW_MS` | `3600000` | window; invalid -> default |

## API or routes

| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `POST /api/auth/login` | none | `{ email, password }` | 200 `{ success, payload: { token, user: { fullName, email, type } } }`; 400 `{ success, message: "Validation failed", errors: [{ field, message }] }`; 401 `{ success, message: "Invalid credentials" }`; 429 rate limited (+ `Retry-After`); 500 `Internal server error` |
| `POST /api/auth/register` | none (public) | `{ fullName, email, password }` (other fields ignored; `type` always `user`) | 201 `{ success, payload: { token, user } }` (same shape as login); 400 validation (`fullName` trimmed 1-100; `email` valid, <= 254, stored lower-case; `password` >= 8 chars, <= 72 bytes, a letter and a digit); 409 `{ success, message: "Email already registered" }`; 429 rate limited; 500 |

JWT claims: `id`, `email`, `type`. Everything else returns 404.

| Method, path | Auth | Responses |
| --- | --- | --- |
| `GET /api/health` | none, no rate limit (public; reachable via nginx at `/api/health`) | 200 `{ success: true, payload: { status: "ok" } }` when `SELECT 1` succeeds within 2000 ms; 503 `{ success: false, message: "Database unavailable" }` on DB error, timeout or no probe configured |

Health bodies are fixed; error detail is neither returned nor logged (the log line is a fixed `Health check failed: database unavailable`). Used by the backend container healthcheck.

## Data
Two targets, selected by `DB_SCHEMA`:
- Cloud Foundry database `ico-env`, schema `public` (default): `public.users` (`id` uuid, `full_name`, `email` unique, `password_hash` bcrypt, `type` admin|user, `created_at`) from `migrations/001_create_users.sql`, human-applied, not by the app.
- Local `db` container (database `POSTGRES_DB`, default `deskbooking`), schema `"ico-env"` (`DB_SCHEMA=ico-env`): `users` (same shape), `bookings` (`id` serial PK, `user_name`, `booking_date`, `booking_desk`, `created_at`, `UNIQUE (booking_date, booking_desk)`) and `schema_migrations`, created by `db/migrations/001..003_ico_env_*.sql` on first start of an empty volume (idempotent, no drops). No backend code uses `bookings` yet.

No seed: users are inserted by hand (lower-case email) or through `POST /api/auth/register` (type `user` only; admins are still created by hand).

## Conventions
- Import local modules with the `.ts` extension.
- Parameterised SQL only; secrets only from environment; never log passwords, hashes or bodies.
- Response shape `{ success, payload?, message?, errors? }`.
- Unexpected errors propagate (Express 5) to `errorHandler`.

## Tests
`node:test` + `describe/it`; no DB or network access (fake repository/probe, small `max` for the rate limit, short `healthTimeoutMs`). `server.test.ts` passes dummy `JWT_SECRET`/`DATABASE_URL` (the Pool does not connect until queried). Register tests are in `Backend/tests/register.test.ts` (backend suite: 120 pass, 2 skipped on Windows); fake repositories must implement `create`.

## Decisions and known gaps
- Express 5 `listen` callback also runs on bind errors (port conflict still logs `hello world`).
- `PORT` and empty `CORS_ORIGIN` are not validated; no helmet.
- Rate limit is in-memory, per process, keyed by `req.ip`; no `trust proxy` set. Known gap behind the nginx container (R6): nginx sets no `X-Forwarded-For` and `req.ip` is the proxy, so all clients share one login bucket; left for a separate task. No account lockout.
- Register is public by approval (R1): rate limited, server validation, `type` forced to `user`, 409 reveals registered e-mails (D2). The register limiter shares the nginx single-bucket weakness above. The 201 payload carries a token the frontend discards.
- `/api/health` is unauthenticated by decision (R8); a timed-out probe query is not cancelled, it finishes in the background.
- `npm audit`: high advisory in transitive `body-parser` (via `express`), fix via `npm audit fix`; not addressed in this task.
