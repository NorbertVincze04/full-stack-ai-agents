# Spec: visible password (manual-visible-password)

## Summary
Eye toggle on password fields of the login and register pages to show or hide the typed password.

## Scope
- In: login `Password` field; register `Password` field; register `Confirm password` field (Q1 = a).
- Out: backend, API, validation rules, session handling, other pages.

## Area
`frontend` (no API, data or backend change needed).

## Scope flags
- `ui-changes`: yes - new button inside the auth forms.
- `logic-changes`: yes - small component state (visible/hidden); no auth logic change.
- `security-relevant`: no - client-side display toggle only; password is neither stored nor logged nor sent differently.
- `dependencies-changed`: no - inline SVG icon (as the logout button), no icon library.
- `database-changes`: no.
- `scaffolding-only`: no.

## Functional requirements
- Each in-scope password field has an eye button next to it; it toggles the input `type` between `password` and `text`.
- Initial state is hidden (A1).
- The toggle is per field and does not change the field value, validation state or submitted data (A2).
- The button is a real `<button type="button">` (never submits the form), keyboard operable, with `aria-label` "Show password" / "Hide password" and `aria-pressed` reflecting the state (A3).
- The icon differs between states (eye / eye-slashed), inline SVG.
- Navigating between login and register resets to hidden (component state).

## API/data changes
None.

## UI behaviour
- The button sits inside the right edge of the input; the input text does not run under the icon; works at 320 px.
- Existing field labels, errors and `aria-describedby` stay unchanged.

## Acceptance criteria
- AC1: Login page: the password field is hidden on load (`type="password"`) and an eye button with `aria-label` "Show password" is present.
- AC2: Clicking the login eye button sets the field to `type="text"`, label becomes "Hide password", `aria-pressed="true"`; clicking again restores `type="password"`.
- AC3: Register page: the same behaviour as AC1-AC2 for the `Password` field.
- AC4: Register page: the same behaviour for `Confirm password`, toggling independently from `Password`.
- AC5: The toggle buttons are `type="button"`: clicking one does not submit the form or trigger validation messages.
- AC6: The typed value, validation errors and request body (`password`, never `confirmPassword`) are unchanged by toggling.
- AC7: The buttons are reachable by Tab and operable with Enter/Space.
- AC8: Existing login/register specs stay green; new specs cover AC1-AC6.

## Risk gate
none (display-only change, no dependency, no data, no auth change).

## Decisions
- D1: Q1 = a: both register fields (`Password`, `Confirm password`) get an eye with independent toggles (consistent with login).

## Assumptions
- A1: hidden on load (task wording, not stated).
- A2: independent toggle per field.
- A3: accessible label and keyboard support are required by the frontend conventions (`docs/context/frontend.md`).

## Open Questions
None.
