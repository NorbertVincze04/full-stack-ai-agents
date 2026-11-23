# TDD frontend - manual-visible-password

## Red baseline
Run: `npm run test:ci` in `Frontend/`: 288 total, 270 passed (existing, unchanged), 18 failed (all new).

## Tests added
- `Frontend/src/app/features/auth/login/login.password-toggle.spec.ts` (6)
- `Frontend/src/app/features/auth/register/register.password-toggle.spec.ts` (12)

Selector contract (from spec): the toggle is the `<button>` inside the same `.field` as the input (`#login-password`, `#register-password`, `#register-confirm-password`); `aria-label` "Show password"/"Hide password", `aria-pressed`, `type="button"`.

## Expected failures
All 18 fail because the toggle button does not exist yet (`toggle()` is null: `Expected null not to be null` / `TypeError`). No compile or setup errors.

## already-green
None.

## deferred-to-green
None. Enter/Space is asserted as a native, focusable, enabled `<button>` (no key-event simulation; needs an e2e runner). Icon placement/320 px layout is unasserted (visual).

## AC coverage
| AC | Tests |
| --- | --- |
| AC1 | login: hidden on load, label, aria-pressed=false |
| AC2 | login: click -> text/"Hide password"/true; click again restores |
| AC3 | register Password: same as AC1-AC2 |
| AC4 | register Confirm: same, plus independence test |
| AC5 | both pages: type=button, no `.field-error` after click |
| AC6 | value kept; no HTTP call on login toggle; register body has `password`, no `confirmPassword`; mismatch error unchanged |
| AC7 | native focusable button (tabIndex >= 0) |
| AC8 | existing 270 specs still green |

## Green
Verdict: pass. `npm run test:ci`: 288 total, 288 passed, 0 failed (all 18 red specs now pass). `npm run build`: pass. No tests added or corrected since red; no defects.
