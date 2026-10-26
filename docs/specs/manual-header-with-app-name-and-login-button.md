---
id: manual-header-with-app-name-and-login-button
title: Header with app name and login button
area: frontend
status: specified
---

# Spec manual-header-with-app-name-and-login-button - Header with app name and login button

## Summary
Add a header to the Angular app shell (`AppComponent`) with the app name "Desk Booking" on the left and a login button on the right. It must coexist with the sticky footer from task 602 (column flex layout on `:host`). Decisions confirmed by the human: the `Login` button is a placeholder (no action), the app name is a link to home (`routerLink="/"`) rendered as the single page `<h1>`, the header scrolls with the page, and authentication state is out of scope.

## Scope
- Add a `<header>` element to `Frontend/src/app/app.component.html`, before `<main>`, outside `<router-outlet />` (shown on every route).
- Style it in `Frontend/src/app/app.component.css`.
- Remove the existing `<h1>{{ title }}</h1>` from `<main>`; the header name becomes the single `<h1>`.
- Extend `Frontend/src/app/app.component.spec.ts` with header, link and button tests and update the existing `h1` test to query the header.

## Out of scope
- Backend, API, database.
- Real authentication: login page, login form, `AuthService`, guards, token handling, logout, user-name display, authenticated state (header always shows `Login`).
- Adding any route (including `/login`); the `Login` button has no click handler.
- Per-route header visibility (the `showHeader` route-data mechanism from the overview does not exist in the current scaffold).
- Navigation links, admin link, i18n, theming, PrimeNG/Font Awesome.
- Extracting a `HeaderComponent` / `SharedModule` (the app has only `AppComponent`; revisit when `shared/` is introduced).

## Area
**frontend** - only a visual element in the SPA shell; no data, endpoint or server behaviour.

## Current state
- `app.component.html`: `<main><h1>{{ title }}</h1><router-outlet /></main>` followed by `<footer>© {{ currentYear }} Desk Booking. All rights reserved.</footer>`.
- `app.component.css`: `:host` is a column flex container (`min-height: 100vh`/`100dvh`), `main { flex: 1 }`, footer is full width with dark background `#1f2937` and white text.
- `AppComponent`: `readonly title = 'Desk Booking'`, `readonly currentYear`.
- `app-routing.module.ts`: `routes = []` (no routes at all); it imports `RouterModule.forRoot(routes)` and re-exports `RouterModule`.
- `app.module.ts`: declares `AppComponent` (non-standalone) and imports `AppRoutingModule`, so `routerLink` is already available in the `AppComponent` template; no module change is needed.
- `app.component.spec.ts`: 4 tests (create, title, h1 text, footer); `TestBed` already imports `RouterModule.forRoot([])`, so `RouterLink` is available in tests as well.
- Navigating to `/` with an empty route table is valid (empty URL matches the root), so `routerLink="/"` causes no navigation error.

## Functional requirements
- FR1. `AppComponent` renders a `<header>` as the first child of the host, before `<main>`, outside `<router-outlet />`, so it appears on every route.
- FR2. The header contains the app name from `AppComponent.title` (`Desk Booking`) in its left part; not hard-coded in the template.
- FR3. The header contains a `<button type="button">` labelled `Login` in its right part. `type="button"` is required.
- FR4. Layout: header is a flex row, `justify-content: space-between`, `align-items: center`, full width, `box-sizing: border-box`, with padding consistent with the footer (`1rem`).
- FR5. Login button is a placeholder: it renders, has no `(click)` handler, no navigation and no side effect. Optionally add a one-line code comment that real login is a separate task.
- FR6. The app name is a link to home: `<h1><a routerLink="/">{{ title }}</a></h1>` inside the header. `RouterLink` comes from the existing `AppRoutingModule` -> `RouterModule` export; do not add routes or change `app.module.ts`. The link must have a visible focus indicator and keep the header text colour (no default blue/underlined browser link styling that breaks contrast).
- FR7. Duplicate title: remove the existing `<h1>{{ title }}</h1>` from `<main>`; the header name is the only `<h1>` on the page. `<main>` keeps only `<router-outlet />`.
- FR8. Positioning: header scrolls with the page (static, not sticky/fixed), as the first child of the `:host` flex column above `main`. Footer layout from 602 (`:host` column flex, `main { flex: 1 }`, footer at bottom) remains unchanged; the header must not get `flex: 1` or shrink (`flex: 0 0 auto`).
- FR13. Authentication state is not modelled: the button always reads `Login`; no `isLoggedIn` flag or `Logout`.
- FR9. Styling: same dark palette as the footer (`#1f2937` background, `#ffffff` text); button has a visible border/background distinct from the header, readable contrast (WCAG AA), `cursor: pointer`, and a visible focus indicator (do not remove the outline without replacement).
- FR10. Responsive: on narrow viewports the name and button stay on one row without horizontal scrolling; long text wraps (`overflow-wrap: anywhere`); button remains at least 44x44 px touch target.
- FR11. Accessibility: semantic `<header>` landmark (`banner`); the button is keyboard-focusable and activatable with Enter/Space (native `<button>`); the name link is a native `<a>` with `href` generated by `routerLink`.
- FR12. Unit tests (in `app.component.spec.ts`): see AC9.

## API / data changes
None.

## UI behaviour
- On load of `http://localhost:4200` the header is visible at the top: "Desk Booking" (link to `/`) left, `Login` button right.
- Clicking "Desk Booking" navigates to `/` (no visible change today as no routes exist).
- Clicking `Login` does nothing.
- Header scrolls out of view with the page; footer stays at the viewport bottom on short pages and below content on long pages (no regression).

## Acceptance criteria
- [ ] AC1: `AppComponent` template contains a `<header>` before `<main>`, outside `<router-outlet />`, rendered on every route.
- [ ] AC2: The left part of the header displays the text `Desk Booking`, sourced from `AppComponent.title`, inside an `<h1>` that wraps an `<a routerLink="/">`.
- [ ] AC3: The right part of the header contains a native `<button type="button">` with the text `Login`.
- [ ] AC4: Clicking `Login` is a placeholder: no navigation, no side effect, no click handler; authentication state is not modelled (always `Login`).
- [ ] AC5: The page contains exactly one `<h1>` (inside the header); the `<h1>` in `<main>` is removed and `<main>` contains only `<router-outlet />`.
- [ ] AC6: The header spans the full width, name left / button right, on desktop and mobile viewports without horizontal scrolling.
- [ ] AC7: The sticky footer from task 602 still works (bottom of viewport on short pages, below content on long pages, no overlap); the header is static (scrolls with the page), not sticky/fixed.
- [ ] AC8: The `Login` button is keyboard-operable and shows a visible focus indicator; text/background contrast meets WCAG AA.
- [ ] AC9: Unit tests in `app.component.spec.ts` assert: a `header` exists and contains `Desk Booking`; the existing h1 test now queries `header h1` and contains `Desk Booking`, and `querySelectorAll('h1').length` is 1; a link in the header (`header a`) carries `RouterLink` (`By.directive(RouterLink)`) pointing to `/` (its `urlTree` serializes to `/`, or its `href` resolves to `/`); a `header button` exists with `type="button"` and text `Login`; existing create/title/footer tests still pass.
- [ ] AC11: `routerLink` works in the `AppComponent` template without changes to `app.module.ts` (`RouterModule` already available via `AppRoutingModule`), and the spec `TestBed` keeps `RouterModule.forRoot([])` so the link test compiles.
- [ ] AC10: `npm run build` and `ng test` in `Frontend/` succeed without errors or warnings.

## Risks
- A placeholder button that does nothing may confuse users; accepted by the human until an auth task exists.
- `routerLink` is only available if the router module is imported; today it is via `AppRoutingModule` (app) and `RouterModule.forRoot([])` (tests). If `AppComponent` is later made standalone, `RouterLink` must be imported explicitly.
- Moving the `<h1>` changes the existing `should render title` test; the test must be updated, not deleted.
- Link inside `<h1>` inherits default anchor styling; must be reset to header colours to keep contrast.
- The task has no tags; unrelated to implementation.

## Open Questions
None. All questions resolved by the human:
- Q1 Login button: placeholder (renders, click does nothing).
- Q2 App name: link to home (`routerLink="/"`).
- Q3 Heading: remove `<h1>` from `<main>`; header name is the single `<h1>`; h1 test queries the header.
- Q4 Positioning: header scrolls with the page (top of the flex column; 602 footer layout unchanged).
- Q5 Auth state: out of scope (always `Login`).
