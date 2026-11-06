# Frontend build: manual-info-page

Status: done

## Acceptance criteria -> implementation
- AC1: `/info` lazy route -> `InfoComponent` with `<h1>How it works</h1>`.
- AC2: `app.component.html` has `<a routerLink="/info">Help</a>` before the Login button inside `.header-actions`.
- AC3: native anchor via `routerLink`; existing `header a:focus-visible` outline kept.
- AC4: `<ol>` with the three exact steps.
- AC5: visible text and accessible name "Help", no `aria-label`; h1 stays "How it works".
- AC6: existing 7 specs unchanged and passing.
- AC7: new specs for heading, steps, and Help link (href, label, position before Login); tests and build pass.

## Files created/changed
- `Frontend/src/app/features/info/info.module.ts`, `info-routing.module.ts`, `info.component.ts`, `info.component.html`, `info.component.css`, `info.component.spec.ts` (created; found already present and verified against spec)
- `Frontend/src/app/app-routing.module.ts` (lazy `info` route; already present, verified)
- `Frontend/src/app/app.component.html`, `app.component.css` (Help link and `.header-actions`; already present, verified)
- `Frontend/src/app/app.component.spec.ts` (added Help link spec)
- `docs/context/frontend.md` (routes, structure, test count, decisions)

## Dependencies added
None.

## Commands run (in `Frontend/`)
- `npm run test:ci`: 10 of 10 SUCCESS
- `npm run build`: success; lazy chunk `info-module` 1.12 kB

## Known gaps
None. Responsive wrapping on narrow viewports was not checked in a browser.
