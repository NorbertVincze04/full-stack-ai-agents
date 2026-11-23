# Handover - manual-shadow-borders: Shadow and borders

## Implemented
- Frontend (CSS only): tokens on `:root` in `Frontend/src/styles.css`; borders, radius and `shadow-sm` on `.top-bar`, `.calendar`, `.desk-plan`; header `shadow-md`, footer upward shadow; buttons 6px radius, `shadow-sm`, hover `shadow-md`, disabled book button no shadow.
- Backend / database: none.

## Tools and technologies
Angular, plain CSS custom properties, Karma/Jasmine computed-style specs.

## Dependencies added
None.

## Files changed
- Frontend/src/styles.css
- Frontend/src/app/app.component.css
- Frontend/src/app/features/booking/booking.component.css
- Frontend/src/app/features/booking/calendar/calendar.component.css
- Frontend/src/app/features/booking/desk-plan/desk-plan.component.css
- Frontend/src/app/features/booking/booking.component.shadow-borders.spec.ts (new)
- docs: task, spec, run reports, this handover, discovery, agent context files

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 | Verified | 5 token specs, 310/310 |
| AC2 | Verified | 3 computed-style specs |
| AC3 | Partially | header/footer specs pass; header shadow visibility under the top bar not seen in a browser |
| AC4 | Verified | specs; hover confirmed by human |
| AC5 | Verified | human, manual |
| AC6 | Verified | spec at 320 px; human, manual |
| AC7 | Verified | build and `test:ci` pass |
| AC8 | Verified | human, manual |
| AC9 | Verified | human, manual; review |

## Open findings
- medium: header shadow possibly hidden by `.top-bar`; `.calendar`/`.desk-plan` horizontal-only padding touches the new border.
- low: footer shadow literal; 4px radius on `.desk`/`.day`/`.legend-swatch`; `.nav-button:hover` without `:not(:disabled)`; hover/focus not in specs.

## Follow-ups
Fix the two medium findings; add an e2e runner for hover and focus checks.
