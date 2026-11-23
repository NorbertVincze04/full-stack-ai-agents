# Implement frontend - manual-visible-password

Verdict: done

## Acceptance criteria -> implementation
- AC1-AC4: each password input (login, register Password, register Confirm) is wrapped in `.password-wrap` with a `button.password-toggle`. `[type]` is bound to a boolean (`showPassword`, `showConfirmPassword`, independent); `aria-label` "Show password"/"Hide password"; `aria-pressed` bound to the flag.
- AC5: `type="button"`, no submit, no validation triggered.
- AC6: form controls, validators and request bodies untouched.
- AC7: native `<button>`, focusable, Enter/Space work; 44 px target, shared `:focus-visible` outline.
- AC8: 288 specs pass (270 existing + 18 new).

## Files changed
- Frontend/src/app/features/auth/login/login.component.html, login.component.ts
- Frontend/src/app/features/auth/register/register.component.html, register.component.ts
- Frontend/src/app/features/auth/auth-form.css
- docs/context/frontend.md, docs/agents/implementer.md

## Dependencies
None. Inline SVG eye icon (`aria-hidden`; slash when visible).

## Commands
- `npm run build` (Frontend): pass
- `npm run test:ci` (Frontend): 288 passed, 0 failed

## Known gaps
Visual layout at 320 px not verified (no e2e run).
