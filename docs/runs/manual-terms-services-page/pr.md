# manual-terms-services-page: Terms of Service page

## Summary
- Frontend: new lazy routed static page `/terms` (`TermsModule`, `TermsRoutingModule`, `TermsComponent`) with `<h1>` "Terms of Service" and placeholder text stating it is not legal text.
- Frontend: "Terms" link (`routerLink="/terms"`) in `.header-actions`, after "Help" and before Login / user name.
- Docs: context files and agent context files updated. No backend, API, database or dependency change.

## Acceptance criteria
- [x] AC1: `/terms` shows `<h1>` "Terms of Service" (spec, `terms-route.spec.ts`).
- [x] AC2: placeholder text says it is not legal text (spec).
- [x] AC3: "Terms" link, `href` `/terms`, after Help, before Login / user name (specs, signed in and out).
- [x] AC4: focusable, client-side navigation (specs); visible focus style confirmed manually by the human (`manual-verified`).
- [x] AC5: existing header/footer behaviour unchanged; existing 263 specs pass.
- [x] AC6: new specs cover heading, text, link; `npm run test:ci` (270/270) and `npm run build` pass.

## Tests
- tdd: red baseline 269 run, 6 red (all new); green 270/270 pass; build pass.
- e2e: skipped, no e2e runner in the repository (adding one is a dependency change).

## Review coverage
- code: approved (0 blocker/high/medium, 2 low).
- ux: approved (0 blocker/high/medium, 1 low).
- security: skipped, no `security-relevant` flag (no input, auth, storage).
- container, pipelines: skipped, no changes.

## Approved risks and decisions
Approved risks: none. D1 link in the app header next to Help; D2 route `/terms`, label "Terms"; D3 h1 "Terms of Service"; D4 short placeholder text, marked not legal text.

## Migration
None.

## Start and verify
1. `cd Frontend; npm ci; npm run test:ci; npm run build`
2. `npm start`, open `http://localhost:4200/`: header shows Help, Terms, Login.
3. Click "Terms": URL `/terms`, no reload, heading and placeholder text shown.
4. Tab to "Terms": focus outline visible; Enter opens the page.

## Repository settings
None.

## Open findings
- low: no component spec next to `TermsComponent` (covered by `terms-route.spec.ts`).
- low: routes `info` and `terms` have no `title`.
- low: header links lack an active-route indicator (existing pattern gap).
