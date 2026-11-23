# Review code - manual-shadow-borders

Verdict: approved (0 blocker, 0 high, 0 medium, 4 low)
Inputs: brief.md, implement-frontend.md (build and `test:ci` pass), tdd-frontend.md (310/310), `git diff` of 5 CSS files and the new spec. CSS only; no logic, markup or dependency change.

## Findings
- low - app.component.css footer `box-shadow: 0 -4px 12px rgba(0,0,0,.12)` duplicates the `--shadow-md` value as a literal; AC1 asks component CSS to use the tokens. Fix: add an upward token (for example `--shadow-md-up`) or document the exception.
- low - `.desk`, `.day` and `.legend-swatch` (all buttons or button-like) keep `border-radius: 4px` while AC4 sets buttons to `var(--radius-sm)`; inconsistent radii on one page. Fix: use `var(--radius-sm)` or note that AC4 covers only the book, nav and header buttons.
- low - calendar.component.css `.nav-button:hover` has no `:not(:disabled)` guard, unlike `.book-button`.
- low - repo hygiene: untracked `$f` at the repo root (stray shell artefact) and modified `Frontend/build-output.txt` / `test-output.txt`; keep them out of the PR.

## Checks
- Tokens defined once on `:root` in `styles.css` and consumed via `var()`; no duplication of values except the footer.
- Scope: only the files listed in the implement report changed; `live-ui/state.json` and `docs/*` changes are workflow artefacts.

## Review selection
code: ran (component CSS and a new spec changed). security: skipped (no flag, no dependency change).
