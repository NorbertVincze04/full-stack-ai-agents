# Handover: manual-info-page - Info page

Task: `docs/tasks/manual-info-page.md` | Spec: `docs/specs/manual-info-page.md` | Source: manual | Area: frontend
Commit: `ff713ae` on `feature/manual-info-page-info-page` (from `main` `faa3c44`, local, not pushed)

## Summary
A static `/info` page ("How it works" heading and three steps) and a "Help" link to it in the app header, placed before the Login button. Frontend only: no API, database or dependency change.

## What was implemented
### Frontend
- Lazy route `info` in `AppRoutingModule` loading `InfoModule` (`InfoRoutingModule` with child route `''`, `InfoComponent`).
- `InfoComponent`: `<h1>How it works</h1>` and an `<ol>` with the three steps: "Log in with your work account.", "Select a date and a desk.", "Receive confirmation and manage your bookings."
- Header: `<a routerLink="/info">Help</a>` before the placeholder Login button, both in a new `.header-actions` container. The link reuses the existing `header a:focus-visible` outline and has a 44px minimum height.
- Specs for the page, the header link and the route wiring.

### Backend
None.

### Database
None.

## Files changed (commit `ff713ae`, 19 files, 538 insertions, 8 deletions)
Application:
- `Frontend/src/app/app-routing.module.ts`
- `Frontend/src/app/app.component.html`, `app.component.css`, `app.component.spec.ts`
- `Frontend/src/app/features/info/info.module.ts`, `info-routing.module.ts`, `info.component.ts`, `info.component.html`, `info.component.css`, `info.component.spec.ts` (new)
- `Frontend/src/app/info-route.spec.ts` (new, added by the tester)

Docs: `docs/context/frontend.md`, `docs/tasks/manual-info-page.md`, `docs/specs/manual-info-page.md`, `docs/runs/manual-info-page/*` (builder, tester, UX reviewer, code reviewer, PR report).

## Tools and technologies
Angular 18 (NgModules, lazy routing with `@angular/router`), plain CSS, Jasmine/Karma (ChromeHeadless).

## Dependencies added
None.

## API contract / migration
None.

## How to run and verify
In `Frontend/`:
1. `npm run test:ci` (expected 13 of 13) and `npm run build`.
2. `npm start`, open `/`: header shows the app name, "Help", then "Login".
3. Tab through the header (app name, Help, Login) and press Enter on Help: client-side navigation to `/info` with a visible focus outline.
4. `/info` shows "How it works" and a numbered list of three steps.

## Acceptance criteria
Criteria from the task file (AC1-AC3) and the spec (AC1-AC7).

| AC | Status | Evidence |
| --- | --- | --- |
| Task AC1 / Spec AC1: `/info` shows heading "How it works" | Verified | `info.component.spec.ts` and `info-route.spec.ts` pass (tester 13/13); code reviewer; human acceptance |
| Task AC2 / Spec AC2: header link to `/info`, before Login | Verified | `app.component.spec.ts` "Help link to /info before the Login button" passes; code and UX reviewers; human acceptance |
| Task AC3 / Spec AC3: keyboard accessible, visible focus style | Verified | Native `<a href>` via `routerLink` (tester `tabIndex` spec); `header a:focus-visible` 2px outline confirmed by UX and code review; human acceptance (visual and keyboard check). Not asserted by an automated browser test |
| Spec AC4: three steps, exact text and order in an `<ol>` | Verified | `info.component.spec.ts` steps spec passes; code reviewer |
| Spec AC5: link name "Help" without `aria-label`, `<h1>` stays "How it works" | Verified | Help link spec passes; heading specs; UX and code reviewers |
| Spec AC6: existing behaviour unchanged, 7 existing specs pass | Verified | Tester: 13/13 pass, original specs untouched |
| Spec AC7: new specs added, `test:ci` and `build` pass | Verified | Tester: `npm run test:ci` 13/13, `npm run build` OK (lazy chunk `info-module` 1.12 kB) |

Result: 7/7 spec criteria and 3/3 task criteria verified.

## Open findings
Reviewer verdicts: Tester pass, UX reviewer approved, Code reviewer approved. 0 blocker, 0 high. None blocks `done`; all are follow-ups.

Medium:
1. `/info` route has no `title`, so the document title stays "Desk Booking" (WCAG 2.4.2). Fix: `title: 'How it works'` in `app-routing.module.ts`. (UX M1)
2. `Frontend/src/app/info-route.spec.ts` lacks `provideLocationMocks()`, so specs push `/info` into the real browser history and may be order-dependent. (Code M1)
3. `docs/context/frontend.md` spec count is stale (says 10, should be 13) and `info-route.spec.ts` is not listed. (Code M2)

Low:
- Two `<h1>` on `/info` (mandated by the spec). (UX L1, Code L6)
- No `aria-current` or active styling on the Help link. (UX L2)
- Narrow-viewport (320px, 200% zoom) header wrapping not checked in a browser; `header` has no `flex-wrap`. (UX L3; also an open item in the tester and builder reports)
- Header actions are not in a `<nav>` landmark. (UX L4)
- Redundant `RouterModule` import in `info-route.spec.ts`; its third spec is low value and duplicates the header spec. (Code L3, L4)
- Verbose element queries in specs. (Code L5)

## Review coverage
| Reviewer | Status |
| --- | --- |
| Frontend Tester | Ran (requested by the human): 13/13 specs, build OK |
| UX Reviewer | Ran: approved |
| Code Reviewer | Ran: approved |
| Security Reviewer | Skipped: scope flags `security-relevant: no`, `dependencies-changed: no` |

Human acceptance: confirmed the implementation is correct (`human-accepted: true`).

## Approved risks
none

## Follow-ups
- Fix findings 1-3 above (route title, `provideLocationMocks()`, update `docs/context/frontend.md` to 13 specs and list `info-route.spec.ts`).
- Check the header at 320px width and 200% zoom; add `flex-wrap: wrap` on `header` if cramped.
- Optional: `routerLinkActive` with `aria-current="page"`, a `<nav>` landmark, and spec cleanup.
- Reconsider the double `<h1>` when a shared layout task changes the header.
- `main` is one commit ahead of `origin/main` (`faa3c44`, "extra security gate"); it will appear in a PR to `main` until pushed or merged.

## Repository note
The working tree was on `feature/manual-backend-login-endpoint-backend-login-endpoint` when this handover was written. The task, spec and run files for this task exist only in commit `ff713ae`. The task file `status: done` and this handover are uncommitted changes; commit both on `feature/manual-info-page-info-page` (for example as a follow-up commit on top of `ff713ae`), not on the backend branch.
