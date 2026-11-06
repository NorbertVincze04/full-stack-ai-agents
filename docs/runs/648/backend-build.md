# Backend build report - task 648 (booking_calendar)

Verdict: done

## Acceptance criteria -> implementation
| Criterion | How |
| --- | --- |
| FR9 date rules (server date) | `bookingService.book` accepts only `bookableDates(now())` (4 weekdays from today / next weekday, server-local date); else 400 |
| FR10 JWT only | `middleware/authenticate.ts`: Bearer, HS256, `JWT_SECRET`, `id` claim must be a uuid; user id from `res.locals.user`, never from the body; else 401 |
| FR11 own bookings only | repository `DELETE ... WHERE booking_date = $1 AND user_id = $2`; no row -> 404 |
| FR12 duplicate | pg `23505` -> `BookingAlreadyExistsError` -> 409 |
| FR14 FK | pg `23503` -> `UnknownUserError` -> 401, nothing stored |
| FR8 list | `GET /api/bookings/mine`, own rows with `booking_date >= server today`, ascending |
| AC6 no e-mail stored | repository writes `user_id` and `booking_date` only |
| Injectable | `createApp({ authMiddleware, bookingRepository, now })` |

## API contract
| Method, path | Auth | Request | Responses |
| --- | --- | --- | --- |
| `POST /api/bookings` | Bearer JWT | `{ date: "YYYY-MM-DD" }` | 201 `{ success, payload: { booking: { date } } }`; 400 `{ success, message: "Validation failed", errors: [{ field: "date", message }] }`; 401 `{ success, message: "Authentication required" }`; 409 `{ success, message: "Booking already exists" }` |
| `DELETE /api/bookings/:date` | Bearer JWT | none | 200 `{ success: true }`; 400 (bad format); 401; 404 `Booking not found` |
| `GET /api/bookings/mine` | Bearer JWT | none | 200 `{ success, payload: { bookings: [{ date }] } }`; 401 |

Unexpected errors -> 500 `Internal server error` via `errorHandler` (also when the migration is not applied).

## Files created/changed
- Created: `Backend/src/middleware/authenticate.ts`, `repositories/bookingRepository.ts`, `services/bookingDates.ts`, `services/bookingService.ts`, `controllers/bookingController.ts`, `routes/bookingRoutes.ts`.
- Changed: `Backend/src/app.ts` (new options, `/api/bookings` mount), `Backend/src/server.ts` (passes `createBookingRepository(pool, dbSchema)`).
- Context: `docs/context/backend.md`, `docs/context/project.md`.

## Dependencies
None added (`jsonwebtoken` already present).

## Commands
- `npm run build` in `Backend/`: OK.
- `npm test`: 120 pass, 2 skipped (Windows signals), 0 fail (existing suite; no new tests by instruction).
- No migration run, no DB or tunnel access.

## Assumptions and known gaps
- `DELETE /:date` validates the format only (400); a past/weekend/out-of-window date that holds no booking returns 404, and the window is not re-checked.
- A malformed JSON body on `POST` returns 400 before the 401 check (body parser runs first).
- Booking routes are not rate limited (per spec risks).
- Until the migrations are applied by a human, booking calls return 500.
- `bookingRepository.delete` uses `DELETE ... RETURNING id` (not `rowCount`) so a fake `Queryable` only needs `rows`; fakes must return `rows: [{ id }]` for a hit and `[]` for a miss.
- Tests are for Backend Tester: fake repository with `create`/`delete`/`listByUser`, inject `now` for deterministic dates, sign tokens with `JWT_SECRET` and a uuid `id`.
