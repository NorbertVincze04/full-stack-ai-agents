# Frontend UX review: manual-login-and-register-pages

Verdict: changes-requested

Report path: docs/runs/manual-login-and-register-pages/frontend-ux-reviewer.md

Findings: blocker 0, high 1, medium 6, low 6

Scope: static review of the templates, styles and components listed in `frontend-builder.md` against the spec (FR1, FR2, FR6, FR11, AC3-AC5) and the existing look and feel (plain CSS, dark `#1f2937` header and footer, Info page layout). The app was not run in a browser; responsive findings are derived from the CSS. No code was changed.

## What conforms
- FR6: native `<button type="button" aria-label="Log out">`, `aria-hidden` and `focusable="false"` SVG, 44x44 minimum, `:focus-visible` outline, user name as interpolated text, no `Register` link in the header.
- FR11: a `<label for>` for every input, correct `autocomplete` values, `type="password"`, `aria-invalid` plus `aria-describedby` on error ids, `role="alert"` for form errors, `role="status"` for the success message, `<h2>` page headings, 44 px inputs and buttons.
- Colour contrast: `#b91c1c` and `#166534` on white and `#6b7280` borders pass 4.5:1 and 3:1. White on `#1f2937` passes.
- Header buttons, the focus ring and the dark palette follow the existing shell style. Auth pages are centred with `max-width: 28rem`, like the Info page (`40rem`).

## Findings

### High

**H1. Signed-in header does not fit narrow viewports (reflow, WCAG 1.4.10).**
- File: [Frontend/src/app/app.component.css](../../../Frontend/src/app/app.component.css#L40-L46), [lines 80-85](../../../Frontend/src/app/app.component.css#L80-L85), [app.component.html](../../../Frontend/src/app/app.component.html#L2-L17).
- Problem: `.header-actions` is `flex: 0 0 auto` with no wrap, and there are no media queries. Signed in, it holds the Help link (about 51 px), the name (up to 12rem = 192 px), the 44 px logout button and two 1rem gaps. That is about 319 px with a long name, more than the 288 px available at a 320 px viewport, so the header overflows horizontally. With a short name the `h1` has about 65 px left, and `overflow-wrap: anywhere` breaks "Desk Booking" mid-word, one letter per line.
- Fix: allow `.header-actions` to wrap, or let the header wrap (`flex-wrap: wrap` on `header` and `.header-actions`). Use a smaller `max-width` for `.user-name` on narrow screens, for example `max-width: min(12rem, 35vw)`, or move the actions below the title under about 480 px. Keep every target at least 44 px.

### Medium

**M1. No focus or error summary management on failed submit (FR11, WCAG 3.3.1/3.3.3 usability).**
- Files: [login.component.ts](../../../Frontend/src/app/features/auth/login/login.component.ts#L40-L47), [register.component.ts](../../../Frontend/src/app/features/auth/register/register.component.ts#L86-L92).
- Problem: when the form is invalid, `markAllAsTouched()` shows the inline errors but focus stays on the submit button. Keyboard and screen-reader users hear nothing about which field failed. The same applies to 401/409/400 server errors: the `role="alert"` paragraph is announced, but a 409 or mapped 400 error on a field gets no focus and no form-level notice.
- Fix: after an invalid submit, focus the first control with `aria-invalid="true"`. After a server field error, focus that field. Optionally add a short form-level `role="alert"` message such as "Please fix the errors below".

**M2. Focus is lost after logout and after navigation (WCAG 2.4.3).**
- Files: [app.component.html](../../../Frontend/src/app/app.component.html#L7-L17), [app.component.ts](../../../Frontend/src/app/app.component.ts#L15-L18).
- Problem: clicking the focused logout button removes it from the DOM (`@if`) and swaps in the `Login` button. Focus drops to `<body>` and keyboard users restart from the top. The same happens after the login or register redirect, because the focused submit button is destroyed.
- Fix: after logout, focus the header `Login` button or the `h1` link. After navigation, move focus to the `main` or page heading (`tabindex="-1"`), or use the Router `NavigationEnd` event for this.

**M3. Page title never changes (WCAG 2.4.2).**
- Files: [auth-routing.module.ts](../../../Frontend/src/app/features/auth/auth-routing.module.ts#L7-L10), [index.html](../../../Frontend/src/index.html#L5).
- Problem: `/login` and `/register` have no route `title`, so every page is "Desk Booking" in the tab and in screen-reader history. The spec asks for route data to be considered.
- Fix: add `title: 'Login - Desk Booking'` and `title: 'Register - Desk Booking'` to the two routes (and `info`).

**M4. Password rules are not shown up front, and one message uses jargon (FR2, WCAG 3.3.2).**
- Files: [register.component.html](../../../Frontend/src/app/features/auth/register/register.component.html#L36-L46), [register.component.ts](../../../Frontend/src/app/features/auth/register/register.component.ts#L74).
- Problem: the 8-72 characters, one letter and one digit rules appear only after a failed blur or submit. "Password must be at most 72 bytes" is unclear to users (a multi-byte character counts more than one).
- Fix: add a persistent hint under the label, such as "At least 8 characters, with a letter and a digit", linked through `aria-describedby` together with the error id. Reword the limit message, for example "Password is too long".

**M5. Submit state handling hides focus and status (FR1, FR11).**
- Files: [login.component.html](../../../Frontend/src/app/features/auth/login/login.component.html#L39-L41), [register.component.html](../../../Frontend/src/app/features/auth/register/register.component.html#L61-L63).
- Problem: `[disabled]="submitting"` on the focused submit button drops focus in some browsers and removes it from the tab order. The text change "Logging in..." is not in a live region, and `aria-busy` on a button is not announced reliably.
- Fix: keep the button focusable with `aria-disabled="true"` plus the existing in-flight guard, and style it like `:disabled`. Announce progress through the existing `role="status"` region.

**M6. Signed-in state change has no context for assistive tech, and the landing page is empty (AC3, AC4, D5).**
- Files: [app.component.html](../../../Frontend/src/app/app.component.html#L6-L7).
- Problem: after login the user is sent to `/`, which renders an empty `<main>` (no home route exists). The only feedback is the header swap, which is not announced. The name is a bare `<span>`, so a screen-reader user hears just a name, with no "signed in as" context. The logout button has no `title`, so mouse users get an unlabelled, ambiguous icon (the door glyph reads as "exit" or "home").
- Fix: add a visually hidden prefix ("Signed in as") to `.user-name` and add `title="Log out"` to the button (the `aria-label` stays). Optionally add a polite live region for "Signed in as X" and "Signed out". Track the empty `/` page as a follow-up.

### Low

**L1. Auth pages differ in typography from the Info page.** [auth-form.css](../../../Frontend/src/app/features/auth/auth-form.css#L1-L11) sets no `color: #1f2937`, `line-height: 1.5` or `overflow-wrap: anywhere`, which `.info` sets in [info.component.css](../../../Frontend/src/app/features/info/info.component.css#L1-L9). Long server messages or e-mails can overflow at 320 px. Align the host styles.

**L2. Truncated user name has no full-text access.** [app.component.css](../../../Frontend/src/app/app.component.css#L80-L85) uses `text-overflow: ellipsis` at 12rem with no `title`. Long names are cut with no way to read them. Add `[title]="user.fullName"` (or wrap, per H1).

**L3. The header `Login` button stays active on `/login`.** It has no `aria-current` or disabled state, and "Login" appears four times on the page (header button, `h2`, submit, link from `/register`). Hide or mark the header button on `/login`, or set `aria-current="page"` on it.

**L4. No hover or active state, and duplicated button styling.** Header buttons ([app.component.css](../../../Frontend/src/app/app.component.css#L58-L69)) and form submit buttons ([auth-form.css](../../../Frontend/src/app/features/auth/auth-form.css#L55-L64)) define separate button styles with no `:hover`. Add hover feedback and consider a shared button style as more pages arrive.

**L5. Email inputs lack mobile hints.** Add `autocapitalize="none"` and `spellcheck="false"` to the email inputs in both pages ([login](../../../Frontend/src/app/features/auth/login/login.component.html#L12-L21), [register](../../../Frontend/src/app/features/auth/register/register.component.html#L19-L29)) to avoid auto-capitalised addresses on mobile.

**L6. Copy mismatch and heading levels on the Info page (pre-existing, now visible).** [info.component.html](../../../Frontend/src/app/features/info/info.component.html#L2-L4) uses an `<h1>` while the header already owns the `<h1>`, so `/info` has two. Step 1 says "Log in with your work account", which does not mention registering. Change the Info heading to `<h2>` and align the copy. This is out of this task's code but affects the flow consistency.

## Notes (not findings)
- The success message on `/login` is in `role="status"` but is rendered at page load, so some screen readers will not announce it. Acceptable because it comes right after the `h2`; consider a live region present at load if this matters.
- The `''` lazy route loading the auth chunk on every unknown URL is a recorded gap, not a UX item here.

---

## Re-review 1

Verdict: approved

Report path: docs/runs/manual-login-and-register-pages/frontend-ux-reviewer.md

Findings (open after re-review): blocker 0, high 0, medium 6, low 7

Scope: static review of the changes listed under "Fix iteration 1" in `frontend-builder.md`: [app.component.css](../../../Frontend/src/app/app.component.css), [app.component.html](../../../Frontend/src/app/app.component.html), [app-routing.module.ts](../../../Frontend/src/app/app-routing.module.ts), [auth.service.ts](../../../Frontend/src/app/core/auth.service.ts), plus the unchanged [login.component.ts](../../../Frontend/src/app/features/auth/login/login.component.ts) and [auth-routing.module.ts](../../../Frontend/src/app/features/auth/auth-routing.module.ts) for regression checks. The app was not run in a browser; the layout result is derived from the CSS.

### Previous high finding

**H1 (signed-in header at 320 px): resolved.**
- `header` now has `flex-wrap: wrap` and `gap: 0.5rem 1rem`; `.header-actions` has `flex: 0 1 auto`, `flex-wrap: wrap`, `min-width: 0`; `.user-name` is capped at `min(12rem, 40vw)`.
- At 320 px the header content box is 288 px. Worst case for the actions is Help (about 51 px) + 16 + name (40vw = 128 px) + 16 + logout (44 px) = about 255 px. The title is about 150 px, so title + actions (about 421 px) do not fit in one row; the actions wrap under the title and fit in 288 px. No horizontal overflow, and the `h1` is no longer squeezed into a one-letter-per-line column.
- At about 480 px and wider the title and actions share one row. Between about 320 and 440 px the actions sit on a second row. The signed-out header (Help + Login) wraps the same way and also fits.
- All targets keep the 44 px minimum; the focus outline is unchanged.

**L2 (truncated name): partially resolved.** `[title]="user.fullName"` is added. The tooltip is available to mouse users only; touch and keyboard users cannot read a truncated name (the span is not focusable). Kept as low, see L2 below.

### Regression check

- Route matcher: `authMatcher` accepts exactly one segment, `login` or `register`, and consumes nothing, so `AuthRoutingModule` still receives the segments and `guestGuard` still applies. `/login?registered=1` still works because the matcher sees path segments only, and the `routerLink="/login"` on the header `Login` button and the Login/Register cross-links still resolve. No UX flow change. The match is case-sensitive, like the existing routes.
- `/` and `/info` are unaffected. Unknown URLs (for example `/foo`) were not handled before either (no 404 route); that is the recorded gap, not a regression.
- Login page: the new rejection of an invalid session in `AuthService.login()` surfaces through the existing generic message "Login failed, please try again later", which is shown in the `role="alert"` paragraph and re-enables the button (`submitting = false` in the error handler). No dead end.
- Header state: `currentUser$` still drives the `@if`/`@else`. `isAuthenticated()` is now a pure check, so the guard cannot change the header as a side effect. Logout still clears the session and navigates to `/`.
- Expiry timer: when the token expires, the header silently changes back to `Login` with no navigation and no message. This is not a regression, but it makes the existing M6 (no announcement of sign-in state changes) apply to sign-out by expiry as well. Added to M6 below.
- No new inline styles, no template changes besides `[title]`, no ARIA changes. The spec items conform as before (FR6, FR11, AC3-AC5).

### Open findings (unchanged unless noted)

**Medium (6), none addressed in this iteration:**
- **M1.** No focus or error summary management on failed submit (login and register).
- **M2.** Focus lost after logout and after the login/register redirect.
- **M3.** Page title never changes (`/login`, `/register`, `/info`).
- **M4.** Password rules not shown up front; "72 bytes" wording.
- **M5.** Submit button `disabled` drops focus; progress is not in a live region.
- **M6.** No assistive-tech context for the signed-in state ("Signed in as"), logout button has no `title`, `/` is empty after login. Extended: a silent sign-out when the token expires is also not announced and leaves the user on a page with no feedback besides the header change. Suggested fix addition: a polite live region message such as "Your session has expired" when the expiry timer fires.

**Low (7):**
- **L1.** Auth pages lack the Info page host typography (`color`, `line-height`, `overflow-wrap`).
- **L2 (reduced).** Truncated name is readable by mouse tooltip only. Suggested fix: allow the name to wrap on narrow screens (`white-space: normal; overflow-wrap: anywhere` below about 480 px) or expose the full name in the logout button label ("Log out Jane Doe").
- **L3.** Header `Login` button stays active on `/login` with no `aria-current`.
- **L4.** No hover/active states; duplicated button styles.
- **L5.** E-mail inputs lack `autocapitalize="none"` and `spellcheck="false"`.
- **L6.** Info page has a second `<h1>` and copy that does not mention registering (pre-existing).
- **L7 (new).** When the actions wrap under the title, `justify-content: space-between` on `header` places a single item at the start, so the Help/name/logout group is left-aligned while it is right-aligned on wide screens. File: [app.component.css](../../../Frontend/src/app/app.component.css#L8-L18). Not a usability blocker; for a consistent look, add `margin-left: auto` to `.header-actions` so it stays right-aligned when wrapped.

### Conclusion

The only high finding is resolved and no regressions were found, so there are no blocking items. The six medium items are carried over and should be scheduled as follow-ups (M1-M3 and M5 first, as they affect keyboard and screen-reader users on the two new pages).
