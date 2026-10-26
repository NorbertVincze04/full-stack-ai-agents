# Handover - task manual-header-with-app-name-and-login-button: header with app name and login button

- Source: manual (no Azure DevOps work item)
- Area: frontend only
- Commit: `08771c8` on branch `feature/manual-header-with-app-name-and-login-button`, stacked on `feature/602-test-version-control` (local, not pushed, no remote configured, no PR)
- Final status: `done` (local task file only; no Azure state to update)
- Human acceptance: yes (page checked visually; implementation confirmed correct)

## Summary
The Angular app shell (`AppComponent`) now renders a static `<header>` before `<main>` and outside `<router-outlet />`, so it appears on every route. The left part holds the app name as `<h1><a routerLink="/">{{ title }}</a></h1>` (the page's only `<h1>`); the right part holds a placeholder `<button type="button">Login</button>` with no click handler and no authentication state. The header reuses the footer palette and does not change the task 602 sticky-footer layout. No backend, API or database changes.

## What was implemented

### Frontend
- `app.component.html`: `<header>` as first child of the host with the `h1`/link and the `Login` button; the old `<h1>` in `<main>` is removed, so `<main>` holds only `<router-outlet />`. An HTML comment notes that real login is a separate task.
- `app.component.css`: header is a full-width flex row (`justify-content: space-between`, `align-items: center`, `box-sizing: border-box`, `padding: 1rem`, `gap: 1rem`, `flex: 0 0 auto`, static). Colours `#1f2937` / `#ffffff`. Link inherits the header colour with no underline (underline on hover); title has `overflow-wrap: anywhere`. Button is white with `#1f2937` text and a 2px white border, minimum size 44x44, `cursor: pointer`, does not shrink. `:focus-visible` outline (2px white, 2px offset) on link and button.
- `app.component.spec.ts`: 7 tests. The existing h1 test now queries `header h1` and asserts exactly one `h1`; new tests cover the header before `main`, the `RouterLink` link (`By.directive(RouterLink)`, `urlTree` is `/`, element is `A`) and the `header button` (`type="button"`, text `Login`). Create, title and footer tests unchanged.
- `app.module.ts` unchanged (`RouterLink` comes from `AppRoutingModule` -> `RouterModule`); spec `TestBed` keeps `RouterModule.forRoot([])`.

### Backend
None.

### Database
None.

## Files changed
Commit `08771c8` (10 files, 442 insertions, 3 deletions):
- `Frontend/src/app/app.component.html`, `.css`, `.spec.ts`
- `docs/tasks/manual-header-with-app-name-and-login-button.md`, `docs/specs/manual-header-with-app-name-and-login-button.md`
- `docs/runs/manual-header-with-app-name-and-login-button/`: `frontend-builder.md`, `frontend-code-reviewer.md`, `frontend-review-security.md`, `frontend-ux-reviewer.md`, `pr-frontend.md`

`git status` after the commit was clean. This handover and the task `status` change are uncommitted.

## Tools and technologies
Angular 18.2 (NgModule app), Angular Router (`routerLink`), CSS flexbox, Karma/Jasmine (headless Chrome), npm.

## Dependencies added
None.

## API contract / migration
None.

## How to run and verify
```
cd Frontend
npm install
npm run build
npx ng test --watch=false --browsers=ChromeHeadless    # 7 specs
npm start                                              # http://localhost:4200
```
Manual browser checks (done by the human): header at the top with `Desk Booking` left and `Login` right; `Login` does nothing; the name link stays on `/`; a visible focus outline on Tab; footer from 602 still at the viewport bottom on short pages.

## Acceptance criteria
The task file has no acceptance criteria; the list below comes from the spec. Frontend Tester was not run; the builder reported a clean build and 7/7 unit tests.

| AC | Status | Evidence |
| --- | --- | --- |
| AC1 `<header>` before `<main>`, outside `<router-outlet />` | Verified | Human acceptance; unit test asserts header before `main`; code reviewer confirms |
| AC2 `Desk Booking` from `AppComponent.title` in `<h1>` wrapping `<a routerLink="/">` | Verified | Human acceptance; `header h1` test and `RouterLink` test; code reviewer confirms |
| AC3 Native `<button type="button">` with text `Login` on the right | Verified | Human acceptance; `header button` test (type and text); code reviewer confirms |
| AC4 `Login` is a placeholder (no handler, no navigation, no auth state) | Verified | Human acceptance; code reviewer and security reviewer confirm no handler or state in the template |
| AC5 Exactly one `<h1>`; `<main>` holds only `<router-outlet />` | Verified | Human acceptance; test asserts one `h1`; code reviewer confirms `<main>` content |
| AC6 Full width, name left / button right, no horizontal scroll on desktop and mobile | Verified | Human acceptance (visual check); CSS per spec; UX review approved |
| AC7 602 sticky footer still works; header static | Verified | Human acceptance (visual check); `:host`, `main` and footer CSS unchanged; header is `flex: 0 0 auto`; code and UX reviewers confirm |
| AC8 Button keyboard-operable, visible focus, WCAG AA contrast | Verified | Human acceptance; native `<button>`, `:focus-visible` outlines, about 14:1 contrast (UX and code reviewers) |
| AC9 Unit tests for header, single `h1`, `RouterLink` to `/`, `header button` | Verified | Builder ran 7/7 passing; spec contents confirmed by code reviewer. Tests were not re-run by a reviewer or tester |
| AC10 `npm run build` and `ng test` succeed without errors or warnings | Verified | `npm run build` clean (builder, re-run by code reviewer); `ng test` 7/7 (builder, `--watch=false --browsers=ChromeHeadless`). `npm test` default configuration not run; lint is not configured |
| AC11 `routerLink` works without changes to `app.module.ts`; spec keeps `RouterModule.forRoot([])` | Verified | `app.module.ts` is not in the commit; `RouterLink` test passes; code reviewer confirms |

Summary: 11 / 11 verified.

## Open findings
All reviewers approved. No blocker or high findings.

| Source | Severity | Finding |
| --- | --- | --- |
| frontend-security #1 | medium (dependency advisory; not blocking, only `critical` blocks) | `npm audit --omit=dev`: 8 advisories (4 high, 4 moderate, 0 critical) in Angular 18.2.x (`@angular/core`, `common`, `compiler`). Pre-existing, not introduced by this task; the header does not use the affected features (i18n, SVG bindings, `HttpClient`, SSR). Fix needs an Angular major upgrade. Follow-up 1 |
| frontend-security #2 | low | Angular toolchain and TypeScript several majors behind (18.x vs 22.x). Follow-up 1 |
| frontend-security #3 | low | Placeholder `Login`; re-review when real auth is built (no tokens in `localStorage` or URLs, guards on new routes) |
| frontend-ux #1 | low | No `:hover`/`:active` style on the `Login` button |
| frontend-ux #2 | low | `Login` is a silent no-op; accepted by the spec |
| frontend-ux #3 | low | Home link click area is text height only (about 24px); meets WCAG 2.2 AA minimum. Optional `display: inline-block; padding: 0.5rem 0;` |
| frontend-code #1 | low | `width: 100%` on `header` is redundant (harmless) |
| frontend-code #2 | low | Duplicated header-name assertion in the spec |
| frontend-code #3 | low | No `main h1` null assertion (`expect(compiled.querySelector('main h1')).toBeNull()`) |
| note | - | `<main>` has no heading; future route components should start at `h2` |

## Final status
All 11 acceptance criteria are verified, and there are no blocker findings or open critical dependency advisories. Local task `status` is set to `done`. The task source is manual, so no Azure DevOps state was changed.

## Follow-ups
1. Create a task to upgrade Angular to a supported release (with matching CLI, TypeScript, Zone.js) and re-run `npm audit`; do it before adding `HttpClient` or auth work.
2. Configure a remote, push `feature/602-test-version-control` and then this branch, and open a stacked PR targeting the 602 branch (retarget to `master` once 602 is merged). Commits `5ccc65c` and `3c5b449` (agents and tooling) ride along on this base; decide whether to split them out.
3. Implement real login (separate task): login route/page, auth service, guards, logout, authenticated state in the header.
4. Optional polish: hover/active style for the `Login` button, larger home-link target, `main h1` null assertion, and a 320px manual check.
