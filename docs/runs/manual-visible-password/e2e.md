# e2e - manual-visible-password

Verdict: skipped: no e2e runner (workflow.e2e `auto`, ui-changes yes). Follow-up: adding Playwright/Cypress needs an approved spec.

## Journeys (not run)
| Journey | AC |
| --- | --- |
| Open /login: password hidden, eye "Show password"; click -> visible, "Hide password"; click again -> hidden | AC1, AC2 |
| Open /register: toggle Password and Confirm password independently | AC3, AC4 |
| Click toggle: form not submitted, no validation messages | AC5 |
| Type value, toggle, submit: value kept, request body has `password` only | AC6 |
| Tab to the eye button, Enter and Space toggle | AC7 |

## Covered by unit specs instead
AC1-AC6 and native-button focusability (AC7) by `login.password-toggle.spec.ts` and `register.password-toggle.spec.ts`. Not covered: real Enter/Space key events, icon placement, 320 px layout.
