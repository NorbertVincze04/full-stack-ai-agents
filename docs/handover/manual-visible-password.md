# Handover - manual-visible-password: visible password

## Implemented
- Frontend: eye toggle on the login password and on the register Password and Confirm password fields. Each input sits in `.password-wrap` with a `button.password-toggle`; `[type]` is bound to independent booleans (`showPassword`, `showConfirmPassword`), with `aria-label` "Show password"/"Hide password" and `aria-pressed`. The icon is an inline SVG (`aria-hidden`; slash when visible).
- Backend, database, containers, pipelines: no change.

## Tools
Angular 18 (NgModule), Jasmine/Karma specs, `npm run test:ci`, `npm run build`.

## Dependencies added
None.

## Files changed
- `Frontend/src/app/features/auth/auth-form.css`
- `Frontend/src/app/features/auth/login/login.component.html`, `login.component.ts`, `login.password-toggle.spec.ts` (new)
- `Frontend/src/app/features/auth/register/register.component.html`, `register.component.ts`, `register.password-toggle.spec.ts` (new)
- `docs/context/frontend.md`, `docs/agents/*.md` (context files)
- `docs/tasks/`, `docs/specs/`, `docs/runs/manual-visible-password/`, this handover

## Acceptance criteria
| AC | Status | Evidence |
| --- | --- | --- |
| AC1 | Verified | login spec, 288/288 |
| AC2 | Verified | login spec |
| AC3 | Verified | register spec |
| AC4 | Verified | register spec incl. independence test |
| AC5 | Verified | specs (`type=button`, no `.field-error`) |
| AC6 | Verified | specs (value kept, body has `password` only) |
| AC7 | Verified | human manual check of Enter/Space; specs assert a native focusable button |
| AC8 | Verified | 270 existing + 18 new specs pass, build pass |

The 320 px layout was verified manually by the human.

## Open findings
- medium (ux): identical accessible name on the two register toggles.
- low: toggle markup triplicated; double state announcement (label plus `aria-pressed`); no hover cue or live region; no e2e runner.

## Follow-ups
- Make the register toggle names distinct or add `aria-controls` (needs a spec change).
- Extract a shared toggle component when a fourth password field appears.
- Add an e2e runner (needs an approved spec).
