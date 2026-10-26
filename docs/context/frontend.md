# Frontend context

## Stack and commands
Angular 18.2 (NgModule, not standalone), TypeScript 5.5, RxJS 7.8, plain CSS, Karma/Jasmine. No PrimeNG, no `HttpClientModule`, no environment files yet. Node >= 22.18.

| Command (in `Frontend/`) | Purpose |
| --- | --- |
| `npm start` | `ng serve` on http://localhost:4200 |
| `npm run build` | `ng build` |
| `npm run test:ci` | Karma headless (`ChromeHeadless`, single run) |

## Structure (path -> role)

| Path | Role |
| --- | --- |
| `src/main.ts` | bootstraps `AppModule` |
| `src/app/app.module.ts` | root module: declares `AppComponent`, imports `BrowserModule`, `AppRoutingModule` |
| `src/app/app-routing.module.ts` | `RouterModule.forRoot(routes)`; `routes` is empty |
| `src/app/app.component.*` | shell: `<header>` (app name link to `/`, placeholder Login button) + `<main><router-outlet/></main>` + footer with `currentYear` |
| `src/app/app.component.spec.ts` | specs for title, header, link, Login button, footer |
| `src/styles.css`, `src/app/app.component.css` | global and shell styles |
| `src/index.html` | host page (`<app-root>`, `<noscript>` fallback) |

Target structure when features arrive: `core/` (services, guards, interceptors, models), `features/` (routed pages), `shared/` (reusable components).

## Config / environment
None (no `environment.ts`). Backend API would be `http://localhost:3000/api`.

## API or routes
No routes. No API calls.

## Conventions
- NgModule architecture; one module per feature; declare components in modules.
- Component selector prefix `app`; plain CSS per component; reactive forms for forms.
- Accessible markup: landmarks (`header`, `main`, `footer`), labels, keyboard operable controls.

## Tests
Jasmine specs next to the code (`*.spec.ts`), 7 specs in `app.component.spec.ts`.

## Decisions and known gaps
- Login button is a placeholder; real login is a separate task.
- Angular 18.2.x has known `npm audit` findings; upgrade is a tracked follow-up (see `docs/handover/601.md`).
- No ESLint, no CSP, no 404 route.
