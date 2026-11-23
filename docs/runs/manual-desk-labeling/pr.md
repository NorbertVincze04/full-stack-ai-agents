# manual-desk-labeling: Desk Labeling

## Summary
- Containers/database: the local DB volume was missing migration 006, so desks were still D01..D12. The volume was recreated (`compose down -v`, `compose up -d --build`); `Backend/db/migrations` 001-006 ran on the empty volume. Local DB and the plan now show 16 desks A1-D4 in 2x2 groups.
- No application code, migration or compose change. The commit only adds task docs, run reports and agent context updates.
- Cloud Foundry was not touched (human-applied).

## Acceptance criteria
- [x] AC1: `pg_dump` of desks and bookings written to `db-backups/` before the recreate (local, git-ignored).
- [x] AC2: 16 rows A1-D4, no `D01..D12`, `schema_migrations` lists 001-006.
- [x] AC3: `GET /api/desks` returns the 16 labels with 006 grid positions.
- [x] AC4: plan at `localhost:4200` shows each letter as a 2x2 group (human confirmed visually).
- [x] AC5: no migration changes, Cloud Foundry untouched. The dump is git-ignored (`.gitignore` line 10), so it is not in the commit.

## Test results
- tdd / e2e: not run (container/data task, no code change). Verification by the container run: `docs/runs/manual-desk-labeling/containerize.md`.

## Review coverage
No reviewer scope run (no code, container-file or workflow changes).

## Approved risks
- R1: 006 deletes desks, bookings lose their desk; dump of desks and bookings taken first.
- R2: `compose down -v` wipes all local data (users and bookings).
- D1: local container only; Cloud Foundry stays human-applied.

## Migration
None new. Existing `Backend/db/migrations/006` applied by the init on the fresh volume. Cloud Foundry DB must be handled by the human separately.

## Start and verify
```
podman compose up -d --build
```
Open `http://localhost:4200`: plan shows A1-D4 in four 2x2 groups. `GET http://localhost:4200/api/desks` returns 16 desks. Stop with `podman compose down` (no `-v`).

## Settings to configure
None.

## Open findings
- Local users and bookings were wiped (R2); the dump holds the old desks and bookings only, not users.
- The backup is local only (git-ignored); keep it outside the repo or force-add by human decision.
