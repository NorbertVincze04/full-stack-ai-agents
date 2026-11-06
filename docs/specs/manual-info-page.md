# Spec: manual-info-page - Info page

Task: `docs/tasks/manual-info-page.md`

## Summary
Add a static `/info` page with the heading "How it works" and three short steps, and a header link labelled "Help" to it, placed to the left of the Login button. Frontend tests must be run and pass.

## Scope
- New routed page at `/info` (static content, no data, no API calls).
- New "Help" link in the app header, to the left of the placeholder Login button.
- Specs for the page and the header link; run `npm run test:ci` in `Frontend/`.
- Update `docs/context/frontend.md` (routes, structure, test count) at build end.

## Out of scope
- Real login, authentication, guards, any backend/API/database change.
- A 404 route, i18n, new dependencies, redesign of header/footer.
- Changing the existing `/` route or the app-name link behaviour.

## Area
`frontend` - the page is static; no API, backend or database change is needed.

## Scope flags
| Flag | Value | Reason |
| --- | --- | --- |
| ui-changes | yes | New route, template, styles, header link |
| logic-changes | no | Static content and a link; no application logic |
| security-relevant | no | No input, auth, storage or personal data; plain internal `routerLink` |
| dependencies-changed | no | Uses `@angular/router` already installed |
| database-changes | no | None |
| scaffolding-only | no | Adds visible behaviour (route + link) |

## Functional requirements
1. Route `/info` renders a component showing an `<h1>` with the exact text "How it works".
2. Below the heading, three short steps are shown as an ordered list (`<ol>` with three `<li>`), with exactly this text, in this order:
   1. "Log in with your work account."
   2. "Select a date and a desk."
   3. "Receive confirmation and manage your bookings."
3. The header contains a link to `/info` placed to the left of the Login button, with the visible text "Help" (its accessible name is therefore "Help"; do not add an `aria-label` that differs from the visible text). The page heading stays "How it works". It uses `routerLink="/info"` (client-side navigation, no full reload).
4. The link is keyboard accessible (native `<a href>` via `routerLink`, reachable by Tab, activated with Enter) and has a visible focus style.
5. The page renders inside the existing `<main><router-outlet/></main>`; header and footer stay unchanged otherwise.

## API / data changes
None.

## Frontend design (implementation guidance)
- Follow the NgModule convention (one module per feature, `features/` for routed pages): create `src/app/features/info/` with `InfoModule`, `InfoRoutingModule` (child route `''`) and `InfoComponent` (selector prefix `app`, plain CSS).
- Register in `app-routing.module.ts` as a lazy route: `{ path: 'info', loadChildren: () => import('./features/info/info.module').then(m => m.InfoModule) }`. Declaring the component directly in `AppModule` is an acceptable simpler alternative; builder chooses, but must keep the route `/info`.
- Header: `app.component.html` currently has `<h1>` and `<button>` as the two flex children (`justify-content: space-between`). Wrap the link and the Login button in one container (for example `<div class="header-actions">` or `<nav aria-label="Main">`) so they sit together on the right; add a small gap.
- Link styling in `app.component.css`: the existing `header a` rule (inherit colour, no underline) and `header a:focus-visible` (2px white outline, 2px offset) already apply to any anchor in the header, so the focus style is satisfied; keep minimum 44px target height consistent with the Login button. Do not remove the focus outline.
- Page styles: readable content width and padding inside `main`; contrast must meet WCAG AA on a white background.

## UI behaviour
- Header (left to right): app name link to `/`, then on the right the "Help" link followed by the Login button (link left of Login).
- Clicking the link navigates to `/info` without reload; heading and three steps are visible; browser back returns to the previous page.
- Narrow viewports: header content wraps or shrinks without horizontal scroll.

## Acceptance criteria
- [ ] AC1: Route `/info` shows the heading "How it works" (`<h1>`).
- [ ] AC2: The header contains a link whose `href` resolves to `/info`, placed to the left of the Login button (DOM order: link before button).
- [ ] AC3: The link is keyboard accessible (focusable via Tab, activated with Enter) and has a visible focus style (`:focus-visible` outline).
- [ ] AC4: The `/info` page shows exactly three steps as an ordered list with the text "Log in with your work account.", "Select a date and a desk.", "Receive confirmation and manage your bookings." in that order.
- [ ] AC5: The header link's visible text and accessible name are "Help" (e.g. `getByRole('link', { name: 'Help' })`), while the page `<h1>` remains "How it works".
- [ ] AC6: Existing behaviour is unchanged: app-name link to `/`, Login button, footer, and the 7 existing specs still pass.
- [ ] AC7: New specs cover the `/info` heading, the three steps (exact text), and the header link (`href`, label "Help", and position before the Login button); `npm run test:ci` and `npm run build` in `Frontend/` pass.

## Risks
- Header layout regression on small screens when adding a second control: verify wrapping.
- `routerLink` active styling is not required; if added, keep contrast and focus style intact.
- Lazy-loaded module adds a route chunk; negligible, but tests must configure the router (`RouterTestingModule` or `provideRouter`).

## Risk gate
none - no security, database or major-functionality change. Adding a new route and link does not alter any existing endpoint, route or flow.

## Decisions (from human)
- Steps wording: "Log in with your work account." / "Select a date and a desk." / "Receive confirmation and manage your bookings."
- Header link label: "Help" (page heading stays "How it works").
- Link position: left of the Login button.

## Open Questions
None blocking. Tags: none provided (non-blocking; left empty).
