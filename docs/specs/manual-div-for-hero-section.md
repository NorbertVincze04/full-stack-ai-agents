# Spec: div for hero section (manual-div-for-hero-section)

## Summary
Split the booking page main area (`.booking-layout` in `BookingComponent`) into two equal halves: calendar left, desk plan right. No element named "hero" exists; the booking area is taken as the hero section (A1).

## Scope
- In: layout of `.booking-layout`, `.layout-calendar`, `.layout-plan` (wrapper divs already exist in `booking.component.html`); CSS for 50/50 columns and stacking on narrow screens.
- Out: calendar, desk plan, booking logic, top bar, other pages, backend.

## Area
`frontend` (no backend, API or database change).

## Scope flags
- ui-changes: yes - layout proportions and responsive behaviour.
- logic-changes: no - behaviour unchanged.
- security-relevant: no.
- dependencies-changed: no.
- database-changes: no.
- scaffolding-only: no.

## Functional requirements
- Two halves of equal width side by side: `app-calendar` in the left div, `app-desk-plan` in the right div.
- Narrow screens: halves stack, calendar above desk plan.
- Selecting days/desks, Book Now / Withdraw and desk availability work as before.

## UI behaviour
- Wide viewport: 50% / 50% columns with a gap, content of each half fits without horizontal overflow.
- Narrow viewport (assumed below 768px, A3): one column, full width.

## Acceptance criteria
- AC1: At a wide viewport the calendar div and the desk plan div have equal width (50/50, gap excluded), calendar on the left, desks on the right.
- AC2: `app-calendar` is inside `.layout-calendar` and `app-desk-plan` inside `.layout-plan`, both inside `.booking-layout`.
- AC3: At a narrow viewport the two divs stack vertically, calendar first, without horizontal scrolling.
- AC4: Calendar and desk plan behaviour is unchanged; existing booking specs (`booking.component*.spec.ts`, `desk-numbering.spec.ts`) still pass.
- AC5: `npm run build` and `npm test` in `Frontend/` pass.

## Assumptions
- A1: The "hero section" is the booking area (`.booking-layout`); there is no hero element.
- A2: 50/50 side by side, calendar left, desks right; one div per half (existing ones reused).
- A3: Breakpoint for stacking is 768px.
- A4: Existing behaviour and component markup inside the divs stay unchanged.

## Risk gate
none

## Decisions
none

## Open Questions
none
