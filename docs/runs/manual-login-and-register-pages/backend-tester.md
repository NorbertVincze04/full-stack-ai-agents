# Backend tester report - manual-login-and-register-pages

Verdict: pass

## Results
- `npm test` (Backend): 122 tests, 120 pass, 0 fail, 2 skipped (SIGTERM/SIGINT on Windows, pre-existing). Baseline was 74; 48 tests added.
- `npm run build` (Backend): OK (exit 0).
- `npm run test:coverage`: script does not exist; no coverage figures.
- No application code changed. No real DB, network tunnel or credentials used (in-memory fake repository, dummy `JWT_SECRET`).

## Tests added
New file `Backend/tests/register.test.ts` (fake repository implementing `findByEmail` and `create`, records `create` arguments; `createError` simulates a pg error).

## Coverage matrix
| Criterion | Tests |
| --- | --- |
| FR3 / AC2 201 success, token + `user` shape | `returns 201 with a verifiable token and the public user`; `accepts boundary values ...`; `ignores confirmPassword and other unknown fields`; `the new account can then log in ...` |
| AC8 no hash/password in response | `does not return the password or the hash anywhere in the response`; `does not echo the submitted password in a 400 response` |
| AC8 bcrypt hash (cost 10), stored hash only | `stores a bcrypt hash of the password, not the plain password` |
| AC8 `type` forced to `user` even if body sends `admin` | `never takes the type from the body (admin is ignored)` (response, JWT claim, `create` args keys, stored row) |
| FR3 e-mail lower-cased, trimmed; name trimmed | `lower-cases and trims the e-mail and trims the full name before storing` |
| D1 validation 400, per rule | fullName: missing, empty, whitespace, >100, number/object/array; email: missing, empty, number/object/array, no `@`, no domain dot, inner whitespace, >254; password: missing, empty, number, <8, no digit, no letter, >72 bytes, >72 bytes multi-byte; all fields at once; empty body; array body; malformed JSON. Each asserts no `findByEmail`/`create` call |
| fullName/email must be strings | `fullName must be a string (number/object/array)`, `email must be a string (number/object/array)` |
| D2 duplicate 409 (pre-check) | `returns 409 from the findByEmail pre-check without inserting`; `a second registration of the same e-mail is rejected with 409` |
| `23505` race -> 409 | `returns 409 when create rejects with the pg unique violation (23505 race)` |
| 500 does not leak | `maps a non-23505 repository failure to a generic 500 without leaking details` |
| AC8 rate limit 429 | `returns 429 after the limit, counting successful sign-ups too`; `also counts invalid requests`; `does not limit the login endpoint` |
| AC9 login `user` object | `returns user { fullName, email, type } next to the token`; `reflects the stored type (admin) and keeps the JWT claims id, email, type`; `never includes id, passwordHash or password in the response`; `keeps 401 for bad credentials and 400 for a missing body, without a user object` (existing `auth.test.ts` still asserts payload keys `token`, `user` and 400/401/429 behaviour) |

AC8 "parameterised SQL" is covered by the existing `health.schema.test.ts` pattern only for the login query; the INSERT in `userRepository.create` (`type` hard-coded `'user'`, `RETURNING` without hash) has no test (see gaps).

## Failures
None.

## Gaps / notes (not defects)
- No test of `userRepository.create` SQL text and parameters (query text, `$1..$3` values, no `password_hash` in `RETURNING`, schema quoting). Out of the requested scope; suggest adding next to the login query test in `health.schema.test.ts`. Severity: low.
- Existing fakes in `auth.test.ts` and `login.acceptance.test.ts` lack `create` and (in `auth.test.ts`) `fullName` on `UserRecord`; tests are not type-checked by `tsc` (build passes), so this is harmless at run time. Severity: low.
- `unconfiguredUserRepository` is not asserted to implement `create` here; not exercised by any request path in the tests.
- Register limiter keyed by `req.ip` with a single bucket behind nginx (known gap R6, documented); not testable at this level.
- The register 201 returns a token the frontend discards (spec open question, behaviour matches D3 and is asserted).
