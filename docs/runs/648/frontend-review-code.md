# Frontend code review - task 648 (booking_calendar)

Verdict: approved

Build/tests (from reports, not re-run): `npm run build` OK, `npm run test:ci` 145/145. No ESLint configured, so lint not run.

Scope: `features/booking/` (module, routing, component, calendar, service, dates), `core/auth.service.ts` (`getToken()`), `app-routing.module.ts`.

## Acceptance criteria
FR1-FR8 and FR12-FR13 (AC1-AC5, AC7) are met in code and covered by specs. FR9-FR11/FR14 are backend. AC9 context update is only partly done (see L5).

## Findings
| # | Severity | File / line | Problem | Suggested fix |
| --- | --- | --- | --- | --- |
| M1 | medium | `booking.component.ts` 44-51, 98-103 | `currentUser$` handler subscribes to `listMine()` without `switchMap`; a stale response (quick logout/login) can overwrite `booked` for the wrong user. | `currentUser$.pipe(switchMap(u => u ? listMine() : of([])), takeUntilDestroyed)`; keep the error handling. |
| M2 | medium | `booking.component.ts` 75-87 | An in-flight book/withdraw that resolves after logout (or a 401 from another call) re-adds a date to `booked`, which was just cleared, and the request is not tied to the component lifetime. | Pipe the request through `takeUntilDestroyed`; ignore `next` if the user is no longer authenticated. |
| L1 | low | `booking.component.ts` 8-14 | `BOOKING_NOW` token and message constants live in the component file; the service and specs import from the component. | Move to `booking.constants.ts` (or `booking-dates.ts`). |
| L2 | low | `booking.component.ts` 28-31, 21-22 | Mixed DI styles (`inject()` and constructor params). | Use `inject()` consistently. |
| L3 | low | `calendar.component.ts` 36 | Fallback `toIsoDate(new Date())` ignores `BOOKING_NOW`. Only reached when `bookable` is empty, so not reachable today. | Drop the fallback or pass the anchor as an input. |
| L4 | low | `booking.component.ts` 40-43 | Bookable window is computed once; a tab left open past midnight keeps stale days (server still validates, generic error). Already listed as a known risk. | Accept, or recompute on `visibilitychange`. |
| L5 | low | `docs/context/frontend.md` (Tests, Decisions) | Stale: says 97 specs and "no frontend specs for the booking feature yet"; now 145 with booking specs. | Update counts and drop the gap line. |
| L6 | low | `booking.component.ts` 66-69 | 409 on book leaves the button on `Book Now` although the server holds the date; a retry gives 409 again. Matches the spec (generic error). | Optional: reload `listMine()` on 409 to resync. |
| L7 | low | `calendar.component.html` 25-26 | `[disabled]` plus `aria-disabled` is redundant; native disabled already removes the day from keyboard and AT interaction. Kept to satisfy the spec. | None needed. |
| L8 | low | `booking.component.spec.ts` | No route-level spec for FR1 "no bar on other routes" (noted by tester). | Add a small router spec if wanted. |

## Checked, no issue
- RxJS: `currentUser$` uses `takeUntilDestroyed`; HTTP observables complete; no `async` pipe needed.
- Typing: no `any`; errors typed `unknown` and narrowed with `instanceof HttpErrorResponse`.
- Module boundaries: feature imports only `core/auth.service` and `environments`; lazy module, route `pathMatch: 'full'` does not clash with `info`/auth matcher.
- Security: token attached only in `BookingService`; date is `encodeURIComponent`-encoded; no e-mail used.
- Accessibility: `aria-live` error region, `aria-pressed`, `aria-label` per day, 44 px targets, focus outlines.
- Dead code: none found.

Counts: blocker 0, high 0, medium 2, low 8.
