# Frontend code review: manual-login-and-register-pages

Verdict: changes-requested

Scope: files listed in `frontend-builder.md` (core, features/auth, header, environments, `angular.json`, adjusted specs). Checked against `docs/specs/manual-login-and-register-pages.md` and the Conventions in `docs/context/frontend.md`.

## Checks run (read-only)
- `npm run build` in `Frontend/`: success; auth lazy chunk 44 kB, no budget warnings.
- `npm run test:ci` in `Frontend/`: 13 of 13 pass.
- No ESLint in the project (no lint result available).

## Summary
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 3 |
| low | 7 |

Functional behaviour matches the spec (FR1, FR2, FR5-FR12, AC1-AC7, AC10). The only unmet spec item is FR13/AC11 (frontend tests), which is the reason for the verdict. No blocker or high finding.

## Acceptance criteria check
| AC | Result |
| --- | --- |
| AC1 login | met (status mapping 401/429/other, in-flight guard, navigates to `/`) |
| AC2 register | met on the client (D1 rules mirror server regex/limits, byte-based max, only 3 fields sent, 409 on e-mail, 400 mapped inline, `/login?registered=1`, token ignored); not exercised against the backend |
| AC3 / AC4 header | met (interpolated name, native button, `aria-label`, `aria-hidden` SVG, 44x44, focus-visible) |
| AC5 lazy routes / links | met, but see M2 |
| AC6 guard | met |
| AC7 session | met (`exp` check on load and in guard; malformed JSON/missing exp cleaned) |
| AC10 environment | met (`environment.ts`, `environment.prod.ts`, `fileReplacements` under `production`) |
| AC11 tests | NOT met, see M1 |
| AC12 docs | met for frontend context |

## Findings

### Medium

**M1 - No specs for the new logic (FR13, AC11)**
- Files: none exist for `core/auth.service.ts`, `core/guest.guard.ts`, `features/auth/login`, `features/auth/register`, `auth-validators.ts`, signed-in header.
- Problem: session expiry parsing, storage clean-up, the guard, error-to-message mapping and the server-error mapping are security-relevant and untested. The builder deferred this to the tester agent, but the spec lists it as an acceptance criterion.
- Fix: add the Jasmine specs listed in FR13 (`HttpTestingController` for the service incl. expired token on load and logout clearing storage; guard; login/register pages; header signed-in name, door button, logout click).

**M2 - `AuthModule` mounted at path `''` loads its chunk on `/` and every unmatched URL**
- File: `Frontend/src/app/app-routing.module.ts:6`
- Problem: the auth chunk (44 kB, includes `ReactiveFormsModule`) is downloaded for every visitor, including those who never open `/login`, which defeats lazy loading. Unknown URLs also match the `''` prefix and then fail inside the child router (no 404 route; already noted as a known gap).
- Fix: register `login` and `register` as separate lazy routes (for example `{ path: 'login', loadChildren: ... }` where the feature routing uses `path: ''` with the guard), so the chunk is loaded only on those URLs.

**M3 - Session state and expiry handling are inconsistent between login, header and storage**
- File: `Frontend/src/app/core/auth.service.ts:51-58, 79-85, 87-108`
- Problem:
  1. `login()` stores the session and emits the user without validating the token. If the token has no or an invalid `exp`, the header shows the user as signed in, but the next read (guard, reload) deletes the session.
  2. `isAuthenticated()` is a query with side effects (removes storage, emits `null`).
  3. An expired token while the tab stays open keeps the header in the signed-in state until the guard happens to run (only on `/login` and `/register`). Documented as a known gap, but the header gives no signal that the session is dead.
- Fix: in `login()` reject a response whose token fails `readTokenExp` (treat as error); keep the check/side effect in one private method (for example `refreshSession()`) and name the public method accordingly; optionally schedule a `timer` based on `exp` to emit `null` (with `takeUntil`/`DestroyRef` cleanup).

### Low

**L1 - Duplicate/dead branches in `errorFor`**
- File: `Frontend/src/app/features/auth/register/register.component.ts:46-83`
- Problem: `control.errors ?? {}` followed by `if (!control.errors) return null` is redundant; the `confirmPassword` branch uses `errors['server']` without a cast while the other branch casts; the method is invoked 2-3 times per field per change detection from the template.
- Fix: collapse to one `errors` read with one early return; compute messages once (a small map keyed by error code, or `@if (errorFor(...); as msg)` bound to `aria-*` via a template variable).

**L2 - Untyped cast hack for server field errors**
- File: `register.component.ts:110-138`
- Problem: `(err as HttpErrorResponse).error?.errors` is `any`, and `this.form.controls as Record<string, {setErrors(e: object): void} | undefined>` bypasses typing.
- Fix: declare an `ApiValidationError` interface in `auth.models.ts`, narrow `err.error`, and use an allow-list `['fullName','email','password'].includes(field)` with `this.form.get(field)`.

**L3 - Stale server errors block resubmit**
- File: `register.component.ts:113, 125`
- Problem: `setErrors({ server })` keeps the control invalid until that control's value changes. Resubmitting unchanged values (for example after a transient 400) is blocked client-side with no request. Acceptable for 409, surprising for 400 mapped to other fields.
- Fix: clear `server` errors at the start of `submit()` or on `valueChanges` of the whole form, or leave as-is and document.

**L4 - Login e-mail check accepts whitespace-only input**
- File: `Frontend/src/app/features/auth/login/login.component.ts:17, 44`
- Problem: `Validators.required` passes `"   "`; after `trim()` an empty e-mail is sent and the server returns 400, which the page shows as the generic "Login failed, please try again later".
- Fix: trim-aware required check (reuse `emailValidator` or a small `requiredTrimmed` validator), and map 400 to a validation-style message.

**L5 - In-flight request not cancelled on destroy; navigation after leaving the page**
- Files: `login.component.ts:46-55`, `register.component.ts:98-107`
- Problem: the `HttpClient` observables complete by themselves (no leak), but if the user leaves the page while the request runs, the success handler still navigates (login to `/`, register to `/login`).
- Fix: `takeUntilDestroyed()` (Angular 16+) on the subscription, or the `async` pipe/`firstValueFrom`.

**L6 - Mutable plain fields with default change detection**
- Files: `login.component.ts:21-23`, `register.component.ts:42-44`
- Problem: `submitted`, `submitting`, `errorMessage` are plain mutable properties; works with zone.js, but would break under `OnPush`/zoneless. The two components also duplicate the submit/guard/status pattern and the field-error markup.
- Fix: use signals for these three fields (Angular 18) or keep as is and add `changeDetection: OnPush` only after converting; consider a shared `form-field` component only if more forms are added (not required now).

**L7 - Header polish**
- File: `Frontend/src/app/app.component.html:6`, `app.component.css:69-74`
- Problem: the user name is truncated with an ellipsis (`max-width: 12rem`) with no `title`, so long names cannot be read; `routerLink` on a `<button>` navigates without button-level semantics for "open in new tab" (acceptable, matches spec FR6).
- Fix: add `[title]="user.fullName"` on `.user-name`.

## Positive notes
- Passwords are never stored, logged or put in the URL; `confirmPassword` stripped in the service call; no `innerHTML`; server messages rendered as text.
- `sessionStorage` access wrapped in try/catch; malformed or expired entries are removed.
- Functional `guestGuard` returns a `UrlTree` (no imperative navigation).
- Validators mirror the backend (`EMAIL_PATTERN`, `\p{L}`/`\d`, byte-length cap).
- `apiUrl` comes from `environment`; production build swaps to `/api`, no secrets in environment files.
- Module boundaries respected: `core/` (service, guard, models), `features/auth/` (pages), no `shared/` needed yet.
- Existing specs only changed to provide HTTP testing providers.

---

# Re-review 1 (after fix iteration 1)

Verdict: approved (no blocker or high; M1 stays open as a known, non-blocking gap because the frontend tester was not requested)

Scope: `app-routing.module.ts`, `core/auth.service.ts`, `core/guest.guard.ts`, `features/auth/auth-routing.module.ts`, `login.component.ts`, `app.component.{ts,html,css}`, `docs/context/frontend.md`. Report only, no code edited.

## Checks run (read-only)
- `npm run build` in `Frontend/`: success; auth lazy chunk (44.00 kB) is no longer in the initial chunks; no budget warnings.
- `npm run test:ci` in `Frontend/`: 13 of 13 pass.
- No ESLint in the project (no lint result).
- Not run in a browser. The matcher route and the expiry timer rest on the builder's temporary spec (removed) and code reading.

## Status of previous findings
| ID | Status | Evidence |
| --- | --- | --- |
| M1 (FR13/AC11 specs) | open, non-blocking | No specs for `AuthService`, guard, login/register pages, signed-in header. |
| M2 (`''` route loads auth chunk) | resolved | `app-routing.module.ts:5-13`: `authMatcher` matches only a single `login`/`register` segment with `consumed: []`; `AuthRoutingModule` is unchanged and still guards both routes. Build output shows the chunk as lazy only. `/`, `/info` and unknown URLs no longer match it (unknown URLs behave as before the feature). |
| M3.1 (`login()` skips validation) | resolved | `auth.service.ts:59-72`: session is built and rejected via `isValidSession` before storing or emitting; the login page maps the non-HTTP error to the generic message (`login.component.ts:62-71`). |
| M3.2 (`isAuthenticated()` side effects) | resolved | `auth.service.ts:88-91`: pure check on the in-memory session. Clean-up and emissions only in `applySession`, `onExpiryTimer`, `logout`, constructor load. |
| M3.3 (header ignores expiry) | resolved | `auth.service.ts:94-117`: timer from `exp` (clamped to 2^31-1 ms, re-checked on fire), cleared on every `applySession`, so on logout and new login; on fire it clears storage and emits `null`, so the header returns to `Login`. |
| L7 (name truncated without title) | resolved | `app.component.html:6` has `[title]="user.fullName"`. |
| L1-L6 | open, unchanged | Not part of the fix iteration. |

## Regression check
- Routing: `/login` and `/register` (with or without `?registered=1`) reach `AuthModule` through the matcher, then the child routes and `guestGuard`; `/info` is declared first and unaffected; `/` has no route (as before). `/login/x` no longer matches the auth module (before it fell into the `''` prefix and failed in the child router); same outcome. No regression found.
- `AuthService`: login success, logout, reload and expired-on-load paths keep working. `applySession(null)` clears the timer and emits `null`; `readTokenExp(...) as number` is safe because only validated sessions reach it. `onExpiryTimer` early-fire case re-arms with a delay of at least 0 ms and converges. `register()` still ignores the token. `loadSession()` still removes malformed or expired entries. No regression found.
- Header: signed-out `Login` button, signed-in name, logout button, `logout()` then `navigateByUrl('/')`, and the flex-wrap CSS are consistent; the existing app spec (signed-out) passes. No regression found.

## Summary (open findings after this re-review)
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 1 (M1, known, non-blocking) |
| low | 9 (L1-L6 unchanged, N1-N3 new) |

## New findings

### Low

**N1 - Expiry timer runs inside the Angular zone**
- File: `Frontend/src/app/core/auth.service.ts:104-115`
- Problem: the long-lived `setTimeout` is created in `NgZone` (constructor of a root service). A pending macrotask keeps `ApplicationRef.isStable`/`whenStable()` false while a session exists, and any future `fakeAsync` spec that signs in fails with "timer(s) still in the queue" unless it flushes or discards the timer. The fire-time change detection is wanted, the idle waiting is not.
- Fix: arm the timer with `NgZone.runOutsideAngular` and call `ngZone.run(() => this.onExpiryTimer())` on fire.

**N2 - Side effects inside `map` and clock-skew sensitivity in `login()`**
- File: `auth.service.ts:59-72`
- Problem: storing the session and emitting the user happen inside `map` (should be `tap`; `map` is for pure transforms). The new client-side `exp > Date.now()` check also means a client clock ahead of the server by more than `JWT_EXPIRES_IN` makes every login fail with the generic message while the server returned 200.
- Fix: use `tap` for the side effects and `map` for the return value; keep the check but accept it as documented behaviour (low probability), or validate only the shape/`exp` presence at login and leave the expiry comparison to the timer/guard.

**N3 - Auth page paths duplicated in the matcher and the feature routes**
- Files: `app-routing.module.ts:5-7`, `features/auth/auth-routing.module.ts:7-9`
- Problem: adding another auth page requires editing both places, and nothing tests the matcher (the builder's temporary router spec was removed); a missed update silently makes the new route unreachable.
- Fix: keep as is, but cover it in the FR13 specs (router test: `/login` and `/register` render the forms, `/` does not load the auth chunk), or export the path list from `AuthRoutingModule` and reuse it in the matcher.

## Still open from the first review
- M1 (medium, known, non-blocking): FR13/AC11 Jasmine specs missing. It should also cover the new behaviour: `login()` rejecting an invalid or expired token, `isAuthenticated()` purity, timer-driven sign-out (with `fakeAsync`, see N1), the matcher routes (N3).
- L1-L6 (low): unchanged as described above.
