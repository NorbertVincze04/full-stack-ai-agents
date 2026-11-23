# Brief - manual-visible-password visible password
Spec: docs/specs/manual-visible-password.md (open only the sections you need that are not here) | Source: manual | Status: specified
Area: frontend | Pipeline scope: n/a
Scope flags (yes only): ui-changes, logic-changes
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: none
Decisions: D1 both register fields (Password, Confirm password) get an eye, independent toggles

## Acceptance criteria
AC1: Login: password hidden on load, eye button with aria-label "Show password"
AC2: Login: click -> type=text, label "Hide password", aria-pressed=true; click again restores
AC3: Register Password: same as AC1-AC2
AC4: Register Confirm password: same, independent of Password
AC5: Buttons are type="button": no submit, no validation messages
AC6: Value, validation errors and request body (password, never confirmPassword) unchanged
AC7: Tab reachable, Enter/Space operable
AC8: Existing specs green; new specs cover AC1-AC6

## Read first
- docs/agents/<agent>.md, docs/context/project.md, docs/context/frontend.md
- API contract: none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| spec | docs/specs/manual-visible-password.md | ready, approved |
| tdd red | docs/runs/manual-visible-password/tdd-frontend.md | red-ready |
| implement | docs/runs/manual-visible-password/implement-frontend.md | done |
| test | tdd-frontend.md, e2e.md | pass (e2e skipped) |
| review | review-code.md, review-ux.md | approved |
