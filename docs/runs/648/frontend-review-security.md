# Frontend security review - task 648 (booking_calendar)

Verdict: approved

Scope: `Frontend/src/app/features/booking/`, `core/auth.service.ts` (`getToken()`), `app-routing.module.ts`; read per `frontend-build.md` and `frontend-tests.md`.

## Findings
| # | Severity | File / package | Problem | Suggested fix |
| --- | --- | --- | --- | --- |
| 1 | medium | `@angular/*` 18.2.14 (existing, none added) | `npm audit --omit=dev`: 8 advisories (4 high, 4 moderate; 0 critical) in core/common/compiler/forms/router/platform-browser/animations. Reported only, not blocking. Exposure is limited: the booking feature uses no `innerHTML`, i18n, SSR/`HttpTransferCache`, SVG/MathML bindings or XSRF interceptor. | Planned Angular upgrade (already tracked in `docs/handover/601.md`). |
| 2 | low | `core/auth.service.ts` `SESSION_STORAGE_KEY` | JWT in `sessionStorage` is readable by any XSS; no CSP. Approved earlier (R2/R4); `getToken()` adds no new storage or exposure. | Add a CSP (nginx) when hardening; consider an httpOnly cookie later. |
| 3 | low | `booking/booking.service.ts` `withAuth` | Bearer header is attached by hand per call, no interceptor. Safe now (URL is always `environment.apiUrl`, same origin in prod), but a future call could omit or leak the token. | When more API calls arrive, use one interceptor restricted to `environment.apiUrl`. |
| 4 | low | `environment.ts` | Dev `apiUrl` is plain `http://localhost:3000/api`; prod is the relative `/api`. No secrets in either file. | None (dev only). |

## Checks with no finding
- Secrets/tokens in code, environment files or logs: none. The only `console` use is `main.ts` bootstrap error.
- Token is read only via `AuthService.getToken()` (null when signed out or expired); never logged, put in URLs or exposed in templates.
- XSS: no `innerHTML`, `bypassSecurityTrust*`, `eval` or `document.write` in `Frontend/src`. All values render via interpolation (`{{ }}`), and server dates are only compared and formatted, never inserted as HTML.
- Open redirects: none; 401 handling stays on the page (no navigation, no URL from input).
- 401 handling: `fail()` calls `AuthService.logout()` (storage and timer cleared) and shows `You must log in first`. No token means a synthetic 401 with no request. `logout()` emits `null`, which clears booked dates without a reload loop.
- Error messages: only fixed strings (`LOGIN_REQUIRED_MESSAGE`, `GENERIC_ERROR_MESSAGE`); server messages and status codes are not shown.
- Path injection: withdraw uses `encodeURIComponent(date)`; the date comes from the client-generated window.
- Personal data: `GET /bookings/mine` returns dates only; nothing extra is stored client-side.
- Auth guard: `/` is public by design (FR7); the API enforces authorization. No new protected routes.

## Dependencies
- `npm audit --omit=dev`: 8 vulnerabilities (0 critical, 4 high, 4 moderate), all the Angular 18 line; fix needs a breaking major upgrade (no `audit fix` run). Per the rating rule these are `medium` at most.
- `npm outdated`: Angular 18.2.14 vs 22.2.4 latest; `@angular/cli` and `build-angular` 18.2.21; `typescript` 5.5.4 (latest 7.0.2); `zone.js` 0.14.10 (0.16.3). No dependency was added by this task.

## Counts
blocker: 0 | high: 0 | medium: 1 | low: 3
