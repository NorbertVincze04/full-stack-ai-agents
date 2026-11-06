# Frontend tests: manual-login-and-register-pages

Verdict: pass

## Results
- `npm run test:ci` in `Frontend/`: 97 of 97 pass (13 pre-existing + 84 new), 0 failed, no warnings.
- `npm run build` in `Frontend/`: success (auth lazy chunk 44.00 kB, initial 279.67 kB).
- No application code changed.

## Failing tests
None. Two specs failed on the first run because of the test setup (test module lacked `RouterModule`, so `routerLink` rendered no `href`); fixed in the specs, not an app defect.

## New spec files
- `Frontend/src/app/core/auth.service.spec.ts`
- `Frontend/src/app/core/guest.guard.spec.ts`
- `Frontend/src/app/features/auth/login/login.component.spec.ts`
- `Frontend/src/app/features/auth/register/register.component.spec.ts`
- `Frontend/src/app/app.component.auth.spec.ts` (header, signed out and signed in)

## New test helper (not a spec)
- `Frontend/src/app/testing/auth-test-utils.ts` (JWT-shaped token factory, user fixture, input setter). Not part of the app build (`tsconfig.app.json` only includes `main.ts`).

## Changed spec files
None. The existing `app.component.spec.ts` and `info-route.spec.ts` already pass unchanged (the Login button spec still holds for the signed-out state).

## Coverage matrix (FR13 / AC11)
| Area | Tests |
| --- | --- |
| `AuthService` login | POST to `environment.apiUrl/auth/login` with email and password; session saved as `{ token, user }`, password never stored; HTTP error propagates and stays signed out; expired or malformed token in the login response rejected |
| `AuthService` register | POST body only `fullName`, `email`, `password` (`confirmPassword` dropped); register response token not stored, not emitted, not signed in; 409 propagated |
| `AuthService` load | valid session restored; expired token, malformed tokens (not a JWT, bad payload, no `exp`, non-numeric `exp`), malformed JSON, invalid user shape: signed out and entry removed |
| `AuthService` logout / expiry | logout clears `sessionStorage` and emits `null`; expiry timer signs out and clears storage while the app is open (`jasmine.clock`) |
| `guestGuard` | signed out allowed; signed in redirects to `/`; expired and malformed token allowed |
| Login page | labels, autocomplete, password type, link to `/register`; required validation with `aria-describedby`/`aria-invalid`, no API call; trimmed email sent; success navigates to `/` and stores the session; 401, 429, 500/503/network and expired-token-response messages (no server detail leaked); double-submit guard (disabled, `aria-busy`, one request); retry after failure; error cleared on resubmit; `registered=1` shows the success message, other values do not |
| Register page | labels, autocomplete, password types, link to `/login`; D1 rules (required, whitespace-only name, name 100/101, invalid emails, email max 254, password min 8, max 72 bytes incl. multi-byte, letter+digit); mismatch message on `confirmPassword`; only `fullName`/`email`/`password` sent (trimmed); success navigates to `['/login'] { registered: '1' }`, not signed in, no password in navigation; 409 on the email field; 400 field errors mapped inline, unknown field ignored, 400 without fields general alert, server text rendered as text; 429 and 500 messages; double-submit guard; button re-enabled after error |
| Header | signed out: Login button (`type=button`) to `/login`, no Register link, no logout button; signed in: full name, no Login button, native `button[aria-label="Log out"]` with `aria-hidden` SVG after the name, name rendered as text; logout click clears storage, calls `navigateByUrl('/')`, header returns to Login; expired stored token shows Login |

## Notes
- Specs use `RouterTestingHarness` with the real `AuthService` and `HttpTestingController`; `Router.navigateByUrl`/`navigate` are spied to assert redirects.
- Not covered by unit tests: keyboard operability, the 44x44 px size and focus styles of the logout button (CSS; needs a browser or e2e run). No e2e runner exists in `Frontend/`.
