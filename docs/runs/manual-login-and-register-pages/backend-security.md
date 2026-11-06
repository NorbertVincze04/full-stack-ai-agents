# Backend security report - manual-login-and-register-pages

Verdict: approved

Findings: blocker 0, high 0, medium 2, low 5.

Scope: `Backend/src/app.ts`, `routes/authRoutes.ts`, `controllers/authController.ts`, `services/authService.ts`, `repositories/userRepository.ts`, `middleware/registerRateLimit.ts`, `middleware/loginRateLimit.ts`, `middleware/errorHandler.ts`, `server.ts`, `compose.yaml`, `Frontend/nginx.conf` (proxy headers only), `Backend/.env.example`, `Backend/tests/register.test.ts` (as evidence). Read-only: no source or lock file changed. No secret values were read or printed.

Approved risks (not counted as findings): R1 public register endpoint with 409 enumeration (D2), R3 `payload.user` on login (additive).

## Checks with no finding
| Area | Result |
| --- | --- |
| SQL injection | `userRepository` uses `$1..$3` placeholders for all user values. The only interpolated part is the table name, built from `parseDbSchema` (`^[A-Za-z0-9_-]+$`, validated at startup and again in `usersTable`) and double-quoted. |
| Mass assignment / type escalation | The controller reads only `fullName`, `email`, `password`. `type` is the SQL literal `'user'` in the INSERT, never a parameter. `RETURNING` lists id, email, type, full_name (no hash). Tests cover `type: "admin"` in the body. |
| Password handling | bcryptjs cost 10, hash only stored. Max 72 bytes is enforced (no silent bcrypt truncation), min 8, letter + digit. The password and hash are not in any response (including 400/409/500) or log. |
| Input validation (register) | `fullName`/`email`/`password` must be strings (arrays/objects/numbers give 400); length caps are applied before the email regex runs (<= 254 chars), so the regex cannot be used for ReDoS. Non-object and array bodies give 400. `express.json()` default 100 kB limit applies. |
| Logging | `errorHandler` logs `err.message` only; no `console` call touches the body, password or hash. Unhandled pg errors are reduced to a generic 500. |
| Auth / JWT | HS256 with an explicit `algorithm`, no hard-coded secret fallback, startup exits if `JWT_SECRET` is missing, claims limited to `id`, `email`, `type`, expiry from `JWT_EXPIRES_IN` (default 8h). Login still compares against a dummy hash for unknown users (timing), uniform 401 message. |
| Race handling | pg `23505` from `create` is mapped to 409; other errors propagate to the generic 500. |
| Rate limiting | Register limiter counts every request (10 / 1 h / IP); login limiter counts failed attempts only. Both return fixed 429 bodies. |
| CORS / secrets | `CORS_ORIGIN=*` is refused in production; no credentials. Compose requires `JWT_SECRET` and DB credentials from `.env` (`:?`), `.env.example` has an empty `JWT_SECRET`. |
| Error leakage | Fixed 400/401/409/429/500 messages, no stack traces or SQL in responses. |
| `child_process` | Not used. |

## Medium

### M1 - Shared rate-limit bucket makes register (and login) lockable by one client
- Where: `Backend/src/middleware/registerRateLimit.ts` (keyed by `req.ip`), `Frontend/nginx.conf` (`proxy_set_header X-Forwarded-For ""`), `Backend/src/app.ts` (no `trust proxy`).
- Risk: in the compose stack every request reaches the backend from the nginx container, so all clients share one bucket. One client sending 10 `POST /api/auth/register` requests (invalid ones count too) blocks registration for everyone for an hour. The same applies to login: 10 failed logins block all logins for 15 minutes. The new register limiter widens the known gap R6 with a longer lockout window (1 h). Availability impact only, the frontend port is bound to `127.0.0.1`.
- Fix: make nginx send the real client address (`proxy_set_header X-Forwarded-For $remote_addr;`) and set `app.set("trust proxy", <hop count or nginx subnet>)` in `createApp`, so the limiter keys per client. Needs a containers/backend task; documented as R6.

### M2 - Dependency advisory: `body-parser` 2.0.0 - 2.3.0 (npm: high)
- Package: `body-parser` (transitive via `express`), GHSA-27r3-jxmh-p828, denial of service through trailing bytes after a compressed request body. Reachable on all JSON routes, including the public `POST /api/auth/register`.
- Rating: npm `high` is reported as `medium` per policy (not blocking).
- Fix: `npm audit fix` in `Backend/` (a human runs it; this agent does not modify lock files). Also `express-rate-limit` 8.7.2 -> 8.7.3 (patch) is available. No dependency was added by this task. `npm outdated` shows only dev-tooling majors (`typescript`, `@types/node`, `dotenv`), no security relevance.

## Low

### L1 - No strength check on `JWT_SECRET`
- Where: `Backend/src/server.ts` (only checks that it is set).
- Risk: a short or guessable HS256 secret allows token forgery, including `type: "admin"` claims. Not exploitable today (no endpoint verifies tokens yet), but it matters once protected routes exist.
- Fix: fail fast when the secret is shorter than 32 characters, and document generating it with a CSPRNG.

### L2 - Login accepts unbounded `email` and `password` lengths
- Where: `validateLoginBody` in `Backend/src/controllers/authController.ts`.
- Risk: register caps lengths, login does not. Up to the 100 kB JSON limit can be sent to a DB query parameter and to bcrypt (which truncates at 72 bytes, so the CPU cost is bounded). Minor resource use only, still rate limited.
- Fix: reuse the register caps (email <= 254, password <= 72 bytes) on login and return the generic 401/400 instead of querying.

### L3 - Register response issues a token that nobody uses
- Where: `register` in `Backend/src/services/authService.ts` (`signToken`), `docs/specs/manual-login-and-register-pages.md` open question.
- Risk: a valid 8h bearer token is created and sent for each sign-up, although the frontend discards it and D5 says no auto sign-in. It increases the exposure of a credential for no benefit (logs of responses, proxies, browser tools).
- Fix: omit `token` from the register response when the contract allows it (D3 would need a human amendment), otherwise keep as accepted.

### L4 - `fullName` is stored without character restrictions
- Where: `validateRegisterBody` in `Backend/src/controllers/authController.ts`.
- Risk: only trim and length are checked, so markup or control characters can be stored and later shown in the header. The API returns JSON and the spec requires Angular interpolation (no `innerHTML`), so there is no XSS today; it becomes a risk if a future consumer (e-mail, admin tooling, CSV export) renders it unescaped.
- Fix: optionally reject control characters (`\p{Cc}`), and keep escaping on output.

### L5 - `userRepository.create` SQL has no test
- Where: `Backend/tests/` (no assertion on the INSERT text or parameters; also reported by the tester).
- Risk: a future edit could turn the `type` literal into a parameter or add `password_hash` to `RETURNING` without failing a test.
- Fix: add a test next to the login query test in `health.schema.test.ts`: query text contains `'user'` literal, values are `[fullName, email, passwordHash]`, `RETURNING` has no `password_hash`, schema quoting.

## Accepted / informational (no action required)
- R1: 409 "Email already registered" reveals registered e-mails. The `findByEmail` pre-check also skips the bcrypt hash, so response time differs between existing and new e-mails; this is covered by the D2 acceptance of enumeration. Rate limiting (see M1) is the only mitigation.
- R3: `payload.user` returns fullName, email and type of the authenticated user only (never id or hash); no other user's data is exposed.
- No account lockout, password-breach or common-password check, and no e-mail verification (all out of scope in the spec).
- No `helmet`/security headers on the backend (already listed as a known gap in `docs/context/backend.md`).

## Commands run (read-only)
- `npm audit --omit=dev` in `Backend/`: 1 high (`body-parser`), see M2.
- `npm outdated` in `Backend/`: `express-rate-limit` patch, others dev tooling majors.
