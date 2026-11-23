# TDD frontend - manual-div-for-hero-section (red)

## Red baseline
Run: `npm run test:ci` in `Frontend/`: 293 run, 291 pass, 2 fail (the 2 new red specs). Existing 271 specs untouched and green.

Tests added: [booking.component.hero-layout.spec.ts](../../../Frontend/src/app/features/booking/booking.component.hero-layout.spec.ts) (5 specs, measured in headless Chrome with component styles, container width set on the host).

| Spec | AC | Status | Reason |
| --- | --- | --- | --- |
| equal widths of calendar and plan divs at 1100 px | AC1 | red | widths differ by 192 px (calendar `flex: 0 1 24rem`, plan `flex: 1 1 22rem; max-width: 36rem`) |
| divs fill the row (width + gap > 95% of 1100 px) | AC1 | red | 984 vs 1045 expected; `max-width` and `justify-content: center` leave the row unfilled |
| calendar left, plan right, same top | AC1 | already-green | existing flex row already does this |
| markup nesting (`.booking-layout > .layout-calendar > app-calendar`, same for plan) | AC2 | already-green | wrappers already exist (A4: markup unchanged); regression guard |
| stack below calendar at 320 px, no horizontal overflow | AC3 | already-green | `flex-wrap` already stacks; regression guard for the new 50/50 CSS |

## Coverage matrix
- AC1: 3 specs (2 red). AC2: 1. AC3: 1.
- AC4: existing `booking.component*.spec.ts` and `desk-numbering.spec.ts` (all pass).
- AC5: build and full suite at green.

## deferred-to-green
- The 768 px breakpoint itself: a media query reacts to the Karma window, not the host width, so it cannot be driven from a spec. Stacking is checked only at 320 px container width.
- `npm run build` (AC5).

# Green
Run: `npm run test:ci`: 295/295 SUCCESS; `npm run build`: complete.
Both red specs now pass (equal widths, row fill). Added at green (were deferred-to-green): 2 container-width specs, 767 px stacks and 768 px side by side (AC3 breakpoint). No tests corrected, no failures, no defects.
Coverage: AC1 3 specs, AC2 1, AC3 3, AC4 existing booking specs pass, AC5 build + suite pass.
Gap: real viewport `@media` is not used (container query on the full-width host), so a viewport resize is not exercised.
