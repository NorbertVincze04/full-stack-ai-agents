# Review ux - manual-shadow-borders

Verdict: approved (0 blocker, 0 high, 2 medium, 3 low)
Inputs: brief.md, implement-frontend.md, tdd-frontend.md (310/310), e2e.md (skipped, no runner), CSS diff. No browser check was possible; contrast and stacking judged from the CSS.

## Focus ACs
- AC5 ok: desk and day state colours, border styles (dashed booked, solid others), `selected`/`picked` fills and all `:focus-visible` outlines are untouched; shadows add no state meaning.
- AC6 ok: no width or breakpoint change; borders use `box-sizing: border-box` on `.top-bar`, `.calendar`, `.desk-plan`; container query at 767.98px unchanged; spec guards no overflow at 320 px.
- AC8 ok: no text or background colour changed; the new `#d1d5db` container borders are decorative (not UI-component identification), so the 3:1 non-text rule does not apply; buttons keep their dark borders.
- AC9 ok: no auth, info or terms CSS in the diff; only the shared header/footer shadow and header button radius reach those pages (allowed by D1).

## Findings
- medium - app.component.css header `box-shadow` (AC3): `.top-bar` (light background, no margin) is the first element of `main` right under the header and paints over the header's downward shadow on `/`, so the shadow is probably invisible there. Fix: give the header `position: relative; z-index: 1`, or add a gap above the top bar; verify in a browser.
- medium - calendar.component.css `.calendar` and desk-plan.component.css `.desk-plan` use `padding: 0 1rem`: with the new 1px border, the nav buttons and the plan title touch the top/bottom border, and the 2px + 2px focus ring of `.nav-button` and `.desk` overlaps the border. Fix: use vertical padding (about 0.5rem to 1rem) on both containers.
- low - calendar.component.css `.nav-button:hover` lacks `:not(:disabled)` (the book button has it); harmless today if nav buttons are never disabled.
- low - hover and focus ring are not covered by specs or e2e (known gap in the implement report); manual check at 320 px, 768 px and 1280 px is still pending.
- low - desk text stays 12 px and each bordered container removes about 2 px plus its padding from the 320 px width (existing finding from the mockup-office task, slightly worse).

## Review selection
ux: ran (`ui-changes`). Not an AC finding: `#d1d5db` on white is about 1.5:1, acceptable for decoration only.
