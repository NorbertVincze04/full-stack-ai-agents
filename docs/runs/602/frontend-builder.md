# Frontend Builder - Task 602

Verdict: done

## Acceptance criteria -> implementation
- AC1: `<footer>© {{ currentYear }} Desk Booking. All rights reserved.</footer>` added after `<main>` in `app.component.html`.
- AC2: Footer lives in the root component, outside `<router-outlet />`, so it shows on every route.
- AC3: `:host` is a column flex container with `min-height: 100vh` (`100dvh` override); `main { flex: 1 }`; footer is in normal flow (not fixed), so it never overlaps content.
- AC4: Footer is full width (`width: 100%`, `box-sizing: border-box`), centred, with `overflow-wrap: anywhere` so text wraps on narrow viewports. Background `#1f2937` with `#ffffff` text (contrast above WCAG AA).
- AC5: Test `should render the copyright footer` in `app.component.spec.ts` asserts the footer exists and its trimmed text equals `© ${new Date().getFullYear()} Desk Booking. All rights reserved.`
- AC6: Build and unit tests pass (see below).
- AC7: `readonly currentYear = new Date().getFullYear()` in `AppComponent`; no hard-coded year.

## Files changed
- Frontend/src/app/app.component.html
- Frontend/src/app/app.component.css
- Frontend/src/app/app.component.ts
- Frontend/src/app/app.component.spec.ts

## Dependencies added
None.

## Commands run
- `npm run build` (Frontend/): success, no errors or warnings.
- `npm run test:ci` (Frontend/): 4 of 4 tests SUCCESS (headless Chrome).

## Known gaps
- Visual behaviour (sticky position, mobile wrapping) not checked in a browser; left for the tester/UX review.
- No lint script is configured.

## Iteration 1

Verdict: done

Findings addressed (from `frontend-ux-reviewer.md` and `frontend-code-reviewer.md`):
- UX #1/#2 (high) and code review #1 (medium): added `html, body { margin: 0; }` to `Frontend/src/styles.css`. Removes the 8px default body margin, so the page no longer overflows `100vh` and the footer spans the full viewport width and sits at the viewport bottom (AC3, AC4, FR4).

Skipped:
- Security report: Angular dependency upgrade is out of scope (pre-existing).
- Low/optional findings (CSS custom properties for colours, `main` padding, `overflow-wrap`, placement assertion in the spec): not required; `main` padding would change layout beyond the spec.

Files changed:
- Frontend/src/styles.css

Dependencies added: None.

Commands run:
- `npm run build` (Frontend/): success, no errors or warnings.
- `npm run test:ci` (Frontend/): 4 of 4 tests SUCCESS.

Known gaps: visual check in a browser still not performed.
