# e2e - manual-terms-services-page

Verdict: skipped: no e2e runner (`workflow.e2e` = auto, spec has `ui-changes`; no Playwright/Cypress in `Frontend/`, no `Backend/tests/e2e`).

## Journeys (for a future runner)
| Journey | AC |
| --- | --- |
| Open `/`, click "Terms" in the header: URL `/terms`, no reload, h1 "Terms of Service", placeholder text | AC1, AC2, AC4 |
| Tab from "Help" to "Terms": focus ring visible, Enter opens the page | AC4 |
| Signed in: order Help, Terms, user name; signed out: Help, Terms, Login | AC3 |

## Coverage
AC1-AC3, AC5 and the client-side navigation of AC4 are covered by `terms-route.spec.ts` (7 specs).
Not covered: visible focus style (CSS), real keyboard Enter.

## Follow-up
Adding an e2e runner is a dependency change and needs an approved spec.
