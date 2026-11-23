# Review code - manual-visible-password

Verdict: approved (0 blocker, 0 high, 0 medium, 3 low)

Review selection: code ran (component templates/logic changed); security skipped by request (not security-relevant, no dependency change); ux ran separately.
Inputs: brief, implement-frontend.md, tdd-frontend.md (e2e.md is empty), diff of `Frontend/src/app/features/auth/`. Build and `test:ci` (288 passed) taken from the reports.

## Acceptance criteria
AC1-AC7 met in the templates (`[type]` bound to independent `showPassword` / `showConfirmPassword`; `type="button"`; controls, validators and submit payload untouched). AC8: 18 new specs cover AC1-AC6; Enter/Space only asserted as a native button.

## Findings
- low: `login.component.html`, `register.component.html` - the toggle button and SVG are copied three times; a small shared component would avoid drift (fix: extract when a fourth password field appears).
- low: `login.component.ts`, `register.component.ts` - plain mutable booleans toggled inline in the template; consistent with the existing `submitted`/`submitting` fields, no change needed unless the components move to `OnPush`/signals.
- low: `docs/runs/manual-visible-password/e2e.md` is empty and there is no e2e runner; Enter/Space and 320 px layout are unverified (already tracked in the 649 open item).

## Checked, no finding
Typing, no subscriptions added, no dead code, module boundaries unchanged, CSS limited to the shared `auth-form.css`, spec files follow the existing `auth-test-utils` pattern.
