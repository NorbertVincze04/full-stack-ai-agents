# Frontend build - manual-header-with-app-name-and-login-button

Verdict: done

## Git state
- Working tree branch: `feature/602-test-version-control` (HEAD `3c5b449`, ahead of `master` `f20ecd3`; contains unpushed commits `25717dd`, `5ccc65c`, `3c5b449`).
- The 602 footer layout is present in the working tree and committed (`:host` column flex, `min-height: 100vh/100dvh`, `main { flex: 1 }`, dark full-width footer with the copyright text).
- Before this task, only the spec and task files for this task were untracked. Nothing was committed or pushed.

## Acceptance criteria -> implementation
- AC1/FR1: `<header>` is the first child of `AppComponent`, before `<main>` and outside `<router-outlet />`.
- AC2/FR2/FR6: `<h1><a routerLink="/">{{ title }}</a></h1>` on the left.
- AC3/AC4/FR3/FR5/FR13: `<button type="button">Login</button>` on the right, no click handler, no auth state. An HTML comment notes that real login is a separate task.
- AC5/FR7: the `<h1>` is removed from `<main>`, which now holds only `<router-outlet />`.
- AC6/FR4/FR10: header is a full-width flex row (`space-between`, `align-items: center`, `box-sizing: border-box`, `padding: 1rem`, `gap: 1rem`). Title has `overflow-wrap: anywhere` and the button does not shrink. Not tested in a browser at narrow widths.
- AC7/FR8: header is `flex: 0 0 auto` and static. The 602 footer CSS is unchanged.
- AC8/FR9/FR11: colours `#1f2937` / `#ffffff`. The button is white with `#1f2937` text and a 2px white border, min size 44x44, `cursor: pointer`. `:focus-visible` outline (2px white, offset 2px) is set on the link and the button. The link inherits the header colour with no underline (underline on hover).
- AC9: `app.component.spec.ts` has 7 tests. The existing h1 test now queries `header h1` and asserts exactly one `h1`. New tests cover the header before `main`, the `RouterLink` link (`By.directive(RouterLink)`, `urlTree` is `/`, element is `A`), and the `header button` (type `button`, text `Login`). Create, title and footer tests are unchanged.
- AC11: `app.module.ts` is unchanged. The spec `TestBed` still imports `RouterModule.forRoot([])`.
- AC10: see commands below.

## Files changed
- `Frontend/src/app/app.component.html`
- `Frontend/src/app/app.component.css`
- `Frontend/src/app/app.component.spec.ts`

## Dependencies added
None.

## Commands run
- `npm run build` in `Frontend/`: succeeded, no errors or warnings. Only an npm "new version available" notice.
- `npx ng test --watch=false --browsers=ChromeHeadless` in `Frontend/`: 7 of 7 passed.
- `ng lint` was not run, as no lint is configured in the scaffold.

## Known gaps
- No visual check in a real browser; the responsive and contrast behaviour is implemented per the spec but not manually verified.
- `ng test` was run with `--watch=false --browsers=ChromeHeadless`, which may differ from the default `npm test` configuration.
