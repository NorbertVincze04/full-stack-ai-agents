# Backend test report - task 648 (booking_calendar)

Verdict: pass

## Result
`npm test` in `Backend/`: 218 tests, 216 pass, 0 fail, 2 skipped (POSIX signals on Windows, pre-existing). Was 122 before (96 new). No coverage script exists, so none was run. No DB, tunnel or migration used; `npx tsc --noEmit` clean.

## Tests added (all under `Backend/tests/`)
| File | Level | Focus |
| --- | --- | --- |
| `bookingDates.test.ts` | unit | `bookableDates` (Fri/Mon/Sat/Sun start, month/year rollover, time of day, never a weekend), `isValidDateString`, `toDateString` |
| `bookingService.test.ts` | unit | injected `now` and fake repository: window checks, pg `23505` -> 409 error, `23503` -> unknown user, other errors rethrown, withdraw hit/miss, list from server date |
| `authenticate.test.ts` | unit | valid token -> `res.locals.user`; 401 for missing/empty/wrong scheme/garbage/wrong secret/expired/`alg none`/HS512/missing, non-uuid or non-string `id`; throws without `JWT_SECRET` |
| `bookingRepository.test.ts` | unit | fake `Queryable`: parameterised SQL, `user_id` + date only (no e-mail), delete `WHERE date AND user_id`, schema-aware table, invalid schema rejected |
| `bookings.api.test.ts` | HTTP | in-memory repository with unique/FK semantics, fixed clock (Fri 2026-11-06), real JWT middleware plus an injected one |

## Criteria coverage
| Criterion | Covered by |
| --- | --- |
| FR2 / FR9 (date rules, server date) | `bookingDates`, `bookingService`, API 201 (today, last window day) and 400 (past, Sat, Sun, after window, bad format/type, impossible date) |
| FR10 (JWT only, 401) | `authenticate`; API 401 matrix on all 3 endpoints x 6 token cases; body `userId`/`email` ignored; injected auth |
| FR11 (own booking only, 404) | repository SQL; API: deletes only caller's row, other user's date -> 404 and row kept, repeat withdraw -> 404 |
| FR12 (409 duplicate, shared dates) | service mapping; API 409 same user, 201 for two users same date |
| FR14 (FK -> 401) | service mapping; API 401 and nothing stored |
| FR8 / AC7 (list, several dates) | API `GET /mine`: own only, ascending, past excluded, empty list, only `date` key |
| AC1, AC5, AC6 | API book, withdraw leaves other dates/users untouched, no e-mail stored |
| 500 handling | API: unexpected repository error -> generic `Internal server error` |

## Failures
None.

## Notes (not defects)
- `DELETE /:date` validates format only, as documented in the build report; a past/weekend date with no booking returns 404.
- Booking routes are not rate limited (per spec).
- The repository's real SQL (`to_char`, constraints, `RETURNING`) is only checked against a fake; it needs a manual check after a human applies migrations `002` / `004`.
