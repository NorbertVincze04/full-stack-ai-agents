# Brief - manual-div-for-hero-section Split hero section into two divs
Spec: docs/specs/manual-div-for-hero-section.md | Source: manual | Status: specified
Area: frontend | Pipeline scope: n/a
Scope flags (yes only): ui-changes
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: none
Decisions: A1 hero = `.booking-layout`; A2 reuse `.layout-calendar` / `.layout-plan`, mostly CSS; A3 stack below 768px; A4 inner markup unchanged

## Acceptance criteria
AC1: wide viewport: calendar div and desk plan div equal width (50/50, gap excluded), calendar left, desks right
AC2: `app-calendar` in `.layout-calendar`, `app-desk-plan` in `.layout-plan`, both inside `.booking-layout`
AC3: narrow viewport: divs stack vertically, calendar first, no horizontal scroll
AC4: behaviour unchanged, existing booking specs pass
AC5: `npm run build` and `npm test` in `Frontend/` pass

## Read first
- docs/agents/implementer.md, docs/context/project.md, docs/context/frontend.md
- API contract: none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| spec | docs/specs/manual-div-for-hero-section.md | ready |
