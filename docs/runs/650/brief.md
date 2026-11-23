# Brief - 650 desk numbering
Spec: docs/specs/650.md (open only the sections you need that are not here) | Source: azure | Status: specified
Area: frontend, backend (database migration is part of backend; containers: only a new init SQL file in Backend/db/migrations) | Pipeline scope: n/a
Scope flags (yes only): ui-changes, logic-changes, database-changes
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: R1 destructive migration approved as described (UPDATE bookings.booking_desk to NULL, DELETE desks, INSERT 16; backup + human applies + idempotent guard) | R2 human-applied destructive migration approved as described
Decisions: D1 delete and recreate all desks | D2 2x2 blocks per letter | D3 labels only, no headings | D4 missing Azure tag ignored

## Acceptance criteria
AC1: GET /api/desks returns 16 desks A1-D4, ordered
AC2: plan shows 4 blocks of 2x2 desks (one per letter), labels only
AC3: select, book, withdraw, availability work for every desk (e.g. C3)
AC4: pre-change bookings stay listed without desk label, block no desk
AC5: migration deletes no booking, idempotent, second run same result
AC6: existing specs adapted and pass; tests cover 16 desks, labels, 2x2 blocks, booking without desk

## Read first
- docs/agents/<agent>.md, docs/context/project.md, docs/context/backend.md, docs/context/frontend.md
- API contract: docs/specs/650.md section "API / data changes" (shape unchanged: id, label, row, col)

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| task | docs/tasks/650.md | saved |
| spec | docs/specs/650.md | ready (1 clarification round) |
| tdd red | docs/runs/650/tdd-backend.md, tdd-frontend.md | backend red (17 failing), frontend 0 failing |
| implement | docs/runs/650/implement-backend.md, implement-frontend.md | done |
| test | docs/runs/650/tdd-green.md, e2e.md | pass (backend 306/308, frontend 263/263; e2e skipped) |
| review | docs/runs/650/review-code.md, review-ux.md | approved (2 medium carried to PR) |
