# Backend tests - manual-backend-login-endpoint

Verdict: pass

## Results
- `npm run build` (Backend/): ok.
- `npm test`: 49 tests, 49 pass, 0 fail (19 existing + 30 new). No coverage script exists (`test:coverage` not available).
- No real database, no network beyond loopback, no waiting on real rate-limit windows; `process.env` is restored after each new test; `console.error` is mocked and restored.

## Tests added
New file `Backend/tests/login.acceptance.test.ts` (fake `UserRepository` / fake `Queryable`, bcrypt cost 4). No application code changed; existing tests untouched.

## Coverage matrix
| AC | Tests |
| --- | --- |
| AC1 | HS256 header and `type` claim; token rejected with another secret; `JWT_EXPIRES_IN=1h` honoured; empty `JWT_EXPIRES_IN` falls back to 8h. Existing `auth.test.ts`: 200, claims, 8h, payload only `token`, email normalised |
| AC2 | no hash or user id in 200/401 bodies; wrong-password and unknown-email bodies identical; case-different password rejected. Existing: same 401 body |
| AC3 | exact `errors[].field` per case (email, password, both); whitespace-only email, `null`, array, string, boolean/number/object values -> 400; malformed JSON -> 400; repository never called |
| AC4 | `JWT_SECRET` unset or empty -> 500, no token, no repository lookup; secret read at request time with no default |
| AC5 | repository SQL uses `$1`, hostile email only in bound values; row mapping excludes extra columns; service passes normalised email as bound value; `console.error` output never contains the password or hash (401 and 500 paths) |
| AC7 | default origin `http://localhost:4200` (not `*`) when unset, also with `NODE_ENV=production`; explicit origin honoured in production; `*` allowed with `NODE_ENV` unset/development/test incl. preflight; never `Access-Control-Allow-Credentials`; `*` + production throws. Existing: default/override/`*`/throws |
| AC8 | existing `auth.test.ts` plus the AC1-AC4 tests above |
| AC11 | 429 body, `Retry-After`, `RateLimit` headers, no legacy `X-RateLimit-*`, no repository call; valid credentials blocked after limit; 400s count; successes not counted; other routes not limited; `LOGIN_RATE_LIMIT_MAX` read from env; invalid values (`abc`, `0`, `-3`, `1.5`, empty) fall back to 10; per-app counters |

## Not covered
- Window expiry / reset of the rate limit (would need fake timers or real waiting); `LOGIN_RATE_LIMIT_WINDOW_MS` parsing is not asserted.
- Real `pg` Pool behaviour and migration execution (no DB by constraint). AC6, AC9 (partly), AC10 are file/doc checks, not tests.

## Failing tests
None.
