# Container report - manual-desk-labeling

Mode: verify + recreate (local DB volume), runtime: podman (`.github/config.json`). Approved risks: R1, R2. Cloud Foundry not touched, no branch created, no migration or app file changed.

## Steps
1. Dump of `"ico-env".desks` and `"ico-env".bookings` (`pg_dump -t`, run inside the `db` container) to `db-backups/202611231200_manual-desk-labeling_desks_bookings.sql` (about 10 KB, contains COPY blocks for both tables).
2. `podman compose down -v` (R2): containers, network and volume `deskbooking_db-data` removed.
3. `podman compose up -d --build` (proxy for that command only): db, backend and frontend healthy. The empty volume ran `Backend/db/migrations` (001-006) from `/docker-entrypoint-initdb.d`.

## Results
| AC | Verdict | Evidence |
| --- | --- | --- |
| AC1 | pass | Dump file exists, written before `down -v`. |
| AC2 | pass | `"ico-env".desks`: 16 rows A1,A2,A3,A4,B1..B4,C1..C4,D1..D4; 0 rows matching `^D[01][0-9]$`; `schema_migrations` lists 001-006. |
| AC3 | pass | `GET http://localhost:4200/api/desks` 200 (through nginx): 16 labels with row/col A1(1,1) A2(1,2) / A3(2,1) A4(2,2), B cols 3-4 rows 1-2, C rows 3-4 cols 1-2, D rows 3-4 cols 3-4. |
| AC4 | pass (data-level) | Plan is built only from `/api/desks` row/col, so each letter forms a 2x2 block; served bundle `main-*.js` contains no `D01` or `D12`. No browser rendering was done by the agent; a visual check at `localhost:4200` is advisable. |
| AC5 | pass with note | `git status`: no change besides unrelated task files (`docs/...`). The dump is not shown in `git status` because `/db-backups/` is git-ignored (`.gitignore` line 10), so it is not "added to the repository"; it stays local. The human decides whether to force-add it. |

## Notes
- Local users and bookings were wiped (R2); the dump holds the old desks and bookings (not users).
- The frontend was rebuilt/restarted by `up`; no recreate-order problem with nginx.
- Required app changes: none. Actions awaiting approval: none.

## Stack
Start `podman compose up -d --build`, stop `podman compose down` (no `-v`). URL `http://localhost:4200`.
