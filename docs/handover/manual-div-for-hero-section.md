# Handover - manual-div-for-hero-section: div for hero section

## Implemented
- Frontend: `Frontend/src/app/features/booking/booking.component.css` only. `.layout-calendar` and `.layout-plan` are `flex: 1 1 0` in a non-wrapping `.booking-layout` (50/50, gap excluded). `:host` is `display: block; container-type: inline-size`; `@container (max-width: 767.98px)` stacks the divs (column, calendar first, 100% wide).
- Tests: `booking.component.hero-layout.spec.ts` (7 specs: equal widths, row fill, order, nesting, 320 px stack, 767/768 px breakpoint).
- Backend, database, containers, pipelines: not touched.

## Tools and technologies
Angular 18 component CSS, CSS container queries (Chrome/Edge 105+, Safari 16+, Firefox 110+), Karma/Jasmine in headless Chrome.

## Dependencies added
None.

## Files changed
- Frontend/src/app/features/booking/booking.component.css
- Frontend/src/app/features/booking/booking.component.hero-layout.spec.ts (new)
- docs/context/frontend.md, docs/agents/{implementer,orchestrator,reviewer,task-analyst,tester,release-manager}.md
- docs/tasks, docs/specs, docs/runs/manual-div-for-hero-section/, this handover

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 | Verified | hero-layout specs; human check in a real browser |
| AC2 | Verified | nesting spec; markup unchanged |
| AC3 | Verified | 320/767/768 px specs; human check in a real browser |
| AC4 | Verified | existing booking specs pass (295/295) |
| AC5 | Verified | `npm run test:ci` 295/295, `npm run build` complete |

## Open findings
4 low (see `pr.md`); e2e skipped (no runner).

## Follow-ups
- Add a one-line comment on the container-query choice.
- Check visually at 768 px (desk text size, calendar gap).
- Add an e2e runner and journeys J1-J3 (needs an approved spec).
