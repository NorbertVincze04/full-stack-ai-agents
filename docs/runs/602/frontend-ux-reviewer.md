# Frontend UX Review - Task 602

Verdict: approved (after re-review of fix iteration 1; initial verdict was changes-requested)

Current counts: blocker 0, high 0, medium 1, low 2 (see "Re-review (iteration 1)" at the end).

Scope reviewed: `Frontend/src/app/app.component.{html,css,ts,spec.ts}`, `Frontend/src/styles.css`, `Frontend/src/index.html`, against `docs/specs/602.md` and `docs/runs/602/frontend-builder.md`. Review was static (no browser run); the findings below follow from standard browser default styles.

## Findings

| # | Severity | File / line | Problem | Suggested fix |
|---|----------|-------------|---------|---------------|
| 1 | high | `Frontend/src/styles.css` (empty), `Frontend/src/app/app.component.css` L1-6 | The browser default `body { margin: 8px }` is still active. `:host` has `min-height: 100vh/100dvh` inside that body, so the document is 16px taller than the viewport. The page scrolls vertically even on a short page, which violates AC3 ("at the bottom of the viewport" on short pages) and the spec UI behaviour ("no scrolling needed on a short page"). | Add `body { margin: 0; }` to `styles.css`. The spec allows a global `html, body` rule when the layout needs it. |
| 2 | high | `Frontend/src/app/app.component.css` L9-17, `Frontend/src/styles.css` | For the same reason, the footer's dark background does not reach the left, right or bottom viewport edges. An 8px white gutter shows on each side, so the footer is not full page width. This violates FR4 and AC4 ("spans the full width"). `width: 100%` only fills the body content box. | Same fix as #1. After it, `width: 100%` in the footer is redundant: flex `align-items: stretch` already gives full width. |
| 3 | medium | `Frontend/src/app/app.component.css` L9-17 | The footer uses hard-coded colours (`#1f2937` / `#ffffff`) and a fixed padding. The contrast is fine (about 14:1, AA pass). The repo has no shared theme tokens yet, and theming is out of scope in the spec, so this is not blocking. | Optionally define the colours as CSS custom properties (for example in `:host`) so the later PrimeNG Aura introduction can replace them in one place. |
| 4 | low | `Frontend/src/app/app.component.css` L7-9 | `main` has no padding, so the `<h1>` and routed content sit flush against the viewport edges once the body margin is removed (#1). The footer has `1rem` padding, which makes the two look inconsistent. | Add `padding: 1rem;` to `main` to match the footer's horizontal rhythm. |
| 5 | low | `Frontend/src/app/app.component.css` L16 | `overflow-wrap: anywhere` only matters for long unbroken strings. The current text has spaces and wraps normally, so this is harmless and only defensive. | Optional: leave as is, or drop it. |

## Checks passed
- Semantic `<footer>` after `<main>`, outside `<router-outlet />`. It is a `contentinfo` landmark, and there are no interactive elements, so no focus or keyboard requirements apply (FR1, FR2, AC1, AC2).
- Flex column shell with `100vh` fallback and `100dvh` override, and `main { flex: 1 }`. The footer is in normal flow, not fixed, so it never overlaps content (FR3, FR7).
- Text colour contrast (`#fff` on `#1f2937`) meets WCAG AA.
- The year is runtime-derived through `currentYear` (FR6, AC7). The `<h1>` stays inside `<main>` (FR5). The unit test covers the footer text (AC5).
- No empty, loading, error or form states exist in this task, so none apply.
- Route `data` and top-bar behaviour are out of scope for this task.

## Counts
- blocker: 0
- high: 2
- medium: 1
- low: 2

Report path: `docs/runs/602/frontend-ux-reviewer.md`

## Re-review (iteration 1)

Verdict: approved

Scope: `Frontend/src/styles.css`, `Frontend/src/app/app.component.{html,css}`, against `docs/specs/602.md` and the Iteration 1 section of `docs/runs/602/frontend-builder.md`. Review was static (no browser run).

### Status of previous findings

| # | Severity | Status | Notes |
|---|----------|--------|-------|
| 1 | high | resolved | `styles.css` now has `html, body { margin: 0; }`. The 8px body margin is gone, so the `min-height: 100vh/100dvh` host no longer overflows the viewport. A short page needs no scrolling and the footer sits at the viewport bottom (AC3). |
| 2 | high | resolved | With the margin removed, the footer's background reaches the left, right and bottom viewport edges and spans the full width (FR4, AC4). |
| 3 | medium | open (non-blocking) | Colours `#1f2937` / `#ffffff` are still hard-coded. Contrast is about 14:1 (AA pass) and theming is out of scope in the spec. Optional: use CSS custom properties when PrimeNG Aura is introduced. |
| 4 | low | open (non-blocking) | The builder skipped this, as it changes layout beyond the spec. With the body margin removed, `<main>` content (`<h1>`, routed views) sits flush against the left and right viewport edges, while the footer has `1rem` padding. Suggested: `main { padding: 1rem; }`, or have routed pages add their own padding when they are introduced. |
| 5 | low | open (non-blocking) | `overflow-wrap: anywhere` is harmless and defensive; no change needed. |

### New findings
None. The change is limited to one global rule, and no regressions were found: the footer stays a semantic `<footer>` after `<main>`, outside `<router-outlet />`, in normal flow, and the `<h1>` stays inside `<main>`.

### Counts (current)
- blocker: 0
- high: 0
- medium: 1
- low: 2

Report path: `docs/runs/602/frontend-ux-reviewer.md`
