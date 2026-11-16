# PR - 649: select/deselect

Branch: `dev` (current, tracks `origin/dev`; no new branch proposed). Base for the PR: `main` (release branch, merged by CD after CI).
Source: Azure DevOps work item 649. Area: frontend only.

## Summary
### Frontend
- Clicking the selected calendar day or desk now deselects it (toggle). `CalendarComponent` emits `dateDeselected`, `DeskPlanComponent` emits `deskDeselected`; state stays in `BookingComponent`.
- No day is selected on page load. Without a day: top bar `No date selected`, desks neutral and not selectable, `Book Now` disabled, no request.
- Deselecting the day resets the desk selection and clears availability. Own booked day and own desk (`yours`) toggle selection only (no request, no `DELETE`); `Withdraw booking` stays the only withdraw action.
- Own desk shows a `picked` highlight and `aria-pressed` when toggled; `Withdraw` success also resets the desk selection.
- Backend, API, database, containers, pipelines and dependencies: no change.

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 day select/deselect | Verified | Calendar and toggle specs; code review |
| AC2 desk select/deselect | Verified | Desk plan and toggle specs |
| AC3 one day/desk, desk reset | Verified | Toggle specs "at most one day", reset on change and deselect |
| AC4 `Please select a desk first` | Verified | Toggle and desks specs |
| AC5 no day on load | Verified | Toggle spec "AC5" (5 specs) |
| AC6 deselect day state | Verified | Toggle spec "AC6" (6 specs, no request) |
| AC7 own booked day toggle, no `DELETE` | Verified | Toggle spec "AC7" |
| AC8 own desk toggle | Verified | Toggle spec "AC8", desk plan specs |
| AC9 disabled/booked/neutral not selectable, flows unchanged | Verified | Existing and new specs (409/401/500, window) |
| AC10 keyboard, `aria-pressed`, disabled `Book Now` | Verified | Native `<button type="button">`, focus and `aria-pressed` specs; manual browser check accepted by the human ("AC10 accepted", 2026-11-16, steps in `docs/specs/649.md`); no runner |
| AC11 specs added/adapted, suite green | Verified | 247/247 |

## Test results
- TDD (`tdd-frontend.md`): `npm run test:ci` (Frontend, ChromeHeadless) 247 of 247 pass (before: 191 with 38 red). 56 specs added; 3 spec files adapted to the approved spec (preselected day and non-selectable own desk assumptions), none skipped or weakened.
- Build: `npm run build` (Frontend) passed at the implement stage.
- e2e: skipped, no runner (`workflow.e2e` = `auto`, no Playwright or Cypress config). Journeys listed in `e2e.md`. AC10 verified manually by the human (2026-11-16).

## Review coverage
- code: run, approved (0 blocker, 0 high, 0 medium, 4 low), `review-code.md`.
- ux: run, approved (0 blocker, 0 high, 1 medium, 2 low), `review-ux.md`. Visual browser check not done.
- security: skipped (`security-relevant: no`, `dependencies-changed: no`).
- containers, pipelines: not in the area.

## Approved risks and decisions
- R1 (no-date state and disabled `Book Now`), R2 (no day on load), R3 (own desk clickable): approved by the human.
- D1 no-date state allowed; D2 no preselected day; D3 own day/desk toggle selection only.

## Migration
None.

## How to start and verify
1. `cd Frontend; npm run test:ci` (expect 247 of 247) and `npm run build`.
2. Start the stack (`podman compose up`) or `ng serve`; open `/`.
3. Load: no day highlighted, `No date selected`, desks grey, `Book Now` disabled.
4. Click a weekday (selected, `aria-pressed="true"`), click it again (deselected, desks neutral again).
5. Log in, select a day and a desk, click the desk again: `Available`; `Book Now` shows `Please select a desk first`.
6. Book a desk, deselect the day, reselect it: `booked` marker and booking intact. Click the own desk twice: highlight toggles, `Withdraw booking` stays enabled.

## Repository settings
None required.

## Open findings
- medium (UX): signed-in user with no day selected sees 12 grey desks and no hint in the plan (`desk-plan.component.html`). Suggested hint: "Select a date to see available desks".
- low (code): `selectedDesk = null` duplicated in the withdraw and book branches of `toggleBooking()` (`booking.component.ts`).
- low (code): `select()` / `deselect()` near-duplicate.
- low (code): stale text in `docs/context/frontend.md` (line 55 `145 total`, "no specs yet for DeskPlanComponent"; line 58 "fail until the Tester adapts them") and `docs/context/project.md` (line 10 "specs pending"). Real count is 247. Not fixed here (other agents' files); update before or in the commit.
- low (UX): picked own desk differs by fill colour only (no text or icon cue).
- low (UX): no `aria-live` on `.selected-date` for the `No date selected` change.
- Follow-ups: decide whether to add an e2e runner (Playwright, dependency change); add the `deskbookingPrj` tag to work item 649 (empty `System.Tags`).
