# Frontend context

## Stack and commands
Angular 18.2 (NgModule, not standalone), TypeScript 5.5, RxJS 7.8, plain CSS, Karma/Jasmine. No PrimeNG. `HttpClient` via `provideHttpClient()` in `AppModule`. Node >= 22.18.

| Command (in `Frontend/`) | Purpose |
| --- | --- |
| `npm start` | `ng serve` on http://localhost:4200 |
| `npm run build` | `ng build` |
| `npm run test:ci` | Karma headless (`ChromeHeadless`, single run) |

## Structure (path -> role)

| Path | Role |
| --- | --- |
| `src/main.ts` | bootstraps `AppModule` |
| `src/app/app.module.ts` | root module: declares `AppComponent`, imports `BrowserModule`, `AppRoutingModule`, provides `HttpClient` |
| `src/app/app-routing.module.ts` | `RouterModule.forRoot(routes)`; lazy `info` -> `InfoModule`, then a `matcher` route (matches only `/login` and `/register`, consumes nothing) -> `AuthModule` (children `login`, `register`) |
| `src/app/app.component.*` | shell: `<header>` (app name link, `.header-actions`: Help link, then `Login` button -> `/login` when signed out, or `.user-name` + `.logout-button` (inline SVG open door, `aria-label="Log out"`) when signed in) + `<main><router-outlet/></main>` + footer; `logout()` clears the session and goes to `/` |
| `src/app/app.component.spec.ts`, `src/app/info-route.spec.ts` | shell specs (provide `HttpClient` testing providers) |
| `src/app/core/auth.service.ts` | `AuthService`: `login`, `register` (token ignored), `logout`, `isAuthenticated`, `currentUser$`; `sessionStorage` key `deskbooking.auth` (`{ token, user }`); session also held in memory, validated (JWT `exp`, user shape) on load and in `login()`; `isAuthenticated()` is side-effect free; a timer set from `exp` emits `null` on `currentUser$` and clears storage on expiry |
| `src/app/core/auth.models.ts`, `guest.guard.ts` | models; `guestGuard` (functional `CanActivateFn`, signed-in -> `/`) |
| `src/app/features/auth/` | `AuthModule`, `AuthRoutingModule` (guarded `login`, `register`), `auth-validators.ts` (client mirror of server rules), shared `auth-form.css`, `login/` and `register/` components |
| `src/environments/` | `environment.ts` (`apiUrl: http://localhost:3000/api`), `environment.prod.ts` (`/api`, swapped by `fileReplacements` in the production build) |
| `src/app/features/info/` | `InfoModule`, `InfoRoutingModule` (child route `''`), `InfoComponent` (static h1 "How it works" + 3-step `<ol>`), `info.component.spec.ts` (2 specs) |
| `src/styles.css`, `src/app/app.component.css` | global and shell styles |
| `src/index.html` | host page (`<app-root>`, `<noscript>` fallback) |

Target structure when features arrive: `core/` (services, guards, interceptors, models), `features/` (routed pages), `shared/` (reusable components).

## Config / environment
`environment.apiUrl`: `http://localhost:3000/api` for `ng serve`/dev (no proxy file), `/api` in the production build (nginx proxies `/api/`). No secrets in environment files.

## API or routes
| Route | Target |
| --- | --- |
| `/info` | lazy `InfoModule` -> `InfoComponent` (static page) |
| `/login` | lazy `AuthModule` -> `LoginComponent` (`?registered=1` shows the success message); `guestGuard` |
| `/register` | lazy `AuthModule` -> `RegisterComponent`; `guestGuard` |

API calls (via `AuthService`): `POST {apiUrl}/auth/login` `{ email, password }`; `POST {apiUrl}/auth/register` `{ fullName, email, password }` (`confirmPassword` never sent). Status handling: 400 field errors inline, 401/409/429/other generic messages.

## Conventions
- NgModule architecture; one module per feature; declare components in modules.
- Component selector prefix `app`; plain CSS per component; reactive forms for forms.
- Accessible markup: landmarks (`header`, `main`, `footer`), labels, keyboard operable controls.

## Tests
Jasmine specs next to the code (`*.spec.ts`): 97 total (13 existing + 84 new). The existing 13 remain (8 in `app.component.spec.ts`, 3 in `info-route.spec.ts`, 2 in `info.component.spec.ts`). The new specs are in `core/auth.service.spec.ts`, `core/guest.guard.spec.ts`, `features/auth/login/login.component.spec.ts`, `features/auth/register/register.component.spec.ts` and `app.component.auth.spec.ts`, with shared helper `Frontend/src/app/testing/auth-test-utils.ts`.

## Decisions and known gaps
- Session (approved R2/R4): JWT and `{ fullName, email, type }` in `sessionStorage` (XSS-readable within the tab, no CSP); no password stored; register does not sign in.
- Expiry is checked on load, in `login()`, in `guestGuard` and by a timer; no interceptor, no refresh, no protected-route guard yet.
- Header wraps (`flex-wrap`) so the signed-in state fits 320 px; user name has a `title`.
- No 404 route yet (unknown URLs match nothing).
- Angular 18.2.x has known `npm audit` findings; upgrade is a tracked follow-up (see `docs/handover/601.md`).
- No ESLint, no CSP, no 404 route.
- Header link label is "Help"; page heading stays "How it works".
