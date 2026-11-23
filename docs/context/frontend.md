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
| `src/app/features/auth/` | `AuthModule`, `AuthRoutingModule` (guarded `login`, `register`), `auth-validators.ts` (client mirror of server rules), shared `auth-form.css`, `login/` and `register/` components; each password input sits in `.password-wrap` with an eye `button.password-toggle` (`type="button"`, `aria-label` Show/Hide password, `aria-pressed`; `showPassword`, register also `showConfirmPassword`) |
| `src/environments/` | `environment.ts` (`apiUrl: http://localhost:3000/api`), `environment.prod.ts` (`/api`, swapped by `fileReplacements` in the production build) |
| `src/app/features/terms/` | `TermsModule`, `TermsRoutingModule`, `TermsComponent` (static h1 "Terms of Service" + placeholder text, not legal text); route `/terms`, header link "Terms" after Help |
| `src/app/features/info/` | `InfoModule`, `InfoRoutingModule` (child route `''`), `InfoComponent` (static h1 "How it works" + 3-step `<ol>`), `info.component.spec.ts` (2 specs) |
| `src/app/features/booking/` | task 648 + mockup office, lazy `BookingModule` on `/`: `BookingComponent` (top bar: selected date left (`No date selected` when none), `Book Now`/`Withdraw booking` right (`Book Now` disabled without a date), `aria-live` message; below, `.booking-layout` with calendar and plan side by side (wrap, stacked when narrow); holds selected date (null on load, task 649), `selectedDesk`, own bookings, desks, availability; `select`/`deselect`/`selectDesk`/`deselectDesk`; `BOOKING_NOW` token for tests), `calendar/CalendarComponent` (custom Mon-first month grid, prev/next month, disabled days `disabled`+`aria-disabled`, `aria-pressed` on selected; outputs `dateSelected(iso)` and `dateDeselected` when the selected day is clicked), `desk-plan/DeskPlanComponent` (presentational: 4 x 4 grid of desk buttons from `row`/`col` (task 650: 16 desks A1-D4, four 2 x 2 blocks A B / C D; `block-left-edge` (col 3) and `block-top-edge` (row 3) classes add spacing, `data-block` = id letter, labels only), states `neutral` (signed out/not loaded), `available`, `booked` (shows booker name as text), `selected`, `yours`; icon + text + colour, `aria-label` "Desk D03, available" / "Desk D04, booked by Ana", `disabled`+`aria-disabled` unless selectable (available, selected and `yours` are selectable), `aria-pressed` = `pressed` (selected desk, also own desk, which keeps state `yours` and gets class `picked`); outputs `deskSelected(id)` and `deskDeselected`; legend; log-in hint when signed out), `booking.models.ts` (`Desk`, `DeskAvailability`, `MyBooking`), `booking-dates.ts` (4 bookable weekdays, `Mon, 9 Nov 2026` formatting, local dates), `BookingService` (`listMine` -> `{date, desk|null}[]`, `book(date, desk)`, `withdraw(date)` with Bearer token; no token -> 401 without a call), `DeskService` (`list()` public, `availability(date)` Bearer; no token -> 401 without a call) |
| `src/styles.css`, `src/app/app.component.css` | global and shell styles |
| `src/index.html` | host page (`<app-root>`, `<noscript>` fallback) |

Target structure when features arrive: `core/` (services, guards, interceptors, models), `features/` (routed pages), `shared/` (reusable components).

## Config / environment
`environment.apiUrl`: `http://localhost:3000/api` for `ng serve`/dev (no proxy file), `/api` in the production build (nginx proxies `/api/`). No secrets in environment files.

## API or routes
| Route | Target |
| --- | --- |
| `/` | lazy `BookingModule` -> `BookingComponent` (top bar + calendar + desk plan, public; `pathMatch: 'full'`) |
| `/info` | lazy `InfoModule` -> `InfoComponent` (static page) |
| `/login` | lazy `AuthModule` -> `LoginComponent` (`?registered=1` shows the success message); `guestGuard` |
| `/register` | lazy `AuthModule` -> `RegisterComponent`; `guestGuard` |

API calls (via `AuthService`): `POST {apiUrl}/auth/login` `{ email, password }`; `POST {apiUrl}/auth/register` `{ fullName, email, password }` (`confirmPassword` never sent). Status handling: 400 field errors inline, 401/409/429/other generic messages.

Booking calls (via `BookingService`, `Authorization: Bearer`): `GET {apiUrl}/bookings/mine` (`[{date, desk|null}]`), `POST {apiUrl}/bookings` `{ date, desk }`, `DELETE {apiUrl}/bookings/:date`. 401 -> `AuthService.logout()` + `You must log in first`; 409 on book -> conflict message + availability reload; no desk selected -> `Please select a desk first` (no request); other errors -> generic message; 404 on withdraw also drops the date locally. `AuthService.getToken()` returns the token or null when signed out/expired.

Desk calls (via `DeskService`): `GET {apiUrl}/desks` (public, on page load, layout error -> generic message), `GET {apiUrl}/desks/availability?date=` (Bearer; reloaded on login and on every date change, desk selection resets; own book/withdraw updates the plan locally).

## Conventions
- NgModule architecture; one module per feature; declare components in modules.
- Component selector prefix `app`; plain CSS per component; reactive forms for forms.
- Accessible markup: landmarks (`header`, `main`, `footer`), labels, keyboard operable controls.

## Tests
Jasmine specs next to the code (`*.spec.ts`): 247 total, all green (`npm run test:ci`, task 649). The booking specs (`booking.component*.spec.ts`, `booking.service.spec.ts`) use a `setup` that takes the day (default none) and flushes desk/availability requests; toggle specs: `calendar.component.spec.ts`, `desk-plan.component.spec.ts`, `booking.component.toggle.spec.ts`. The auth/shell specs are as before: `core/auth.service.spec.ts`, `core/guest.guard.spec.ts`, `features/auth/*`, `app.component*.spec.ts`, `info-route.spec.ts`, `features/info`, with shared helper `Frontend/src/app/testing/auth-test-utils.ts`.

## Decisions and known gaps
- Select/deselect (task 649): toggling is selection state only (no request); deselecting the day clears availability and desk selection; withdraw resets the desk selection. Specs for these rules exist (see Tests).
- Session (approved R2/R4): JWT and `{ fullName, email, type }` in `sessionStorage` (XSS-readable within the tab, no CSP); no password stored; register does not sign in.
- Booking (task 648): client date rules are UX only (server enforces); the 4-weekday window uses the browser date; no interceptor, the token is attached in `BookingService`/`DeskService`.
- Mockup office: desk is required for new bookings; the plan is neutral and not selectable when signed out; booker names are shown as text only; legacy bookings (`desk: null`) count as booked for the date but occupy no desk; a stale availability (other users' changes) is only refreshed on date change, login or a 409.
- Expiry is checked on load, in `login()`, in `guestGuard` and by a timer; no interceptor, no refresh, no protected-route guard yet.
- Header wraps (`flex-wrap`) so the signed-in state fits 320 px; user name has a `title`.
- No 404 route yet (unknown URLs match nothing).
- Angular 18.2.x has known `npm audit` findings; upgrade is a tracked follow-up (see `docs/handover/601.md`).
- No ESLint, no CSP, no 404 route.
- Header link label is "Help"; page heading stays "How it works".
