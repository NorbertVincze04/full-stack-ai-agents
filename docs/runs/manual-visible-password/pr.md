# manual-visible-password: visible password

## Summary
- Frontend: an eye toggle (`button.password-toggle`, inline SVG, no dependency) on the login password field and on both register fields (Password, Confirm password). Each toggle has independent state (decision D1). Styles are in `auth-form.css`.
- Backend, database, containers, pipelines: no change.

## Acceptance criteria
- [x] AC1 Login: password hidden on load, eye button with aria-label "Show password"
- [x] AC2 Login: click -> `type=text`, "Hide password", `aria-pressed=true`; click again restores
- [x] AC3 Register Password: same as AC1-AC2
- [x] AC4 Register Confirm password: same, independent of Password
- [x] AC5 Buttons are `type="button"`: no submit, no validation messages
- [x] AC6 Value, validation errors and request body (`password`, never `confirmPassword`) unchanged
- [x] AC7 Tab reachable, Enter/Space operable (human-verified manually; unit specs only assert a native focusable button)
- [x] AC8 Existing specs green; new specs cover AC1-AC6

## Tests
- tdd: red 18 failed / 270 passed, green `npm run test:ci` 288/288 (18 new: `login.password-toggle.spec.ts` 6, `register.password-toggle.spec.ts` 12). `npm run build` passes.
- e2e: skipped (no runner). The 320 px layout and Enter/Space key events were verified manually by the human.

## Review coverage
- code: ran, approved (0 blocker, 0 high, 0 medium, 3 low)
- ux: ran, approved (0 blocker, 0 high, 1 medium, 2 low)
- security: skipped (not security-relevant, no dependency change)
- containers, pipelines: skipped (no such change)

## Approved risks and decisions
No risks. D1: both register fields get an eye, with independent toggles.

## Migration
None.

## How to start and verify
1. `podman compose up -d --build` (or `cd Frontend; npm start`), open `/login` and `/register`.
2. Check each password field: hidden on load, eye click shows/hides, label and `aria-pressed` change, no submit, no error messages, value kept.
3. Tab to the eye, press Enter and Space; check a 320 px viewport.
4. `cd Frontend; npm run test:ci; npm run build`.

## Repository settings
None.

## Open findings
- medium (ux): both register toggles have the identical accessible name; fix with `aria-controls` or a distinct label (AC4 says "same", needs a spec change).
- low: toggle markup repeated three times; `aria-pressed` plus the changing label announce state twice; no hover cue or live region; no e2e runner.
