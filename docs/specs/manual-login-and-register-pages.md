---
id: manual-login-and-register-pages
title: Login and register pages
area: frontend, backend
status: specified
---

# Spec manual-login-and-register-pages - Login and register pages

## Summary
Add login and register pages to the Angular app. A user can sign in, or create an account when they have none. After sign-in the header shows the user's name instead of the `Login` button, with an open-door icon button (inline SVG, no new dependency) to its right that logs the user out. This needs a backend change: the backend has `POST /api/auth/login` only, no register endpoint, and the login result contains no user name.

All previously open questions are answered (round 2); decisions are recorded under "Decisions".

## Decisions (human answers)
- D1 (Q1): register fields `fullName`, `email`, `password`, `confirmPassword`. `confirmPassword` is client-side only (never sent). Rules: `fullName` trimmed, 1-100 chars; `email` valid format, max 254, stored lower-case; `password` 8-72 (bcrypt limit; server counts bytes), at least one letter and one digit; passwords must match. Validated on client and server.
- D2 (Q2): backend `POST /api/auth/register` is in scope; 201 on success; duplicate e-mail returns 409 "Email already registered".
- D3 (Q3): login and register responses add `user: { fullName, email, type }` next to `token` in `payload` (additive).
- D4 (Q4): routes `/login` and `/register`, lazy-loaded (`AuthModule` children). No `Register` link in the header. Header `Login` button navigates to `/login`. `/login` links to `/register` and back.
- D5 (Q5): login -> `/`. Register -> `/login` with a success message ("Account created, please log in"), NO automatic sign-in. Logout -> `/`. A signed-in user opening `/login` or `/register` is redirected to `/`.
- D6 (Q6): `sessionStorage`; token expiry (`exp`) checked on load.
- D7 (Q7): inline SVG open-door icon; no new dependency.
- D8 (Q8): `environment.ts` with `apiUrl: http://localhost:3000/api`; no dev proxy. See "API base URL in the container build" for the production value.

## Scope
- Frontend: auth feature (login page, register page, lazy module + routes), `AuthService`, header change (user name + logout icon button), `environment` files and `HttpClient` setup, inline SVG open-door icon, tests.
- Backend: `POST /api/auth/register`; `user` object in login and register responses; `userRepository.create`; register rate limit; tests; context docs.
- Header: the `Login` placeholder button in `app.component.html` is replaced by real behaviour.

## Out of scope
- Route guards for other pages, role-based UI, admin features, booking pages.
- Password reset / forgot password, e-mail verification, secret keys, account lockout.
- Token refresh and an HTTP interceptor adding `Authorization` (no protected API exists yet).
- Database schema changes: `users` already has `full_name`, `email` (unique), `password_hash`, `type` (`admin|user`), `created_at`.
- Compose/nginx/Containerfile changes (the nginx container already proxies `/api/`). Note: the backend port is not published to the host in `compose.yaml`; see the container build note below.
- A "show password" toggle, a `Register` link in the header.

## Area
**frontend, backend**. Frontend alone is not enough: AC2 (register) needs an endpoint that does not exist and AC3 (user's name) needs the name, which is not in the login response (`{ token }`) or in the JWT claims (`id`, `email`, `type`). `containers` is not included: no image, compose or `.env` change; the container build only needs a Frontend-side `environment.prod.ts` (see below).

## Scope flags
- `ui-changes`: yes - two new pages and routes, header change, icon.
- `logic-changes`: yes - auth state, forms and validation, register logic, session persistence.
- `security-relevant`: yes - authentication, password input, token storage, user input, personal data (name, e-mail), public write endpoint.
- `dependencies-changed`: no - the open-door icon is an inline SVG (R5 safer alternative approved, D7); `HttpClientModule`/`ReactiveFormsModule` are part of Angular, `package.json` is unchanged.
- `database-changes`: no - uses the existing `users` table (insert of a new row via the app, no migration).
- `scaffolding-only`: no.

## Current state
- Backend: `POST /api/auth/login` returns `{ success, payload: { token } }`, rate limited (10 failed / 15 min / IP); `userRepository` has `findByEmail` only; bcryptjs and JWT (HS256, `id`, `email`, `type`) in `authService`. No register route. Local container schema `"ico-env"`; Cloud Foundry `public.users`.
- Frontend: Angular 18 NgModule; routes: lazy `info` only; header has app-name link, `Help` link, placeholder `Login` button; no `HttpClientModule`, no `environment` files, no services, no `core/` folder.
- Containers: frontend served by nginx on `127.0.0.1:${FRONTEND_PORT:-4200}`, which proxies `/api/` to `backend:3000`; the backend has no published host port.
- Target design (`.github/docs/PROJECT_OVERVIEW.md`) known weaknesses (JWT in localStorage, weak server-side validation, no expiry check) must not be copied.

## Functional requirements
- FR1. Login page (`/login`): reactive form with email and password, both required, accessible labels, inline validation messages, in-flight guard against double submit. Calls `POST /api/auth/login`. 401 shows a generic "Invalid email or password"; 429 shows "Too many attempts, try again later"; other errors show a generic failure message. Nothing reveals whether the e-mail exists. Shows the "Account created, please log in" message when arriving from registration (query param `registered=1`, no personal data in the URL). On success navigates to `/`.
- FR2. Register page (`/register`): reactive form with `fullName`, `email`, `password`, `confirmPassword` and the D1 rules (client-side mirror of the server rules, mismatch message on `confirmPassword`), link to `/login`. Only `fullName`, `email`, `password` are sent. 400 field errors are shown inline; 409 shows "Email already registered" on the e-mail field; 429 and other errors show a generic message. On success navigates to `/login?registered=1`; the user is NOT signed in and any token in the register response is ignored/not stored.
- FR3. Backend `POST /api/auth/register`: validates the body per D1 (400 with `{ success:false, message:"Validation failed", errors:[{field,message}] }`; `fullName` and `email` must be strings, unknown fields ignored), trims `fullName`, normalises e-mail to lower case, hashes the password with bcrypt (same cost as login), inserts the user with `type = 'user'` always (never taken from the request), parameterised SQL, never logs the body, password or hash, is rate limited, and the response contains no password or hash. 201 `{ success:true, payload:{ token, user:{ fullName, email, type } } }` (same shape as login per D3). Duplicate e-mail: a `findByEmail` pre-check and handling of the unique violation (`23505`, race) both return 409 `{ success:false, message:"Email already registered" }`.
- FR4. Login response (D3): `payload` becomes `{ token, user:{ fullName, email, type } }`; `token` and the 400/401/429 behaviour are unchanged. `findByEmail` must also return `full_name`.
- FR5. `AuthService` (`Frontend/src/app/core/`): `login`, `register`, `logout`, `currentUser$` (fullName, email, type), session handling per D6. Header subscribes to it. The API base URL is read from `environment.apiUrl` (not hard-coded in services).
- FR6. Header: signed in -> the `Login` button is replaced by the user's full name (plain text interpolation, escaped by Angular, no `innerHTML`) and, to its right, a native `<button type="button">` with an inline SVG open-door icon (`aria-label="Log out"`, icon `aria-hidden`, visible focus, at least 44x44 px, keyboard operable). Signed out -> `Login` button navigating to `/login`; no `Register` link. `Help` link stays.
- FR7. Logout clears the auth state and the `sessionStorage` entry, then navigates to `/`.
- FR8. Redirects: login -> `/`; register -> `/login?registered=1`; logout -> `/`; signed-in user opening `/login` or `/register` -> `/` (functional `CanActivate` guard or equivalent on these two routes only).
- FR9. Session persistence (D6): `sessionStorage` holds the token and the user object (`fullName`, `email`, `type`) under one key; no password. On app load the stored token's `exp` claim is decoded (UI-only, no verification) and, if missing, malformed or expired, the entry is removed and the user is signed out. Expiry is also checked when the stored state is read by the redirect guard.
- FR10. API base URL (D8): `src/environments/environment.ts` with `apiUrl: 'http://localhost:3000/api'` used by `ng serve`/dev; no `proxy.conf.json`. See "API base URL in the container build".
- FR11. Accessibility: `<label>` per input, `autocomplete` attributes (`email`, `current-password`, `new-password`, `name`), password fields `type="password"`, error text linked via `aria-describedby`, success and error messages in `role="status"`/`role="alert"`, icon-only button has an accessible name, pages use `<h2>` (the header owns the `<h1>`).
- FR12. Security: passwords never stored in the browser, logged or placed in URLs; no `innerHTML` for user data; client-side validation is a convenience only, the server validates again; no secrets in `environment` files.
- FR13. Tests: frontend Jasmine specs for login page, register page, `AuthService` (with `HttpTestingController`, including expiry-on-load and logout clearing storage), the redirect guard and the header (signed-out, signed-in name + door button, logout click). Backend `node:test` tests with a fake repository for register (201, validation 400 per rule, duplicate 409, `23505` race -> 409, no hash in response, `type` forced to `user` even if the body sends `admin`, e-mail lower-cased, rate limit) and for the `user` object in the login response. Existing frontend and backend tests must keep passing, updating the header spec only where the placeholder `Login` button changes.
- FR14. Docs: update `docs/context/frontend.md` and `docs/context/backend.md` (routes, endpoint, structure, decisions, environment files, inline SVG icon) and `Backend/.env.example` only if new env vars are added (e.g. a register rate-limit setting).

## API / data changes
- New `POST /api/auth/register`: request `{ fullName, email, password }`; responses 201 (`payload.token`, `payload.user`), 400 validation, 409 duplicate e-mail, 429, 500. Repository gains `create({ fullName, email, passwordHash })` (insert with `type` fixed to `user`, `RETURNING` id, email, type, full_name only) and maps the unique violation to a duplicate-email result.
- `POST /api/auth/login`: additive `payload.user`; `findByEmail` selects `full_name` too.
- No DB migration; the `users` table is used as is.

## API base URL in the container build
`apiUrl: http://localhost:3000/api` works for `ng serve`, but in the compose stack the browser cannot reach the backend on host port 3000 (not published) and the backend CORS origin is the frontend port. Default decision (no change to compose or nginx): add `src/environments/environment.prod.ts` with `apiUrl: '/api'` and a production `fileReplacements` entry in `Frontend/angular.json`, so the nginx container keeps working through its existing `/api/` proxy while `ng serve` uses `http://localhost:3000/api`. This does not conflict with D8 (no proxy file). If the human prefers a single absolute `apiUrl` for both, the containerized app cannot log in without publishing the backend port (a containers change, out of this task).

## UI behaviour
- Signed out: header shows `Login` (-> `/login`). Login page: email, password, `Login` submit, link "No account yet? Register". Register page: full name, email, password, confirm password, `Register` submit, link "Already have an account? Login".
- Signed in: header shows `<fullName>` and the open-door logout button; clicking it signs out and goes to `/`.
- Loading state on submit; errors shown next to the form; success message on `/login` after registering.

## Acceptance criteria
- [ ] AC1: User can log in from `/login` with a valid e-mail and password (task AC1) and lands on `/`; invalid credentials show a generic error and keep the user signed out.
- [ ] AC2: User can register from `/register` when they have no account yet (task AC2) with `fullName`, `email`, `password`, `confirmPassword` validated per D1 on client and server; a duplicate e-mail shows "Email already registered" (409); after success the user lands on `/login` with a success message and is not signed in; the new account can then log in.
- [ ] AC3: When signed in, the header shows the user's full name instead of the `Login` button (task AC3).
- [ ] AC4: When signed in, an open-door button using an inline SVG icon (no new dependency) appears to the right of the user's name and works as logout (task AC4); it is keyboard operable and has an accessible name; logout goes to `/`.
- [ ] AC5: `/login` and `/register` are lazy-loaded routes and link to each other; the signed-out header `Login` button goes to `/login`; the header has no `Register` link.
- [ ] AC6: A signed-in user opening `/login` or `/register` is redirected to `/`.
- [ ] AC7: Signed-in state survives a reload within the tab (`sessionStorage`) and is cleared when the tab closes; an expired or malformed token is treated as signed out on load.
- [ ] AC8: The register endpoint forces `type = 'user'`, hashes the password with bcrypt, uses parameterised SQL, is rate limited, validates input server-side per D1, and never returns or logs a password or hash.
- [ ] AC9: The login endpoint keeps `payload.token` and its 400/401/429 behaviour; `payload.user = { fullName, email, type }` is added; the register 201 payload has the same shape.
- [ ] AC10: The API base URL comes from `environment.apiUrl` (`http://localhost:3000/api` in dev, no proxy file); the production build uses `/api` so the nginx container keeps working.
- [ ] AC11: Tests per FR13 are added; `npm run build` and `npm run test:ci` in `Frontend/` and `npm test` and `npm run build` in `Backend/` succeed.
- [ ] AC12: Context docs updated per FR14.

## Risks
- Authentication, token storage and personal data are security-sensitive; the register endpoint is a new public, unauthenticated write path (spam, e-mail enumeration through 409 accepted by D2, brute force).
- A `sessionStorage` JWT is exposed to XSS (the app has no CSP), though only per tab.
- Behind the nginx container all clients share one rate-limit bucket (known gap R6 in `backend.md`); a register limiter has the same weakness.
- The login response change is a contract change for the only existing consumer (tests); additive only.
- Anyone can create an account (a `user`, never an admin); there is no secret key or approval step.
- The register response carries a token that the frontend deliberately discards (no auto sign-in); harmless, kept because D3 asks for the login shape.
- One absolute `apiUrl` for every build would break the containerized app (backend port not published); handled by `environment.prod.ts`.

## Risk gate
- R1 (security): new public `POST /api/auth/register`: unauthenticated writes to `users`, password hashing, user input. Impact: account spam, e-mail enumeration (409 chosen in D2), weak-password accounts. Mitigations in the spec: rate limit, server-side validation with password policy, always `type = 'user'`. Safer alternative: non-revealing duplicate handling (not chosen in D2).
- R2 (security): browser token storage and persisted signed-in state in `sessionStorage` (D6). Impact: JWT readable by XSS within the tab. Safer alternative: in-memory only (logs out on reload).
- R3 (major functionality): login response extended with `payload.user` (D3). Impact: change to the existing login contract. Mitigation: additive only, `token` and error behaviour unchanged. Safer alternative: a separate authenticated `GET /api/auth/me`.
- R4 (security, personal data): the user's name, e-mail and type are kept in `sessionStorage` and shown in the header. Impact: personal data in browser storage. Safer alternative: store only the name and token, or memory only.
- R5 (resolved): the icon dependency risk (D7) is resolved by the approved safer alternative, an inline SVG open-door icon with no new dependency. No open risk remains for it.

## Open Questions
None blocking. Non-blocking (defaults used unless the human objects):
- Container build: production `apiUrl` is `/api` via `environment.prod.ts` and `fileReplacements` (see "API base URL in the container build"), because the literal D8 value would break the compose stack. Alternatives: one absolute URL and publish the backend port (containers change, new task), or a proxy (rejected in D8).
- The register 201 response includes `token` (D3 says both responses carry it); the frontend ignores it. Alternative: omit `token` from the register response.
- Error messages are generic English; no tags on the task.
