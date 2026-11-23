# Implement frontend - manual-shadow-borders

Verdict: done. CSS only; no API, markup, spec or dependency change.

## Acceptance criteria -> implementation
- AC1: tokens `--border-color`, `--radius`, `--radius-sm`, `--shadow-sm`, `--shadow-md` on `:root` in `styles.css`; component CSS uses them.
- AC2: `.top-bar`, `.calendar`, `.desk-plan` get `1px solid var(--border-color)`, `var(--radius)`, `var(--shadow-sm)`.
- AC3: `header` `box-shadow: var(--shadow-md)`; `footer` upward shadow `0 -4px 12px rgba(0,0,0,.12)`; no borders.
- AC4: `.book-button`, `.nav-button`, header buttons use `var(--radius-sm)`; book and nav buttons `shadow-sm`, hover `shadow-md`; disabled book button `box-shadow: none`.
- AC5/AC8: state colours, borders, focus outlines and text colours untouched.
- AC6: no width changes; stacking container query unchanged.
- AC9: auth, info, terms CSS untouched (only the shared header button radius changed).

## Files changed
- Frontend/src/styles.css
- Frontend/src/app/app.component.css
- Frontend/src/app/features/booking/booking.component.css
- Frontend/src/app/features/booking/calendar/calendar.component.css
- Frontend/src/app/features/booking/desk-plan/desk-plan.component.css
- docs/agents/implementer.md

## Commands
- `npm run build` in Frontend/: pass.
- `npm run test:ci` in Frontend/: pass (exit 0), including the 12 former red specs.

## Known gaps
- Hover and focus ring are not covered by specs (manual/review).
