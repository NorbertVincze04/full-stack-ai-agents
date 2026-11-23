# Review ux - manual-visible-password

Verdict: approved (0 blocker, 0 high, 1 medium, 2 low)

Review selection: ux ran (`ui-changes`: login and register templates, `auth-form.css`); security skipped by request; code ran separately.

## Findings
- medium: `register.component.html` - both toggles expose the identical accessible name "Show password"/"Hide password", so a screen reader user cannot tell which field a button controls from the button alone (WCAG 2.5.3 / 4.1.2). Suggested fix: keep the AC text but add `aria-controls` with the input id, or use "Show confirm password" for the second field (needs a spec change, AC4 says "same").
- low: all three toggles - the name changes ("Hide password") while `aria-pressed` also flips, so the state is announced twice and can read as "Hide password, pressed". Suggested fix: keep a fixed label with `aria-pressed`, or drop `aria-pressed`; kept as is because AC2 requires both.
- low: `auth-form.css` `.password-toggle` - no hover cue and no `aria-live` announcement when the value becomes visible; the 44 px target, 2 px focus outline (shared `button:focus-visible`) and `#1f2937` icon colour (contrast ok on white) are fine. 320 px layout unverified (no e2e run); the 48 px right padding keeps text clear of the icon.

## Checked, no finding
Touch target 44 px, keyboard reachable native `<button>`, icon `aria-hidden`, `type="button"` so no validation or submit, shared styles reused, error messages and `aria-describedby` unchanged, eye/slash icon plus label not colour-only.
