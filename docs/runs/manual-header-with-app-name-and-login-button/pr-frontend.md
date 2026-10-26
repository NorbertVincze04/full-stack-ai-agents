# PR (frontend) - manual-header-with-app-name-and-login-button: Header with app name and login button

Work item: none (source: manual, no Azure work item URL in the task file).

## Proposal (mode: prepare, nothing created or committed)

- Branch (new): `feature/manual-header-with-app-name-and-login-button`
- Base branch: `feature/602-test-version-control` (HEAD `3c5b449`, 3 unpushed commits ahead of `master` `f20ecd3`). See "Base branch recommendation".
- Commit message:

  ```
  manual-header-with-app-name-and-login-button: header with app name and login button (frontend)

  Add a static header to the root component, before <main> and outside
  <router-outlet />. The app name is a link to "/" inside the page's single
  <h1> on the left, and a placeholder "Login" button (no action, no auth
  state) is on the right. It reuses the footer palette and keeps the 602
  sticky-footer layout unchanged.
  ```

### Files to commit

Frontend (`git diff --stat`: 3 files, 85 insertions, 3 deletions):
- Frontend/src/app/app.component.html
- Frontend/src/app/app.component.css
- Frontend/src/app/app.component.spec.ts

Docs (untracked):
- docs/tasks/manual-header-with-app-name-and-login-button.md
- docs/specs/manual-header-with-app-name-and-login-button.md
- docs/runs/manual-header-with-app-name-and-login-button/frontend-builder.md
- docs/runs/manual-header-with-app-name-and-login-button/frontend-ux-reviewer.md
- docs/runs/manual-header-with-app-name-and-login-button/frontend-code-reviewer.md
- docs/runs/manual-header-with-app-name-and-login-button/frontend-review-security.md
- docs/runs/manual-header-with-app-name-and-login-button/pr-frontend.md

`git status` currently shows exactly these paths (3 modified, 4 untracked entries covering the docs above); no other changes are present. No `.env` or secrets.

## Base branch recommendation

The header edits the same three files as the 602 footer (`app.component.html/css/spec.ts`) and relies on 602's `:host` column-flex layout (`main { flex: 1 }`, footer at the bottom, `html, body { margin: 0 }`). Those changes exist only on `feature/602-test-version-control`, not on `master`.

Recommendation: create the new branch from the current branch (`feature/602-test-version-control`), not from `master`.

- Base on current branch (recommended): the working tree already contains the 602 layout, the code applies as is, and the build/tests (7/7) were run on this basis. Implication: the new branch contains the 3 commits of 602 (`25717dd` footer, `5ccc65c` and `3c5b449` agent/tooling/handover changes). A PR targeting `master` would show those commits too. Two ways to keep the review clean:
  1. Stacked PR: target `feature/602-test-version-control` so the diff shows only the header commit; retarget to `master` once 602 is merged (merge 602 first, merge order matters).
  2. Wait until 602 is merged to `master`, then rebase this branch onto `master` (no conflicts expected, only 602 commits drop out) and open the PR against `master`.
- Base on `master`: not recommended. The header would have no footer layout to coexist with (AC7 not verifiable), the CSS/HTML/spec would conflict with 602 on merge, and the verified result would differ from what was tested.
- Note: commits `5ccc65c` and `3c5b449` contain unrelated tooling/agent/handover changes (`.github/agents/*`, `.github/config.json`, `.vscode/mcp.json`, `scripts/ado-mcp.mjs`). They will ride along into any PR based on this branch; the human should decide whether to keep them in the 602 PR or split them out.
- `git remote -v` returned no remotes, so push and PR creation require a remote to be configured first. The 3 commits of 602 are unpushed, so they must be pushed (or merged) before a stacked PR can target them.

## Summary

Adds a semantic `<header>` as the first child of `AppComponent`, before `<main>` and outside `<router-outlet />`, so it shows on every route. Left: `<h1><a routerLink="/">{{ title }}</a></h1>` (the page's only `<h1>`; the old `<h1>` in `<main>` is removed). Right: `<button type="button">Login</button>`, a placeholder with no click handler and no authentication state. The header is a full-width flex row (`space-between`, `flex: 0 0 auto`, static), uses the footer's palette (`#1f2937` / `#ffffff`), has a 44x44 minimum button size and visible `:focus-visible` outlines. `app.module.ts` is unchanged (`RouterLink` comes via `AppRoutingModule`).

## Acceptance criteria

The task file has no acceptance criteria; these are from the spec.

- [x] AC1 `<header>` before `<main>`, outside `<router-outlet />`
- [x] AC2 `Desk Booking` from `AppComponent.title` in `<h1>` wrapping `<a routerLink="/">`
- [x] AC3 Native `<button type="button">` with text `Login` on the right
- [x] AC4 Login is a placeholder: no handler, no navigation, no auth state
- [x] AC5 Exactly one `<h1>` (in the header); `<main>` holds only `<router-outlet />`
- [x] AC6 Full width, name left / button right, no horizontal scrolling (implemented in CSS; not checked in a browser)
- [x] AC7 602 sticky footer unchanged; header static, not sticky/fixed
- [x] AC8 Keyboard-operable button, visible focus indicator, WCAG AA contrast (about 14:1)
- [x] AC9 Unit tests for header, single `h1`, `RouterLink` to `/`, and `header button`
- [x] AC10 `npm run build` and `ng test` succeed
- [x] AC11 `routerLink` works without changes to `app.module.ts`; spec `TestBed` keeps `RouterModule.forRoot([])`

## Test results

- `npm run build` (Frontend/): success, no errors or warnings (builder; code reviewer re-ran it).
- `npx ng test --watch=false --browsers=ChromeHeadless` (Frontend/): 7 of 7 passed (builder). The code reviewer did not re-run it.
- Lint: not configured in the scaffold.

## Open review findings

All reviewers approved. No blocker or high findings.

| Source | Severity | Finding |
| --- | --- | --- |
| Security | medium | Pre-existing: 8 `npm audit` advisories (4 high, 4 moderate) in Angular 18.2.x (`@angular/core`, `common`, `compiler`). Not introduced by this task, and the header does not use the affected features. Plan a separate Angular upgrade before adding `HttpClient` or auth. |
| Security | low | Angular toolchain and TypeScript are several majors behind (18.x vs 22.x). Same upgrade task. |
| Security | low | Placeholder `Login` button: re-review when real auth is built (no tokens in `localStorage` or URLs, guards on new routes). |
| UX | low | No `:hover`/`:active` style on the `Login` button. |
| UX | low | `Login` is a silent no-op; accepted by the spec. |
| UX | low | Home link click area is text height only (about 24px); meets WCAG 2.2 AA minimum. Optional `display: inline-block; padding: 0.5rem 0;`. |
| Code | low | `width: 100%` on `header` is redundant (harmless, mirrors the footer). |
| Code | low | Duplicated header-name assertion in the spec. |
| Code | low | No assertion that `main` contains no `h1` (suggested `expect(compiled.querySelector('main h1')).toBeNull()`). |

Notes:
- `<main>` has no heading now; future route components should start at `h2`.
- Not verified in a real browser; do a manual check at 320px width (name and `Login` on one row) and at wide widths.
- The security report is at `frontend-review-security.md` (the mode-defined name), not `frontend-security-reviewer.md`.
- Git warns that LF will be replaced by CRLF in `app.component.html` on the next git write; harmless.

## How to verify

1. `cd Frontend; npm install; npm run build` - expect success without warnings.
2. `npx ng test --watch=false --browsers=ChromeHeadless` - expect 7 of 7 passing.
3. `npm start`, open `http://localhost:4200`:
   - Header at the top: `Desk Booking` (link to `/`) on the left, `Login` button on the right.
   - Clicking `Login` does nothing; clicking `Desk Booking` stays on `/`.
   - Tab to the link and the button: a visible white focus outline appears.
   - The page has a single `<h1>` (devtools), and the footer from 602 is still at the viewport bottom on a short page.
   - Resize to 320px: no horizontal scrollbar, name and button stay on one row.
