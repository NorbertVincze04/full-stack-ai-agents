# Brief - manual-terms-services-page Terms of Service page
Spec: docs/specs/manual-terms-services-page.md (open only the sections you need that are not here) | Source: manual | Status: specified
Area: frontend | Pipeline scope: n/a
Scope flags (yes only): ui-changes
Limits: maxTestFixLoops 2, maxFixIterations 2, tdd always, tddFirst true, e2e auto, security auto, reviewers auto
Approved risks: none
Decisions: D1 link in app header next to Help | D2 route /terms, label "Terms" | D3 page h1 "Terms of Service" | D4 short placeholder text, marked not legal text

## Acceptance criteria
AC1: `/terms` shows the `<h1>` "Terms of Service".
AC2: Page shows short placeholder text saying it is not legal text.
AC3: Header has a "Terms" link to `/terms`, next to "Help" and before Login (signed out) or user name (signed in).
AC4: Link works with keyboard, visible focus style, navigates without reload.
AC5: Existing header/footer behaviour and specs unchanged.
AC6: New specs cover heading, text and link; `npm run test:ci` and `npm run build` pass.

## Read first
- docs/agents/implementer.md, docs/agents/tester.md, docs/context/project.md, docs/context/frontend.md
- API contract: none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
| spec | docs/specs/manual-terms-services-page.md | ready |
