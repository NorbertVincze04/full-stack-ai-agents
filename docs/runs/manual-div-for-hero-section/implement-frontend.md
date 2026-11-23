# Implement frontend - manual-div-for-hero-section

Verdict: done

## Acceptance criteria
- AC1: `.layout-calendar` and `.layout-plan` are `flex: 1 1 0` in a non-wrapping `.booking-layout` row (50/50, gap excluded; `max-width` and `justify-content: center` removed).
- AC2/AC4: markup and TS unchanged.
- AC3: `@container (max-width: 767.98px)` on `.booking-layout`: column, calendar first, divs 100% wide.
- AC5: build and `npm run test:ci` pass (293/293).

## Diagnosis
A viewport `@media` query made the 2 red specs still fail: the Karma window is below 768 px, so the layout always stacked. Used a container query instead (`:host { display: block; container-type: inline-size }`); the host is full width, so the behaviour in the app matches a 768 px viewport breakpoint.

## Files changed
- Frontend/src/app/features/booking/booking.component.css
- docs/context/frontend.md, docs/agents/implementer.md

## Commands
- `npm run test:ci`: 293 SUCCESS
- `npm run build`: complete

## Known gaps
None. No dependencies added.
