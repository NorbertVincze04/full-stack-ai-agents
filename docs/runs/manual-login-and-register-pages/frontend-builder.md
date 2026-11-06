# Frontend build: manual-login-and-register-pages

Verdict: done

## Acceptance criteria -> implementation
| AC | How |
| --- | --- |
| AC1 | `LoginComponent` (`/login`): reactive form, calls `AuthService.login`, navigates to `/`; 401 -> "Invalid email or password", 429 -> "Too many attempts, try again later", others generic; in-flight guard (`submitting`, disabled button) |
| AC2 | `RegisterComponent` (`/register`): `fullName`, `email`, `password`, `confirmPassword`, validators mirror D1; sends only `fullName`, `email`, `password`; 400 `errors[]` mapped inline per field, 409 -> "Email already registered" on the e-mail field, 429/other generic; success -> `/login?registered=1`, token ignored, no sign-in |
| AC3 | Header shows `user.fullName` (text interpolation) instead of `Login` when signed in |
| AC4 | Native `<button type="button" aria-label="Log out">` with inline SVG open door (`aria-hidden`), 44x44 min, focus-visible; `logout()` clears the session and navigates to `/` |
| AC5 | `/login` and `/register` lazy via `AuthModule`, link to each other; header `Login` button has `routerLink="/login"`; no `Register` link |
| AC6 | `guestGuard` on both routes redirects signed-in users to `/` |
| AC7 | `AuthService` stores `{ token, user }` in `sessionStorage` (`deskbooking.auth`); on load and in the guard the JWT `exp` is decoded (UI only); missing/malformed/expired -> entry removed, signed out |
| AC10 | `environment.ts` `apiUrl: http://localhost:3000/api`; `environment.prod.ts` `apiUrl: /api` via `fileReplacements` in the production build (verified: built bundle contains `/api`, no `localhost:3000`); no proxy file |

FR11/FR12: labels, `autocomplete` (`name`, `email`, `current-password`, `new-password`), `aria-invalid`/`aria-describedby` to error ids, `role="alert"`/`role="status"`, `<h2>` page headings, password inputs `type="password"`, no `innerHTML`, passwords never stored or placed in URLs.

## Files created
- `Frontend/src/environments/environment.ts`, `environment.prod.ts`
- `Frontend/src/app/core/auth.models.ts`, `auth.service.ts`, `guest.guard.ts`
- `Frontend/src/app/features/auth/`: `auth.module.ts`, `auth-routing.module.ts`, `auth-validators.ts`, `auth-form.css`, `login/login.component.{ts,html}`, `register/register.component.{ts,html}`

## Files changed
- `Frontend/angular.json` (production `fileReplacements`)
- `Frontend/src/app/app.module.ts` (`provideHttpClient()`), `app-routing.module.ts` (lazy `AuthModule` route after `info`)
- `Frontend/src/app/app.component.{ts,html,css}` (user name, logout button, Login button -> `/login`)
- Existing specs `app.component.spec.ts` and `info-route.spec.ts`: only added `provideHttpClient()` + `provideHttpClientTesting()` because `AppComponent` now injects `AuthService`. The Login-button spec still passes unchanged (signed-out state).
- Context: `docs/context/frontend.md`, `docs/context/project.md` (status line)

## Dependencies added
None (`package.json` unchanged; no Font Awesome).

## Commands
- `npm run build` in `Frontend/`: success, no budget warnings (auth lazy chunk 44 kB raw).
- `npm run test:ci` in `Frontend/`: 13 of 13 pass.

## Not done (by request)
- FR13 Jasmine specs for login page, register page, `AuthService`, `guestGuard` and the signed-in header (frontend tester on demand). Only the existing specs above were adjusted.

## Known gaps / assumptions
- No home or 404 route yet.
- No interceptor or refresh (out of scope).
- Superseded by iteration 1: the `''` lazy route and the guard-only expiry check (see below).
- Client e-mail check uses the server regex (`^[^\s@]+@[^\s@]+\.[^\s@]+$`); password minimum counts characters, maximum counts UTF-8 bytes, as the server does.
- Register form shows server 400 messages verbatim (static server strings, rendered as text).
- Not exercised against the running backend/browser; verified by build and existing tests only.

## Fix iteration 1

Verdict: done

Findings addressed:
| Finding | Fix |
| --- | --- |
| UX H1 (signed-in header overflows at 320 px) | `app.component.css`: `header` and `.header-actions` use `flex-wrap: wrap` with `0.5rem 1rem` gaps, `.header-actions` is `flex: 0 1 auto; min-width: 0; justify-content: flex-end`, `.user-name` max width is `min(12rem, 40vw)`. Help + name + logout is about 255 px, so the actions drop under the title instead of overflowing. Also added `[title]="user.fullName"` on the name (UX L2, code L7). Not checked in a browser. |
| Code M2 (`''` route loads auth chunk everywhere) | `app-routing.module.ts`: the `''` route is replaced by a `matcher` route that matches only a single `login` or `register` segment and consumes nothing, so `AuthRoutingModule` (spec routes `login`, `register`, `guestGuard`) is unchanged. The auth chunk now loads only on those URLs; `/` and unknown URLs no longer load it. Verified with a temporary router spec (now removed): `/login` and `/register` render the forms, `/` navigates without matching auth. |
| Code M3.1 (`login()` skips validation) | `login()` builds the session and rejects it with an error when `isValidSession` fails (missing or invalid `exp`, expired, bad user shape); nothing is stored or emitted. The login page shows the generic failure message. |
| Code M3.2 (`isAuthenticated()` side effects) | `isAuthenticated()` is a pure check on the in-memory session. Storage clean-up and stream updates happen only in `applySession`, `onExpiryTimer`, `logout` and the constructor load. |
| Code M3.3 (header ignores expiry) | `applySession` sets a timer from the token `exp` (capped at 2^31-1 ms and re-checked on fire); when it fires the session is cleared and `currentUser$` emits `null`, so the header returns to `Login`. The timer is cleared on logout and on each new session. |

Files changed: `Frontend/src/app/app-routing.module.ts`, `Frontend/src/app/core/auth.service.ts`, `Frontend/src/app/app.component.{css,html}`, `docs/context/frontend.md`.

Dependencies added: none.

Commands:
- `npm run build` in `Frontend/`: success; auth lazy chunk 44.00 kB; no budget warnings.
- `npm run test:ci` in `Frontend/`: 13 of 13 pass.

Open: FR13/AC11 specs (code M1) not written by request; remaining medium and low UX/code items are not addressed.
