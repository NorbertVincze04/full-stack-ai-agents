# PR (frontend) - manual-info-page: Info page

Work item: none (source: manual, no Azure work item URL in the task file).

## Proposal (mode: prepare, nothing created or committed)

- Branch (new): `feature/manual-info-page-info-page`
- Base branch: `main` (`faa3c44`). See "Base branch note".
- Commit message:

  ```
  manual-info-page: Info page (frontend)

  Add a lazy-loaded /info route (InfoModule) with a static "How it works"
  heading and a three-step ordered list. Add a "Help" link to /info in the
  header, before the Login button, inside .header-actions. The link is a
  native anchor and reuses the existing header focus-visible outline.
  ```

### Files to commit

Frontend (`git diff --stat`: 4 tracked files, 41 insertions, 4 deletions; plus new files):
- Frontend/src/app/app-routing.module.ts
- Frontend/src/app/app.component.css
- Frontend/src/app/app.component.html
- Frontend/src/app/app.component.spec.ts
- Frontend/src/app/info-route.spec.ts (new)
- Frontend/src/app/features/info/info-routing.module.ts (new)
- Frontend/src/app/features/info/info.component.css (new)
- Frontend/src/app/features/info/info.component.html (new)
- Frontend/src/app/features/info/info.component.spec.ts (new)
- Frontend/src/app/features/info/info.component.ts (new)
- Frontend/src/app/features/info/info.module.ts (new)

Docs:
- docs/context/frontend.md (modified; spec count is stale, see findings)
- docs/tasks/manual-info-page.md (new)
- docs/specs/manual-info-page.md (new)
- docs/runs/manual-info-page/frontend-builder.md (new)
- docs/runs/manual-info-page/frontend-tester.md (new)
- docs/runs/manual-info-page/frontend-ux-reviewer.md (new)
- docs/runs/manual-info-page/frontend-code-reviewer.md (new)
- docs/runs/manual-info-page/pr-frontend.md (new)

Do NOT stage (present in the working tree, unrelated to this task):
- docs/tasks/manual-backend-login-endpoint.md (modified)
- docs/handover/manual-backend-login-endpoint.md (untracked)

No `.env` or secrets are involved.

## Base branch note

The working tree is currently on `feature/manual-backend-login-endpoint-backend-login-endpoint` (`a4cc66f`, one backend commit ahead of `main`). The frontend changes are independent of the backend commit and edit only frontend files plus docs.

Recommendation: create `feature/manual-info-page-info-page` from `main` so the PR shows only this task. Switching branches carries the uncommitted changes over without conflict, because the backend commit touches no files edited here. Check `docs/tasks/manual-backend-login-endpoint.md`: it is modified, and the backend commit changed that file, so verify it before switching.

`main` is `faa3c44` and `origin/main` is `43f6326`, so `main` is 1 commit ahead of its remote. That commit is not part of this task, but it will be in a PR targeting `main` until pushed or merged.

## Summary

Adds a static `/info` page and a header link to it. `AppRoutingModule` gets a lazy `info` route to `InfoModule`; `InfoComponent` renders `<h1>How it works</h1>` and an `<ol>` with three steps. `AppComponent` gets a `.header-actions` container holding a `<a routerLink="/info">Help</a>` before the Login button. The link is a native anchor with a 44px minimum target and the existing `header a:focus-visible` outline. No new dependencies.

## Acceptance criteria

- [x] AC1 Route `/info` shows the heading "How it works"
- [x] AC2 Header contains a link to `/info` (label "Help", before Login)
- [x] AC3 Link is keyboard accessible with a visible focus style (outline verified by CSS review only, not in a browser)

## Test results

- `npm run test:ci` (Frontend/): 13 of 13 SUCCESS (tester). The builder ran 10 of 10 before the tester added `info-route.spec.ts` (3 specs).
- `npm run build` (Frontend/): success; lazy chunk `info-module` 1.12 kB.
- Lint: not configured.

## Review verdicts

- Tester: pass
- UX reviewer: approved
- Code reviewer: approved

## Open review findings

0 blocker, 0 high.

Medium:
1. No route title: `/info` keeps the document title "Desk Booking" (WCAG 2.4.2). Fix: add `title: 'How it works'` to the `info` route in `Frontend/src/app/app-routing.module.ts`. (UX M1)
2. `Frontend/src/app/info-route.spec.ts` lacks `provideLocationMocks()`, so specs push `/info` into the real browser history and may be order-dependent. (Code review M1)
3. `docs/context/frontend.md` is stale: it says 10 specs and does not list `info-route.spec.ts`; the correct total is 13. (Code review M2)

Low (not blocking): two `<h1>` elements on `/info` (mandated by the spec); no `aria-current` on the Help link; narrow-viewport wrapping not checked in a browser; header actions are not a `<nav>`; redundant `RouterModule` import and a low-value third spec in `info-route.spec.ts`.

Note: findings 1-3 are not fixed in this branch. This mode does not change source code, so they need a builder pass before commit or a follow-up task.

## Open questions from the task

The wording of the steps, the link label, and tags were not specified. The builder used the label "Help" and the step wording from the spec.

## How to verify

1. In `Frontend/`: `npm run test:ci` (13 of 13) and `npm run build`.
2. `npm start`, open `/`: the header shows the app name, then "Help", then "Login".
3. Tab through the header: the order is app name, Help, Login, each with a visible outline. Press Enter on Help.
4. `/info` shows "How it works" and a numbered list of three steps; the page loads as a separate lazy chunk.
5. Check at 320px width and 200% zoom that the header does not overflow.
