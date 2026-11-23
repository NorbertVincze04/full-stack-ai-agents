# manual-shadow-borders: Shadow and borders

## Summary
- Frontend only, CSS only: global design tokens in `Frontend/src/styles.css` (`--border-color`, `--radius`, `--radius-sm`, `--shadow-sm`, `--shadow-md`), used by the booking page (top bar, calendar, desk plan, buttons) and the shared header and footer.
- One new spec: `booking.component.shadow-borders.spec.ts` (15 computed-style specs).
- No backend, API, migration, markup or dependency change.

## Acceptance criteria
- [x] AC1 tokens on `:root`, used by component CSS (spec)
- [x] AC2 top bar, calendar, desk plan: 1px border, 8px radius, shadow-sm (spec)
- [ ] AC3 header bottom / footer top shadow: specs pass; visibility of the header shadow under the top bar not checked in a browser (Partially)
- [x] AC4 buttons 6px radius, shadow-sm, hover shadow-md, disabled none (spec; hover manual-verified)
- [x] AC5 states distinguishable, focus visible (manual-verified)
- [x] AC6 no horizontal scroll at 320 px, stacks below 768 px (spec; manual-verified)
- [x] AC7 `npm run build` and `npm run test:ci` pass
- [x] AC8 contrast not reduced (manual-verified)
- [x] AC9 login, register, info, terms not restyled (manual-verified)

## Tests
- tdd: red baseline 310 total, 12 red; green 310/310, 0 fail, 0 skipped. Build pass.
- e2e: skipped, no runner in the repo.

## Review coverage
- code: ran, approved (0 blocker/high/medium, 4 low).
- ux: ran, approved (0 blocker/high, 2 medium, 3 low).
- security: skipped (no flag, CSS only, no dependency change).

## Approved risks and decisions
Approved risks: none. D1 booking page plus shared header/footer; D3 border 1px #d1d5db, radius 8px/6px; D4 shadows; D5 global tokens; D6 hover raises shadow. Human confirmed AC4, AC5, AC6, AC8, AC9 manually.

## Migration / start / verify
- No migration.
- Start: `podman compose up -d --build`, or `npm start` in `Frontend/`.
- Verify: open `/` at 1280, 768 and 320 px: bordered top bar, calendar, desk plan; header and footer shadow; button hover raises shadow; no horizontal scroll. Check `/login`, `/register`, `/info`, `/terms` unchanged. Run `npm run build` and `npm run test:ci` in `Frontend/`.

## Repository settings
None.

## Open findings
- medium (ux): header shadow may be hidden by the top bar on `/` (fix: header `position: relative; z-index: 1`).
- medium (ux): `.calendar` and `.desk-plan` use `padding: 0 1rem`, so content and focus rings touch the new border (fix: vertical padding).
- low: footer shadow is a literal, not a token; `.desk`, `.day`, `.legend-swatch` keep 4px radius; `.nav-button:hover` lacks `:not(:disabled)`; hover/focus not covered by specs; desk text 12px at 320 px.
- Excluded from the PR: untracked `$f`, `Frontend/build-output.txt`, `Frontend/test-output.txt`, `live-ui/state.json`.
