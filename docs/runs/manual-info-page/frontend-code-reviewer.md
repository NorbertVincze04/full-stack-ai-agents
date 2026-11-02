# Frontend code review: manual-info-page

Verdict: approved

Scope: `features/info/*`, `app-routing.module.ts`, `app.component.html/css/spec.ts`, `info-route.spec.ts`, `docs/context/frontend.md`.
Checks: `npm run build` passes (lazy chunk `info-module` 1.12 kB). No ESLint configured (project decision), so no lint run. Tests not re-run by the reviewer; builder and tester report 13 of 13 passing.

## Acceptance criteria
| AC | Result |
| --- | --- |
| AC1 `/info` h1 "How it works" | met (`info.component.html`) |
| AC2 link to `/info` before Login | met (`app.component.html`, DOM order link then button) |
| AC3 keyboard / focus-visible | met (native `<a>` via `routerLink`; existing `header a:focus-visible` applies, `.header-actions a` does not override outline) |
| AC4 three steps, exact text, `<ol>` | met |
| AC5 name "Help", no `aria-label` | met |
| AC6 existing behaviour unchanged | met (existing specs untouched, only one added) |
| AC7 specs + build | met |

## Findings

Count: blocker 0, high 0, medium 2, low 4.

### Medium
1. `Frontend/src/app/info-route.spec.ts` (all specs): imports the real `AppRoutingModule` (`RouterModule.forRoot`) without `provideLocationMocks()`/`SpyLocation`, so specs push `/info` into the real Karma browser history. State can leak into other specs and make results order-dependent (Jasmine random order). Fix: add `provideLocationMocks()` (or `RouterTestingModule`) to the testing module.
2. `docs/context/frontend.md` (Structure and Tests sections): stale. It says 10 specs and does not list `src/app/info-route.spec.ts` (3 specs added by the tester, total 13). Fix: add the file to the structure table and update the count to 13.

### Low
3. `Frontend/src/app/info-route.spec.ts` L9: `imports: [AppRoutingModule, RouterModule]` - `RouterModule` is redundant (`AppRoutingModule` already exports it). Remove it.
4. `Frontend/src/app/info-route.spec.ts` L47-55: third spec duplicates the `href` assertion in `app.component.spec.ts` and `tabIndex >= 0` is always true for an anchor with `href`, so it adds little value. Remove it or merge it into the existing Help link spec.
5. `Frontend/src/app/info-route.spec.ts` L28-31 / `app.component.spec.ts` L58-72: `querySelectorAll('header a').find(text === 'Help')` and `compareDocumentPosition` are verbose. A `By.css('.header-actions a')` query plus `.header-actions` child order check would be simpler. Optional.
6. `Frontend/src/app/features/info/info.component.html`: the page has two `<h1>` (header app name and "How it works") because the spec mandates both. Acceptable now; revisit if the header h1 becomes a non-heading (for example `<a>`/`<p>`) in a later task.

## Positives
- Follows the NgModule convention (lazy `InfoModule` + `InfoRoutingModule` with `forChild`), selector prefix `app`, no `any`, no subscriptions, no change-detection concerns (static component).
- Routing and module boundaries are correct; no new dependencies.
- CSS reuses existing header focus rules, keeps a 44px target, and uses `box-sizing`/`overflow-wrap` for narrow screens. No dead code.
