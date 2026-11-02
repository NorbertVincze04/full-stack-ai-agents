# Frontend UX review: manual-info-page

Verdict: approved

Reviewed by static inspection of templates and CSS (no browser run). Files: `Frontend/src/app/app.component.html`, `app.component.css`, `app-routing.module.ts`, `features/info/info.component.html`, `info.component.css`, `src/index.html`, `src/styles.css`.

## Findings count
| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 1 |
| low | 4 |

## Spec conformance (UI)
- Help link is a native `<a routerLink="/info">Help</a>`, DOM-before the Login button, inside `.header-actions`; no `aria-label` (req. 3, AC2, AC5): ok.
- Focus style: `header a:focus-visible` is a 2px white outline with 2px offset on `#1f2937` (about 14:1 contrast): ok (req. 4, AC3).
- Target size: `.header-actions a` has `min-height: 44px`, matching the Login button: ok.
- Tab order: app name, Help, Login. This follows visual order: ok.
- Page: `<h1>` "How it works" and `<ol>` with 3 `<li>` in the exact wording; content width is capped at 40rem and centred, with padding. Text is `#1f2937` on white, about 14.7:1 (AA): ok.
- Header and footer are otherwise unchanged; `<html lang="en">` and the viewport meta are present: ok.

## Findings

### M1 (medium): Document title does not change on `/info`
- File: `Frontend/src/app/app-routing.module.ts` line 5 (route has no `title`); `Frontend/src/index.html` line 5.
- Problem: the tab/window title stays "Desk Booking" on `/info`. The router gives no other cue that the view changed (WCAG 2.4.2 Page Titled, level A). Screen reader and history entries are indistinguishable.
- Fix: add `title: 'How it works'` (or "Help - Desk Booking") to the `info` route. This is a one-line change and needs no new dependency. A spec can assert `Title.getTitle()`.

### L1 (low): Two `<h1>` elements on `/info`
- File: `app.component.html` line 2 and `info.component.html` line 2.
- Problem: the header app name is an `<h1>`, and the page adds another `<h1>`. This is mandated by spec req. 1 and by the existing header, so it is not a defect of this change. It does weaken the heading outline.
- Fix (follow-up, not for this task): make the app name a non-heading (`<a class="brand">`) or leave it as is until a shared layout task.

### L2 (low): No current-page indication on the Help link
- File: `app.component.html` line 4.
- Problem: on `/info` the Help link looks the same as on other pages and exposes no `aria-current`. Spec says active styling is not required.
- Fix (optional): `routerLinkActive` with `ariaCurrentWhenActive="page"`, keeping the focus outline and contrast.

### L3 (low): Narrow-viewport behaviour unverified and relies on title wrapping
- File: `app.component.css` lines 9-20 and 43-48.
- Problem: `header` has no `flex-wrap`; `.header-actions` is `flex: 0 0 auto` (about 150px wide), so at about 320px the app-name `<h1>` takes the remaining space and wraps (`overflow-wrap: anywhere`). No horizontal scroll is expected, but the builder and tester both did not check this in a browser (spec risk "header layout regression on small screens").
- Fix: check at 320px and 200% zoom. If the title is cramped, add `flex-wrap: wrap` on `header`.

### L4 (low): Header actions are not a navigation landmark
- File: `app.component.html` line 3.
- Problem: the Help link sits in a plain `<div>`. The spec allows `<div class="header-actions">` or `<nav aria-label="Main">`, so this conforms. A `<nav>` would let screen reader users jump to it.
- Fix (optional): wrap only the link in `<nav aria-label="Main">`, or use `<nav>` for `.header-actions`, and keep the Login button out if it is not navigation.

## Not reported
- No links have an underline at rest. This matches the existing app-name link pattern and the link is not in running text.
- Empty, loading, error and form states: not applicable (static page, no forms or data).
