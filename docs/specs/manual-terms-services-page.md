# Spec: manual-terms-services-page - Terms of Service page

Task: `docs/tasks/manual-terms-services-page.md`

## Summary
Add a static terms-of-service page and an "Terms" link to it in the app header next to "Help". Same pattern as the `/info` page and the "Help" link.

## Scope
- New lazy routed static page (no data, no API calls).
- New header link "Terms" next to the existing "Help" link, before the Login button / user name.
- Specs for the page and the header link; `npm run test:ci` and `npm run build` pass.
- Update `docs/context/frontend.md` at build end.

## Out of scope
- Acceptance checkbox, storing consent, backend/API/database, legal wording review, i18n, new dependencies, 404 route.

## Area
`frontend` - static page and link; no API, backend or database change.

## Scope flags
| Flag | Value | Reason |
| --- | --- | --- |
| ui-changes | yes | New route, template, header link |
| logic-changes | no | Static content and a link |
| security-relevant | no | No input, auth, storage or personal data; internal `routerLink` |
| dependencies-changed | no | Uses installed `@angular/router` |
| database-changes | no | None |
| scaffolding-only | no | Adds visible behaviour |

## Functional requirements
1. Route `/terms` renders a component with `<h1>` "Terms of Service" and a short placeholder text.
2. The placeholder text states that it is not legal text.
3. The header contains a link with visible text "Terms" in `.header-actions` next to "Help", before the auth controls; `routerLink`, no differing `aria-label`.
4. Keyboard accessible with visible focus (existing `header a:focus-visible`); header still fits 320 px.
5. Page is public (no guard) and renders inside `<main><router-outlet/></main>`; existing header/footer behaviour unchanged.

## API / data changes
None.

## Frontend design (guidance)
- `src/app/features/terms/` with `TermsModule`, `TermsRoutingModule`, `TermsComponent`; lazy route in `app-routing.module.ts` before the auth matcher route, mirroring `info`.

## Acceptance criteria
- [ ] AC1: Route `/terms` shows an `<h1>` with the text "Terms of Service".
- [ ] AC2: The page shows short placeholder text that states it is not legal text.
- [ ] AC3: The header contains a link "Terms" with `href` `/terms`, next to "Help" and before the Login button (signed out) or user name (signed in).
- [ ] AC4: The link is keyboard focusable, activates with Enter, has a visible focus style, and navigates without reload.
- [ ] AC5: Existing behaviour unchanged (app name link, Help link, Login/Logout, footer); existing specs pass.
- [ ] AC6: New specs cover heading, text and header link (`href`, label, position); `npm run test:ci` and `npm run build` in `Frontend/` pass.

## Risk gate
none (static frontend page; no risk-gate item in `docs/risk-gate.md` applies).

## Decisions
- D1 (Q1): "heading" = the app header bar, link next to Help.
- D2 (Q2): route `/terms`, link label "Terms".
- D3 (Q3): page `<h1>` "Terms of Service".
- D4 (Q4): short placeholder text, marked as not legal text.

## Open Questions
none
