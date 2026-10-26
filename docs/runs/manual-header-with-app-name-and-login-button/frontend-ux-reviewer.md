# Frontend UX review - manual-header-with-app-name-and-login-button

Verdict: approved

Reviewed: `Frontend/src/app/app.component.html`, `Frontend/src/app/app.component.css`, `Frontend/src/index.html`, `Frontend/src/styles.css`, against `docs/specs/manual-header-with-app-name-and-login-button.md` and the builder report. Reviewed statically; no browser run.

## Summary
The header matches FR1-FR11. The scaffold has no PrimeNG, shared components or route `data`, so the only existing look and feel to match is the 602 footer (`#1f2937` / `#ffffff`, `1rem` padding), which the header reuses.

| Check | Result |
| --- | --- |
| Landmark / heading structure | OK. `<header>` is a top-level banner and holds the single `<h1>`. |
| Consistency with footer | OK. Same palette, padding, `box-sizing`, `overflow-wrap`. |
| Layout / 602 sticky footer | OK. Header is `flex: 0 0 auto` and static; `main { flex: 1 }` and the footer are unchanged. |
| Link styling (FR6) | OK. `color: inherit`, no underline, underline on hover, `:focus-visible` outline. |
| Button contrast (FR9) | OK. `#1f2937` on `#ffffff` is about 14:1; white on `#1f2937` is the same ratio. |
| Focus indicators (AC8) | OK. 2px white outline with 2px offset, visible against the dark header on both link and button. |
| Touch target (FR10) | OK. Button has `min-width` and `min-height` of 44px. |
| Responsive (FR10) | OK by CSS. Single flex row, `gap: 1rem`, button `flex: 0 0 auto`, title wraps with `overflow-wrap: anywhere`. Not browser-verified. |
| Keyboard | OK. Native `<a href>` and `<button type="button">`. |
| States | Empty/loading/error/validation: not applicable. Disabled: not applicable. Hover on the button: see finding 1. |

## Findings

### Low
1. `Frontend/src/app/app.component.css` (`header button`, lines 47-59): no `:hover` or `:active` style. Users get no pointer feedback besides the cursor. Suggested fix: add a subtle hover/active background (for example `#e5e7eb`) that keeps AA contrast with `#1f2937` text. Reference: usability feedback for interactive controls; the footer has no equivalent, so this is not a spec violation.
2. `Frontend/src/app/app.component.html` (line 3): the `Login` button is a silent no-op with no cue that it is a placeholder. The spec accepts this (Risks section), so this is informational. Suggested fix, once an auth task exists: wire the real action. Until then, no change is needed.
3. `Frontend/src/app/app.component.css` (`header a`, lines 27-30): the home link's clickable area is only the text height (about 24px), below the 44px target used for the button. It meets WCAG 2.2 AA minimum target size (24px) and the spec only requires 44px for the button. Optional: add `display: inline-block; padding: 0.5rem 0;` to the link to enlarge the target without changing the header height (the button already forces 44px+ row height).

## Notes (no action required)
- `<main>` now has no heading. Future route components should start at `h2` to keep the heading hierarchy valid.
- The builder did not verify narrow-viewport rendering in a browser (known gap in the builder report). Recommend a manual check at 320px width that the name and `Login` stay on one row.

## Counts
- blocker: 0
- high: 0
- medium: 0
- low: 3
