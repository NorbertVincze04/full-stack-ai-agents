# TDD frontend - manual-terms-services-page

## Green results
Verdict: pass. `npm run build`: pass. `npm run test:ci`: 270/270 pass (red baseline: 269 run, 6 red). No failures, no defects.

Added since red (deferred-to-green): 1 spec in `terms-route.spec.ts`: Terms link precedes the user name when signed in (`AuthService` stubbed with `currentUser$`). No existing spec corrected or weakened. The 6 red specs now pass. Focus style (AC4) is CSS and not assertable without e2e.

## Red baseline
Command: `npm run test:ci` in `Frontend/`: 269 run, 263 pass, 6 fail (all new). Suite compiles; no existing spec broke.

New file: `Frontend/src/app/terms-route.spec.ts` (6 specs, via `AppRoutingModule` + `AppComponent`, `provideLocationMocks()`).

| Spec | AC | Expected failure reason |
| --- | --- | --- |
| h1 "Terms of Service" in `main` at `/terms` | AC1 | no `/terms` route |
| `main` text matches /not legal/i | AC2 | no `/terms` route |
| Terms link, href `/terms`, after Help and before Login | AC3 | no Terms link in header |
| Terms link focusable (href, tabIndex >= 0) | AC4 | no Terms link |
| click navigates client-side to `/terms` | AC4 | no Terms link |
| header h1 and footer kept on terms page | AC5 | no `/terms` route |

- already-green: none of the new specs. AC5 (existing header/footer specs unchanged) is covered by the 263 existing passing specs.
- deferred-to-green: visible focus style (CSS, not assertable without e2e); signed-in order (Terms before user name); `npm run build`.
- AC6: new specs cover heading, text and link; `test:ci` and `build` must pass at green.

Selectors assumed: link text exactly "Terms" inside `header a`; `main h1`; placeholder text containing "not legal".
