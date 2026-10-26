# PR (frontend) - Task 602: test version control

Work item: https://dev.azure.com/CljP-LOM1-Automation/41ef1050-2f6b-4935-9e1a-15b8c70fe8c4/_workitems/edit/602

## Proposal (mode: prepare, nothing committed)

- Branch: `feature/602-test-version-control` (does not exist yet; base `master`, HEAD `f20ecd3`)
- Commit message:

  ```
  602: test version control (frontend)

  Add a copyright footer to the root component. It sits below the routed
  content, stays at the viewport bottom on short pages and shows the
  current year at runtime. Add a global html/body margin reset so the
  layout fills the viewport exactly.
  ```

### Files to commit

Frontend (`git diff --stat`: 5 files, 36 insertions):
- Frontend/src/app/app.component.html
- Frontend/src/app/app.component.css
- Frontend/src/app/app.component.ts
- Frontend/src/app/app.component.spec.ts
- Frontend/src/styles.css

Docs (untracked):
- docs/tasks/602.md
- docs/specs/602.md
- docs/runs/602/frontend-builder.md
- docs/runs/602/frontend-ux-reviewer.md
- docs/runs/602/frontend-code-reviewer.md
- docs/runs/602/frontend-security-reviewer.md
- docs/runs/602/pr-frontend.md

### Excluded (unrelated tooling changes, commit separately)
- .vscode/mcp.json
- scripts/ado-mcp.mjs
- .github/config.json

## Summary

Adds a semantic `<footer>` with "© {{ currentYear }} Desk Booking. All rights reserved." to `AppComponent`, outside `<router-outlet />`, so it shows on every route. The host is a column flex container (`min-height: 100vh` with a `100dvh` override) and `main { flex: 1 }`, so the footer is pushed to the viewport bottom on short pages and follows the content on long pages, without overlapping it. `html, body { margin: 0 }` in `styles.css` removes the default 8px body margin, which caused overflow and an inset footer (found in review, fixed in iteration 1).

## Acceptance criteria

- [x] AC1 Footer with copyright text rendered after `<main>`
- [x] AC2 Footer outside `<router-outlet />` (all routes)
- [x] AC3 Footer at viewport bottom on short pages, in normal flow, no overlap
- [x] AC4 Full width, centred, text wraps on narrow viewports, contrast about 14:1 (WCAG AA)
- [x] AC5 Unit test `should render the copyright footer`
- [x] AC6 Build and unit tests pass
- [x] AC7 Year computed at runtime (`new Date().getFullYear()`)

Original task acceptance criterion: "the footer should be at the bottom of the page always and render copyright message" - met.

## Test results

- `npm run build` (Frontend/): success, no errors or warnings (builder and code reviewer).
- `npm run test:ci` (Frontend/): 4 of 4 tests SUCCESS (builder, after iteration 1).
- Lint: no lint script configured.
- Visual browser check: not performed (static review only).

## Reviews

| Review | Verdict | Open findings |
|---|---|---|
| UX | approved (after iteration 1) | 0 blocker, 0 high, 1 medium, 2 low |
| Code | approved (after iteration 1) | 0 blocker, 0 high, 0 medium, 3 low (1 informational) |
| Security | approved | 0 blocker, 1 high (pre-existing), 2 low |

## Open findings

Pre-existing, not introduced by 602:
- Security F1 (high): `npm audit --omit=dev` reports 8 vulnerabilities (4 high, 4 moderate) in Angular 18.2.14 (`core`, `compiler`, `common`, `router` and others; XSS/sanitisation bypass and hydration advisories). 602 uses only auto-escaped text interpolation, so it is not exposed. Needs a separate upgrade task to a supported Angular major (also `@angular/cli`, `@angular-devkit/build-angular`, `typescript`, `zone.js`). Do not use `npm audit fix --force` blindly.
- Security F2 (low): no Content-Security-Policy; add one before real data or auth is introduced.
- Security F3 (low): dev-tooling changes in the working tree (`.vscode/mcp.json`, `scripts/ado-mcp.mjs`, `.github/config.json`) are unrelated and excluded from this commit.

Optional polish (non-blocking):
- UX #3 (medium) / Code #4 (low): footer colours `#1f2937` / `#ffffff` are hard-coded; move to CSS custom properties when PrimeNG Aura theming is introduced.
- UX #4 (low): `main` has no padding, so `<h1>` and routed content sit flush against the viewport edges; add `main { padding: 1rem }` or let routed pages add their own.
- UX #5 (low): `overflow-wrap: anywhere` is defensive only; harmless.
- Code #3 (low): the unit test checks footer text but not placement (outside `<main>`); optionally assert `main + footer`.

Task-level open questions (from `docs/tasks/602.md`):
- Work item 602 has an empty `System.Tags` (missing `deskbookingPrj`), so the `taskFilter` would not pick it up.
- Copyright owner/year/wording was not specified; "Desk Booking" with a runtime year was used.

## How to verify

1. `cd Frontend; npm install; npm run build; npm run test:ci`
2. `npm start` and open the app: the footer shows "© <current year> Desk Booking. All rights reserved." on every route.
3. Short page (resize window tall): footer touches the viewport bottom, no vertical scrollbar, no side gutters.
4. Narrow viewport (about 320px): text wraps, footer stays full width.
5. Long content: footer follows the content and does not overlap it.

## Mismatch notes

- `git status` also shows the three excluded tooling files; they must not be staged.
- Git warns that LF will be replaced by CRLF in `app.component.html` (line-ending setting only).
- The current branch is `master`; the commit step must create `feature/602-test-version-control` first.
