# Frontend code review - manual-header-with-app-name-and-login-button

Verdict: approved

Findings: blocker 0, high 0, medium 0, low 3

## Checks
- Spec compliance (AC1-AC9, AC11): met. `<header>` precedes `<main>` outside `<router-outlet />`; `<h1><a routerLink="/">{{ title }}</a></h1>` uses `AppComponent.title`; `<button type="button">Login</button>` has no handler; `<main>` holds only `<router-outlet />`; `app.module.ts` is unchanged; spec `TestBed` keeps `RouterModule.forRoot([])`.
- AC7 (sticky footer): the `:host`, `main` and `footer` CSS is unchanged; the header is `flex: 0 0 auto` and static.
- AC8 (contrast and focus): white on `#1f2937` and `#1f2937` on white both pass WCAG AA; `:focus-visible` outlines are set on the link and the button.
- RxJS / change detection: no subscriptions or state added; nothing to leak.
- Typing: no `any`. The spec uses optional chaining on `urlTree`, which is acceptable.
- Module boundaries and reuse: no new modules or components, as the spec requires.
- Dead code / duplication: none beyond the low items below.
- Build: `npm run build` in `Frontend/` succeeds with no errors or warnings. Lint is not configured. I did not re-run `ng test`; the builder reports 7/7 passing.

## Findings

### Low
1. `Frontend/src/app/app.component.css` (`header { width: 100%; ... }`): redundant. In a column flex container the item already stretches, and `box-sizing: border-box` is only needed if `width` is kept. Fix: optionally drop `width: 100%`. It is harmless and mirrors the footer, so it can stay.
2. `Frontend/src/app/app.component.spec.ts` (tests `should render title` and `should render a header before main containing the app name`): the `Desk Booking` assertion in the header is partly duplicated. Fix: optionally merge the header-presence assertions or leave as is; the spec requires both.
3. `Frontend/src/app/app.component.spec.ts`: no assertion that `<main>` contains only `<router-outlet>` (FR7/AC5), and none that the button has no click handler (AC4). The single-`h1` assertion covers the main part of FR7. Fix: optionally add `expect(compiled.querySelector('main h1')).toBeNull()`.

## Notes
- Responsive and contrast behaviour is implemented per the spec but was not checked in a browser (as the builder notes). That is a UX review matter.
