# Spec: manual-create-a-mockup-office-for-booking - Mockup office for booking

Task: `docs/tasks/manual-create-a-mockup-office-for-booking.md`

Status: in-progress (backend implemented; R1-R4 approved as described by the human). Round 2 answers merged.

## Summary
Add a live office floor plan (one floor, 12 desks in a 4 x 3 grid) beside the calendar on the existing booking page `/`. Desks live in a new `desks` table (seeded with 12 rows); availability and desk booking come from the bookings backend.

## Scope
- Floor plan component on `/` (BookingModule), beside the calendar (side by side on wide viewports, stacked on narrow).
- `desks` table (`D01`..`D12`, label, grid row/column), seeded with 12 desks in a 4 x 3 grid.
- Plan (layout) visible to everyone; availability for the selected date and booking need login.
- Availability shows who booked each desk (display name only, logged-in users only).
- Selecting a free desk and pressing `Book Now` books that desk on that date; `Withdraw booking` frees it.
- Backend: desks and availability endpoints, desk required on booking create, desk in own bookings, migration for the `desks` table, the desk column and the unique index.
- Specs/tests in both areas; update `docs/context/frontend.md` and `docs/context/backend.md` at build end.

## Out of scope
- Several floors/rooms, floor selector, admin editing of desks or layout (no write endpoints for desks), drag and drop.
- Showing e-mail, user ids or any user data other than the display name.
- Changes to auth, login/register, containers or pipelines; new dependencies.
- Backfilling or assigning desks to legacy bookings.

## Area
`frontend` + `backend` (database changes are part of `backend`).
- `frontend`: plan component, selection state, `BookingService`/desk service calls, layout of `/`.
- `backend`: desks and bookings layers; migration files in `Backend/migrations/` (Cloud Foundry, `public`) and `Backend/db/migrations/` (local container, `"ico-env"`). Applying them to existing volumes and to the Cloud Foundry database is done by a human.
- `containers`, `pipelines`: no change (the local container applies `db/migrations` only on an empty volume).

## Scope flags
| Flag | Value | Reason |
| --- | --- | --- |
| ui-changes | yes | Plan beside the calendar, desk selection, new layout of `/` |
| logic-changes | yes | Desk selection state, desk-aware book/withdraw, availability per date, one booking per desk and date |
| security-relevant | yes | New endpoints exposing booking state and booker names; booking API contract change; user id still only from the token |
| dependencies-changed | no | Plain Angular/CSS and existing backend packages |
| database-changes | yes | New `desks` table with seed, desk column with FK and partial unique index on `bookings` |
| scaffolding-only | no | Adds visible behaviour |

## Functional requirements
1. `desks` table: `id` varchar PK (`D01`..`D12`), `label`, `grid_row`, `grid_col`; seeded with 12 rows (rows 1-3, columns 1-4); seed is insert-only and idempotent.
2. `GET /api/desks` (public, no token): returns the 12 desks (`id`, `label`, `row`, `col`) ordered by position; no booking or user data.
3. `GET /api/desks/availability?date=YYYY-MM-DD` (Bearer JWT required): returns every desk with `booked` true/false and, when booked, `bookedBy` (the booker's `full_name` only); date validated like booking dates (format 400; window rule as for booking). No user ids, e-mails or other fields.
4. `POST /api/bookings` accepts `{ date, desk }`; `desk` is required and must exist in `desks` (missing or unknown -> 400); a desk already booked on that date -> 409; existing rules (window, weekend, one booking per user and date) unchanged.
5. `GET /api/bookings/mine` also returns the desk of each booking (`null` for legacy bookings); `DELETE /api/bookings/:date` unchanged (by date and user).
6. Database: nullable `booking_desk` referencing `desks(id)` (added where missing); partial unique index on `(booking_date, booking_desk) WHERE booking_desk IS NOT NULL`; no backfill, no drops. Legacy bookings (desk null) stay valid and occupy no desk.
7. Frontend: the plan loads from `GET /api/desks` and is a 4 x 3 grid of buttons; states `available`, `booked`, `selected`, `yours`; changing the date reloads availability.
8. Signed-out users see the desks without state (neutral, not selectable) plus a hint to log in; signed-in users see states and the booker's display name on booked desks.
9. Each desk conveys its state by text/icon as well as colour and has an accessible name (for example "Desk D03, available" / "Desk D04, booked by Ana"); a legend lists the states; booked desks and (signed out) all desks are `disabled` + `aria-disabled`; the selected desk uses `aria-pressed`.
10. Calendar and plan side by side on wide viewports, stacked on narrow ones; no horizontal page scroll at 320 px.
11. Availability errors show a generic message in the existing `aria-live` message area; 401 follows the existing behaviour (logout + `You must log in first`); layout load errors show a generic message.
12. NgModule convention: the plan is a component declared in `BookingModule`; plain CSS; booker names are rendered as text only (no HTML binding).

## API / data changes
| Change | Detail |
| --- | --- |
| New | `GET /api/desks` -> 200 `{ success, payload: { desks: [{ id, label, row, col }] } }` (public) |
| New | `GET /api/desks/availability?date=` -> 200 `{ success, payload: { desks: [{ id, booked, bookedBy? }] } }`; 400 bad/out-of-window date; 401 |
| Changed | `POST /api/bookings` body gains required `desk`; 400 missing/unknown desk; 409 desk or user already booked that date |
| Changed | `GET /api/bookings/mine` items gain `desk` (null for legacy bookings) |
| Data | New `desks` table + 12 seed rows; `bookings.booking_desk` nullable FK to `desks(id)` + partial unique index. Local container: idempotent migration (column exists, `004` dropped the old unique). Cloud Foundry: migration also adds the column; applied by a human only |

## UI behaviour
- Initial state: first bookable date selected, no desk selected, plan loaded for everyone; availability loaded when signed in.
- Signed out: desks shown without state; `Book Now` shows `You must log in first`.
- Select date -> availability reloads and the desk selection resets; select a free desk -> highlighted; `Book Now` books `(date, desk)` and the desk shows as yours; `Withdraw booking` frees it.
- `Book Now` without a selected desk shows a message asking to select a desk.
- Existing calendar rules (4 bookable weekdays, disabled days) are unchanged.

## Acceptance criteria
- [ ] AC1: `/` shows the calendar and a plan with exactly 12 desks from `GET /api/desks` in a 4 x 3 grid, side by side on wide viewports and stacked at narrow widths; signed-out users see the plan without desk states.
- [ ] AC2: Signed in, the plan marks each desk available or booked for the selected date according to `GET /api/desks/availability`, with the booker's display name on booked desks; changing the date reloads it.
- [ ] AC3: Each desk shows its label and its state as text or icon besides colour, has an accessible name with label and state, and a legend lists the states.
- [ ] AC4: Selecting a free desk and pressing `Book Now` calls `POST /api/bookings` with `{ date, desk }`; on success the desk shows as yours and the button reads `Withdraw booking`; without a selected desk no request is sent.
- [ ] AC5: Booked desks cannot be selected; a 409 on booking shows an error message and refreshes availability.
- [ ] AC6: Backend: `GET /api/desks` (no token) returns the 12 desks with no booking or user data; `GET /api/desks/availability` returns the 12 desks with `booked` and `bookedBy` (display name only), 401 without a valid token, 400 for an invalid date; the response contains no user id or e-mail.
- [ ] AC7: Backend: `POST /api/bookings` rejects a missing or unknown desk with 400 and a desk already booked on that date with 409; the user id comes only from the token; legacy bookings without desk stay valid, are returned with `desk: null` and occupy no desk.
- [ ] AC8: Existing behaviour is unchanged: `/info`, `/login`, `/register`, the header, date booking rules and withdrawing by date work, and the existing frontend and backend specs (adapted only for the new required `desk`) still pass.
- [ ] AC9: The migrations are idempotent, drop nothing, rewrite no existing rows and the seed only inserts (review of the SQL; applied only to the local `db` container, and only if approved).
- [ ] AC10: New specs/tests cover AC1-AC7; `npm run test:ci` and `npm run build` in `Frontend/`, and `npm test` and `npm run build` in `Backend/` pass.

## Risk gate
- R1 (Major functionality): the existing `/` page changes layout and booking becomes desk-aware (`Book Now` needs a desk), altering the existing booking flow. Safer alternative: keep `desk` optional so date-only booking keeps working, or ship the plan read-only first.
- R2 (Major functionality / Security): `POST /api/bookings` (required `desk`) and `GET /api/bookings/mine` change their API contract, which breaks existing clients; two new endpoints are added (one public). Safer alternative: `desk` optional (old clients keep working); public endpoint returns layout only, availability requires a Bearer token.
- R3 (Database): new `desks` table with seed data, `booking_desk` added on the Cloud Foundry `public.bookings` (table with data) with an FK to `desks(id)` and a unique index on `(booking_date, booking_desk)`. Safer alternative: nullable column, partial index `WHERE booking_desk IS NOT NULL` (existing rows unaffected), insert-only idempotent seed (`ON CONFLICT DO NOTHING`), no backfill, `pg_dump` first, applied by a human to Cloud Foundry; agents apply it only to the local container.
- R4 (Security: personal data): availability exposes who booked each desk (display name) to logged-in users, which is personal data of other employees. Safer alternative: return only `booked` true/false and show the name only on the user's own desk ("yours"); or, if names are kept, only to logged-in users and only `full_name` (no id or e-mail), never on the public endpoint, rendered as text.

## Decisions
- Mockup = working page (human).
- Office = one floor, 12 desks, 4 x 3 grid (human).
- Fully live with a `desks` table, not the static layout; new migration, 12 desks seeded in a 4 x 3 grid (human, round 2, Q1).
- Plan visible to all; availability and booking need login (human, round 2, Q2); implemented as a public layout endpoint and an authenticated availability endpoint.
- Availability shows who booked (human, round 2, Q3); recorded as R4 with display name only, logged-in users only.
- Desk required for new bookings; legacy bookings stay valid and occupy no desk (human, round 2, Q4).
- Revised AC1-AC10 accepted and updated to match these answers (human, round 2, Q5).
- Location "beside the calendar" = the booking page `/` (interpreted from the Frontend).

## Open Questions
None.
