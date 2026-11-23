# Brief - manual-shadow-borders Shadow and borders
Spec: docs/specs/manual-shadow-borders.md | Source: manual | Status: specified
Area: frontend | Pipeline scope: n/a
Scope flags (yes only): ui-changes
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: none
Decisions: D1 booking page `/` plus shared header/footer | D3 border 1px #d1d5db, radius 8px cards / 6px buttons | D4 shadow-sm 0 1px 2px rgba(0,0,0,.08), shadow-md 0 4px 12px rgba(0,0,0,.12) | D5 global tokens in Frontend/src/styles.css | D6 hover raises shadow

## Acceptance criteria
AC1: tokens --border-color, --radius, --radius-sm, --shadow-sm, --shadow-md on :root; component CSS uses them
AC2: top bar, calendar, desk plan on `/` have 1px border, 8px radius, shadow-sm
AC3: header bottom shadow, footer top shadow
AC4: buttons 6px radius, shadow-sm, hover shadow-md, disabled none
AC5: desk/calendar states stay distinguishable; focus visible
AC6: no horizontal scroll at 320 px; stacks below 768 px
AC7: npm run build and npm run test:ci pass in Frontend/
AC8: text contrast not reduced
AC9: login, register, info, terms content not restyled

## Read first
- docs/agents/implementer.md, docs/context/project.md, docs/context/frontend.md
- API contract: none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| spec | docs/specs/manual-shadow-borders.md | ready |
