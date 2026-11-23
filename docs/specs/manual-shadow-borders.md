# Spec: manual-shadow-borders - Shadow and borders

Task: `docs/tasks/manual-shadow-borders.md` | Status: `specified` | Discovery: used

## Summary
Give the booking page a modern, clean look with consistent borders, rounded corners and soft shadows. CSS only, using global tokens.

## Scope
- Define global design tokens in `Frontend/src/styles.css` (now only `html, body { margin: 0 }`): `--border-color`, `--radius`, `--radius-sm`, `--shadow-sm`, `--shadow-md`.
- Apply them on the booking page `/` to: header, footer, booking top bar, calendar, desk plan (plan container and desk buttons), booking buttons.
- Header and footer are shared components, so they look the same on every page.

## Out of scope
- Auth pages (`/login`, `/register`), `/info` and `/terms` content blocks and forms (Q2: booking page only).
- Colour palette change, layout change, typography, new components, dark mode, animations, new dependencies, backend.
- Existing state semantics of desk buttons (dashed = booked/neutral, colours per state) stay.

## Area
`frontend`

## Scope flags
- `ui-changes`: yes (visual styling of the booking page and shared header/footer)
- `logic-changes`: no
- `security-relevant`: no
- `dependencies-changed`: no
- `database-changes`: no
- `scaffolding-only`: no

## Current state (from the styles)
- Borders exist only on buttons (2px, radius 4px), inputs (1px `#6b7280`), calendar day cells and desk buttons (2px `#1f2937`, radius 3-4px).
- No `box-shadow` anywhere. Header, footer, top bar, calendar frame, plan area, forms and info/terms text have no border, radius or shadow.
- Colours are hard-coded hex values per component; no CSS variables.

## Functional requirements
1. Tokens are defined once in `:root` in `styles.css`: border `1px solid #d1d5db`, radius 8px (cards), 6px (buttons), `--shadow-sm: 0 1px 2px rgba(0,0,0,.08)`, `--shadow-md: 0 4px 12px rgba(0,0,0,.12)`; component CSS uses `var(...)`.
2. Containers on `/` (top bar, calendar, desk plan) get the border, 8px radius and `--shadow-sm`.
3. Header gets a bottom `--shadow-md`; footer a top shadow; no borders on them.
4. Buttons on `/` get the 6px radius and `--shadow-sm`; hover raises to `--shadow-md`; disabled buttons have no shadow or hover change.
5. Desk and calendar day buttons keep their state borders and colours; only the 6px radius and a subtle shadow on selectable states are added.
6. Existing focus outlines are not weakened.
7. Layout does not shift (box-sizing already `border-box`); works at 320 px width and in the stacked layout below 768 px.

## UI behaviour
Static styling only; no interaction change except the hover shadow on buttons.

## API / data changes
None.

## Acceptance criteria
- AC1: `styles.css` defines the tokens (`--border-color`, `--radius`, `--radius-sm`, `--shadow-sm`, `--shadow-md`) on `:root` with the agreed values; booking-page component CSS uses them instead of new hard-coded values.
- AC2: On `/`, the top bar, calendar and desk plan show a 1px `#d1d5db` border, 8px radius and `--shadow-sm`.
- AC3: Header shows a bottom shadow and footer a top shadow separating them from the content.
- AC4: On `/`, buttons are rounded (6px) with `--shadow-sm`; hover on an enabled button shows `--shadow-md`; disabled buttons have no shadow.
- AC5: Desk and calendar day states (neutral, available, booked, selected, yours) remain distinguishable by icon, text and colour as before; focus indicators remain visible.
- AC6: No horizontal scroll at 320 px; the booking layout still stacks below 768 px.
- AC7: `npm run build` and `npm run test:ci` in `Frontend/` pass with no behaviour spec changes.
- AC8: Text contrast of existing content is not reduced (no text or background colour changes beyond borders and shadows).
- AC9: `/login`, `/register`, `/info` and `/terms` content (forms, inputs, content blocks) is not restyled; only the shared header/footer changes appear there.

## Risk gate
none (CSS only, no dependency, data, auth or infrastructure change). Minor: a shadow or border must not lower the contrast of desk states (covered by AC5, AC8).

## Decisions
- D1: Q1 all elements, narrowed by Q2 to the booking page plus shared header/footer; forms and info/terms blocks are not on `/`, so out of scope.
- D2: Q2 booking page only.
- D3: Q3 border 1px solid `#d1d5db`, radius 8px cards, 6px buttons and inputs.
- D4: Q4 subtle shadows (sm and md as above).
- D5: Q5 global tokens in `Frontend/src/styles.css`.
- D6: Q6 shadow increases on button hover.

## Open Questions
None.
