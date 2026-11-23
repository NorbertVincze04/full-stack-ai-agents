# Review ux - manual-div-for-hero-section

Verdict: approved

## Review selection
- ux: run (`ui-changes`; `booking.component.css` changed).
- code: skipped (no logic change; markup and TS unchanged).
- security: skipped (not security-relevant, no dependency change).

Sources: brief.md, implement-frontend.md, `booking.component.css`, `booking.component.hero-layout.spec.ts`. Build and 293/293 tests taken from the implement report.

## Container query vs viewport media query
- Support: `@container` size queries and `container-type: inline-size` are baseline in Chrome/Edge 105+, Safari 16+, Firefox 110+ (all evergreen since early 2023). Angular 18 targets evergreen browsers only, so no issue. Unsupported browsers drop the rule and keep the side-by-side row (no stacking), a graceful degradation.
- Layout effect: the host is `display: block` and full width, so the container width equals the viewport width as long as `app-booking` is not nested in a narrower parent. Breakpoint matches AC3 (768 px) today. If the page later gets a sidebar or max-width wrapper, the stack point shifts with the container, which is arguably the desired behaviour.
- `container-type: inline-size` applies inline-size containment to the host: the host's width can no longer depend on its content. Harmless for a block-level full-width host. The host is the query container, so the `.top-bar` and children are unaffected.
- Reason for the choice (Karma window < 768 px, viewport query always stacks) is valid; the spec measures with `root.style.width`, so the tests exercise the real rule.

## Findings
- low | booking.component.css:79 | Breakpoint is a container width, differing from the viewport-based convention a reader expects; no comment states why. Fix: one-line comment naming the host as the query container.
- low | calendar.component.css:3 | Calendar keeps `max-width: 24rem` and is left-aligned inside its 50% div; between 768 and ~770 px and at wide screens a gap may appear right of the calendar. Fix: optional `margin-inline: auto` or accept. Not a spec violation (AC1 measures divs).
- low | desk-plan.component.css:39 | Desk text stays 0.75rem and the plan is about 372 px wide at 768 px (4 columns, about 85 px each); the 12 px text issue is already tracked from the mockup review, not worsened materially. Fix: verify visually at 768 px.
- low | spec hero-layout | 320 px overflow is asserted via `root.scrollWidth`; the container-query stack at 767 and 768 px boundaries is covered. No test for the `.top-bar` at 320 px (unchanged).

## Checks
- Responsive: stacks at below 768 px, calendar first (DOM order), `min-width: 0` prevents overflow; AC1 to AC3 covered by specs.
- Keyboard/ARIA/contrast: unchanged (markup unchanged).
- States: empty/loading/error unchanged.

Counts: blocker 0, high 0, medium 0, low 4.
