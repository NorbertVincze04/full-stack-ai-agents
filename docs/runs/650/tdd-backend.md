# TDD backend - 650 desk numbering (mode red)
Spec: docs/specs/650.md | Brief: docs/runs/650/brief.md | Approved risks: R1, R2 (destructive migration; never executed by agents, no database touched)

## Red baseline
Run: `npm test` in `Backend/`: 308 tests, 289 pass, 17 fail, 2 skipped (Windows signals, pre-existing). All 17 failures are new tests; no compile or setup error.

Tests added in [Backend/tests/desksRenumber.test.ts](../../../Backend/tests/desksRenumber.test.ts) (static SQL checks, no DB; the migration is the first `NNN_*.sql` numbered 006 or higher, so the implementer chooses the name):

| Test (run for `migrations/` and `db/migrations/`) | Status | Reason |
| --- | --- | --- |
| exists as a new file numbered 006+ | fail | no such file yet |
| inserts 16 desks A1..D4, id = label | fail | no such file yet |
| each letter is a 2 x 2 block, A/B above C/D, A left of B | fail | no such file yet |
| numbering A1 A2 / A3 A4 inside a block | fail | no such file yet |
| `UPDATE bookings SET booking_desk = NULL` before `DELETE FROM desks` | fail | no such file yet |
| no DELETE of bookings, no DROP/TRUNCATE, no other UPDATE | fail | no such file yet |
| guarded (second run changes nothing: conditional UPDATE/DELETE) | fail | no such file yet |
| one transaction, `ux_bookings_date_desk` kept | fail | no such file yet |
| `db/migrations` only: records version in `schema_migrations` with `ON CONFLICT (version) DO NOTHING` | fail | no such file yet |

17 = 8 + 8 + 1.

## already-green
- `GET /api/desks with A1..D4`: returns 16 ids A1..D4 in order with id = label; availability shows C3 booked. Pass because the API is repository-driven and the shape is unchanged (fake repository); they guard the contract and AC3 id format (`C3`) on the route layer.
- Existing API/service/repository specs still use `D01`..`D12` with fakes; they pass and are shape-neutral. Not rewritten (the id format is data, not backend logic: `DESK_PATTERN = /^[A-Za-z0-9_-]{1,10}$/` accepts `C3`). Adapting them to A1..D4 is optional cleanup at green.
- `desksMigrations.test.ts` still checks 004/005 (12 desks, no DELETE/UPDATE); these files stay unchanged, so it stays valid.

## deferred-to-green
- Replace stale `D01`..`D12` fixtures in `bookings.api.test.ts`, `desks.api.test.ts`, `deskRepository.test.ts`, `bookingService.test.ts`, `bookingRepository.test.ts` with A1..D4 (AC6), including a `C3` booking round trip (book, list, withdraw).
- Booking without desk (AC4): `listByUser` returning `desk: null` is covered in the existing repository tests; add a check that availability marks no desk taken for a legacy booking once the implementation exists.
- Real execution of the migration (idempotency AC5, bookings survive): needs a database, not allowed for agents (R2); only the static checks above apply. Human verifies after applying with a `pg_dump` backup.

## AC coverage
| AC | Backend tests |
| --- | --- |
| AC1 | `desksRenumber` 16 desks insert (red), API order test (green already) |
| AC2 | 2 x 2 block and numbering tests (red); rendering is frontend |
| AC3 | `C3` availability test; booking round trip deferred-to-green |
| AC4 | UPDATE-to-NULL test (red); listing without desk exists in repository specs |
| AC5 | guard, no booking delete, one transaction (red) |
| AC6 | new tests added; adapting old fixtures deferred-to-green |

## Verdict
red-ready. The target is a new migration in `Backend/migrations/` and `Backend/db/migrations/` (006 or higher).
