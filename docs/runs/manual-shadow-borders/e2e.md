# E2E - manual-shadow-borders

Verdict: skipped: no e2e runner (workflow.e2e auto; ui-changes present, no Playwright/Cypress in the repo). Adding one needs an approved spec.

## Journeys (for a future runner)
- / at 1280 px: top bar, calendar and desk plan show border, radius and shadow-sm; header and footer shadows (AC2, AC3).
- Hover and focus on buttons: shadow-md on hover, visible focus ring, disabled has none (AC4, AC5).
- 320 px and below 768 px: no horizontal scroll, stacked layout (AC6).
- /login, /register, /info, /terms: content not restyled (AC9).

## Results
None run. Unit-level coverage: see tdd-frontend.md (310/310).
