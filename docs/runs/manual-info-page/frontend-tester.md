# Frontend tests: manual-info-page

Verdict: pass

## Results (in `Frontend/`)
- `npm run test:ci`: 13 of 13 SUCCESS (0 failures). Before my additions: 10 of 10.
- `npm run build`: success; lazy chunk `info-module` 1.12 kB.

## Tests added
New file `Frontend/src/app/info-route.spec.ts` (3 specs, integration with the real `AppRoutingModule`; the builder's specs did not exercise the `/info` route wiring):
- renders `InfoComponent` inside `main` when navigating to `/info` (location `/info`, `main h1` "How it works", 3 `ol > li`, header h1 intact)
- clicking the Help link navigates client-side to `/info` and shows the heading
- Help link is a native `<a href>` with `tabIndex >= 0` (keyboard reachable)

Existing specs (unchanged, by builder): `info.component.spec.ts` (2), `app.component.spec.ts` (8).

## Criteria coverage
| AC | Covered by | Status |
| --- | --- | --- |
| AC1 `/info` shows h1 "How it works" | `InfoComponent` heading spec; route integration spec | covered |
| AC2 link `href` `/info`, before Login | `AppComponent` "Help link to /info before the Login button" spec | covered |
| AC3 keyboard accessible, focus style | tabbable/`href` spec (new); Enter on a native anchor is browser behaviour. `:focus-visible` outline verified by CSS review only (`header a:focus-visible`, 2px white outline) | partly automated |
| AC4 three steps, exact text and order | `InfoComponent` steps spec | covered |
| AC5 accessible name "Help", no `aria-label`, h1 stays | Help link spec (text, no `aria-label`); heading specs | covered |
| AC6 existing behaviour unchanged | the 7 original specs plus new ones pass | covered |
| AC7 new specs + test:ci + build pass | 13/13 and build OK | covered |

## Failures
None.

## Gaps (non-blocking, low)
- Focus-visible outline and narrow-viewport wrapping are not asserted in a browser; CSS inspected only.
