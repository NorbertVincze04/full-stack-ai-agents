# Review ux - manual-terms-services-page

Verdict: approved
Counts: blocker 0, high 0, medium 0, low 1

## Checks
- Link placement (D1, AC3): `Terms` after `Help`, before user name or Login, inside `.header-actions`; same markup as Help, so it inherits the existing link style (`.header-actions a`) and `header a:focus-visible` outline (AC4).
- Keyboard and navigation: real anchor with `routerLink`, client-side navigation, covered by spec.
- Wrapping: `.header-actions` has `flex-wrap: wrap`, so the extra link does not overflow at 320 px.
- Page: single `h1` "Terms of Service" inside `main`; the app name in the header remains the other `h1` (existing pattern, same as `info`). Placeholder text states it is not legal text (AC2). Readable width (40rem), `overflow-wrap: anywhere`, contrast `#1f2937` on white is sufficient.
- Consistency: layout mirrors the `info` page (section wrapper, padding, centred column).

## Findings
- low | `Frontend/src/app/app.component.html` L5 | Active route is not indicated on the header links (`routerLinkActive`/`aria-current`); the same holds for Help, so it is an existing pattern gap. Fix: follow-up for all header links.
