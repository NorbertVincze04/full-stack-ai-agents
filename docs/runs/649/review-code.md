# Review (code) - 649 select/deselect (frontend)

Verdict: approved. Findings: 0 blocker, 0 high, 0 medium, 4 low.

## Review selection
- code: run (`logic-changes: yes`; `BookingComponent`, `CalendarComponent`, `DeskPlanComponent` changed).
- ux: run (`ui-changes: yes`), see `review-ux.md`.
- security: skipped (`security-relevant: no`, `dependencies-changed: no`; no auth, API, storage or dependency change).
- containers, pipelines: not in the area.

Inputs: `implement-frontend.md`, `tdd-frontend.md`, `e2e.md` (skipped, no runner); build passed, Karma 247/247. Files read: the 7 changed source files in `Frontend/src/app/features/booking/` and the diff of `docs/context/*.md`. Approved risks R1, R2, R3 are implemented as written and not re-reported.

## Acceptance criteria
AC1-AC10 are met by the code: calendar and desk plan emit `dateDeselected` / `deskDeselected` only (state stays in `BookingComponent`, requirement 4); `ngOnInit` no longer preselects; `loadAvailability()` returns without a request when no day is selected (it also cancels the in-flight request); `Book Now` is `[disabled]="busy || !selected"`; `toggleBooking()` is unchanged, so no `DELETE` on deselect and `Withdraw booking` stays date-based; `yours` desks are enabled and `pressed` follows `selectedDesk`, with `booked` and `neutral` desks never pressed or enabled (AC9). AC11 is covered per `tdd-frontend.md` (247/247, no spec skipped: no `xit`/`fit`/`xdescribe` found).

## Findings
- low | `booking.component.ts` `toggleBooking()` success branch | `this.selectedDesk = null` is now in both the withdraw and the book branch; the withdraw line also clears a desk the user picked on another day while the request was in flight (same family as the tracked in-flight race). Fix: hoist one `selectedDesk = null` above the `if`, only when `this.selected === date`.
- low | `booking.component.ts` `select()` / `deselect()` | Two near-identical methods (reset desk, clear error, reload availability). Fix: optional, let `deselect()` call a shared private reset; not required.
- low | `docs/context/frontend.md` (Tests and Decisions sections) and `docs/context/project.md` (Frontend row) | Stale after the tests went green: "145 total", "no specs yet for DeskPlanComponent/DeskService", "specs ... fail until the Tester adapts them", "specs pending". Real count is 247. Fix: update the three passages at the PR stage.
- low | `docs/runs/649/e2e.md` | No e2e runner, so real Enter/Space key behaviour and the CSS highlights are verified only by element type and class (native `<button type="button">`, which is sufficient for Enter/Space). Already tracked as a decision for the human; no action for this task.

## Checked, no finding
- Subscriptions: `availabilitySub` is unsubscribed on every reload and on logout; `currentUser$` uses `takeUntilDestroyed`.
- Typing: no `any`; separate `EventEmitter<void>` outputs instead of `null` payloads, consistent with the existing `dateSelected` / `deskSelected` pattern.
- Module boundaries and reuse: no new files in production code, no new dependencies; plain `@Input`/`@Output` kept.
- Existing race conditions around in-flight booking requests (tracked in `reviewer.md`) are not worsened: after a deselect, `availability` is `null`, so `markDesk` is a no-op and a late 409 only sets the message.
