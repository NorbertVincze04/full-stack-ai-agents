# TDD frontend - manual-shadow-borders (red)

## Red baseline
Spec added: `Frontend/src/app/features/booking/booking.component.shadow-borders.spec.ts` (15 specs, computed styles in the real Karma browser with `styles.css` and component CSS loaded).
Run: 310 total, 298 pass, 12 red, no compile error.

## Expected failures (12, missing behaviour: no tokens, borders, radius or shadows exist yet)
- AC1: 5 token specs (`--border-color`, `--radius`, `--radius-sm`, `--shadow-sm`, `--shadow-md`)
- AC2: `.top-bar`, `.calendar`, `.desk-plan` border, radius, shadow-sm (3)
- AC4: enabled `.book-button` 6px and shadow-sm; `.nav-button` 6px radius (2)
- AC3: header shadow-md; footer top shadow (2)

## already-green (3, regression guards)
- Disabled book button has no shadow
- Day buttons keep a visible border (AC5)
- No horizontal overflow at 320 px (AC6)

## deferred / manual
- Hover raises to shadow-md (needs pointer state), focus ring pixels, desk state colours/contrast (AC5, AC8)
- AC7 build and suite: checked at green. AC9 (auth, info, terms unchanged): review.

## AC coverage
AC1 yes | AC2 yes | AC3 yes | AC4 partial (hover deferred) | AC5 partial | AC6 partial | AC7 green | AC8 manual | AC9 review

## Green
Run: 310/310 pass, 0 fail, 0 skipped (12 former red specs pass, no spec changed). Build: pass.
No defects. Hover shadow, focus ring pixels, state colours/contrast (AC5, AC8) and AC9 remain manual/review.
