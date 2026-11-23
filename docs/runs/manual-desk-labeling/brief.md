# Brief - manual-desk-labeling Desk Labeling
Spec: docs/specs/manual-desk-labeling.md | Source: manual | Status: specified
Area: containers | Pipeline scope: n/a
Scope flags (yes only): database-changes (apply existing 006 only, no new migration)
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: R1 006 deletes desks, bookings lose desk, pg_dump of desks+bookings first | R2 `compose down -v` wipes all local data
Decisions: D1 local container only (localhost:4200); Cloud Foundry stays human-applied; agent applies

## Acceptance criteria
AC1: pg_dump of desks and bookings exists in db-backups/ before the recreate
AC2: local DB after compose down -v / up has exactly A1-D4 (16 rows), no D01..D12
AC3: GET /api/desks returns the same 16 labels with 006 grid positions
AC4: plan at localhost:4200 shows each letter as a 2x2 group
AC5: only the dump is added to the repo; no migration changes; Cloud Foundry untouched

## Read first
- docs/agents/container-engineer.md, docs/context/project.md, docs/context/containers.md
- API contract: none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| spec | docs/specs/manual-desk-labeling.md | ready |
