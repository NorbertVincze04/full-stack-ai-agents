---
id: manual-desk-labeling
status: specified
---

# Spec manual-desk-labeling - desk labeling

## Summary
Desks form 2 x 2 groups labelled A1-A4, B1-B4, C1-C4, D1-D4. Task 650 (`docs/specs/650.md`, migration `006_renumber_desks.sql`, `Frontend/.../desk-numbering.spec.ts`) already delivers exactly this: 16 desks, 4 blocks of 2 x 2 (A B / C D), labels row by row in a block (A1 A2 / A3 A4). Defect/verification: the human's manual check shows the old labels D01..D12, so the running database still holds the 005 seed and 006 was not applied to it. No code defect found.

## Investigation (no code changed)
- Labels and grid come only from the `desks` table via `GET /api/desks`; the frontend has no hardcoded `D01`..`D12`.
- 006 exists in both trees (`Backend/migrations/006_renumber_desks.sql` for `public`/Cloud Foundry, `Backend/db/migrations/006_ico_env_desks_renumber.sql` for `"ico-env"`/local container), both guarded (run only while `A1` is missing) with the correct 16 rows.
- Most likely cause (local): `compose.yaml` mounts `Backend/db/migrations` into `/docker-entrypoint-initdb.d`, which runs only on an empty `db-data` volume; a volume created before 006 never gets it.
- Cloud Foundry: 006 is human-applied only (650 R2); `db-backups/` has only a 005 dump, so no evidence it was applied.
- The reported "DO8, DO9" (letter O) is probably a typo; the seed uses `D08`, `D09`.

## Scope
- Target: local container (`localhost:4200`). Container Engineer dumps `desks` and `bookings` to `db-backups/`, then recreates the local stack with `compose down -v` so the init SQL (including 006) runs on an empty `db-data` volume, then verifies.

## Out of scope
- Cloud Foundry (stays human-applied, 650 R2), new desks, headings, layout changes, desk management UI, any new migration.

## Area
`containers` (local environment with a `db-data` volume older than 006); no `frontend` or `backend` work.

## Pipeline scope
n/a

## Scope flags
- `ui-changes`: no.
- `logic-changes`: no.
- `security-relevant`: no.
- `dependencies-changed`: no.
- `database-changes`: yes, operationally only: the existing 006 runs on the recreated local DB; no new migration file.
- `scaffolding-only`: no.

## Functional requirements
- FR1: The local database holds the 16 desks A1..D4 with the 006 grid positions.
- FR2: A `pg_dump` of `desks` and `bookings` exists under `db-backups/` before any change.
- FR3: The local DB is recreated with `compose down -v`; all local data (users, bookings) is lost by approved decision (R2).

## API / data changes
No file change except the new dump in `db-backups/`. Data: local DB recreated from the init SQL.

## Environment
Container Engineer applies 006 on the local container only. Cloud Foundry is not touched.

## UI behaviour
unchanged.

## Acceptance criteria
- AC1: A `pg_dump` of `desks` and `bookings` is stored under `db-backups/` before the recreate.
- AC2: After `compose down -v` and `compose up`, `SELECT id FROM desks ORDER BY id` on the local DB returns exactly A1-D4 (16 rows, no `D01`..`D12`).
- AC3: `GET /api/desks` returns the same 16 labels with the 006 grid positions.
- AC4: The plan at `localhost:4200` shows each letter as a 2 x 2 group (A1 A2 / A3 A4) and no `D01`..`D12`.
- AC5: Only the dump is added to the repository; no migration changes, and Cloud Foundry is untouched.

## Risk gate
- approved-risks: R1, R2 (human approved 2026-11-23).
- R1 (approved): 006 deletes desks and bookings lose their desk, as described; `pg_dump` of `desks` and `bookings` first under `db-backups/` (restore = rollback).
- R2 (approved): `compose down -v` wipes all local data; the human chose it over keeping the volume and accepts the data loss.
- R3: any new fix-up migration is not needed; if requested it is a new risk item (guarded, dump first).

## Decisions
- Q1: target is the local container (`localhost:4200`); Cloud Foundry is out of scope.
- Q2: the Container Engineer applies 006 on the local container (not the human); Cloud Foundry stays human-applied.
- Implementation approved by the human.

## Open Questions
none.
