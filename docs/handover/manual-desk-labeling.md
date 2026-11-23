# Handover - manual-desk-labeling: Desk Labeling

## Implemented
- Containers/database: recreated the local DB volume so migration 006 (desks A1-D4 in 2x2 groups) is applied. Dump of `desks` and `bookings` taken before (`db-backups/202611231200_manual-desk-labeling_desks_bookings.sql`, git-ignored, local only).
- Backend, frontend: no change (the plan is built from `/api/desks` row/col).

## Tools
Podman compose, `pg_dump`, `psql`.

## Dependencies added
None.

## Files changed
- `docs/tasks/manual-desk-labeling.md`, `docs/specs/manual-desk-labeling.md`
- `docs/runs/manual-desk-labeling/` (brief, containerize, metrics, pr)
- `docs/handover/manual-desk-labeling.md`
- `docs/agents/` container-engineer, orchestrator, task-analyst, release-manager (context updates)

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 | Verified | dump file exists, written before `down -v` (containerize.md) |
| AC2 | Verified | 16 rows A1-D4, 0 `D01..D12`, migrations 001-006 (containerize.md) |
| AC3 | Verified | `GET /api/desks` 200, 16 labels with grid positions (containerize.md) |
| AC4 | Verified | human confirmed the plan at localhost:4200 shows A1-D4 in 2x2 groups (manual) |
| AC5 | Verified | no migration or app change; dump git-ignored; Cloud Foundry untouched |

## Open findings
- Local users and bookings were wiped (R2).
- No tests run (no code change).

## Follow-ups
- Apply migration 006 to Cloud Foundry (human, after its own backup).
