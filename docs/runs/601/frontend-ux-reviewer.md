# Frontend UX review - task 601

Verdict: approved

Findings: blocker 0, high 0, medium 0, low 4

## Scope reviewed
`Frontend/src/index.html`, `src/app/app.component.{html,ts,css}`, `src/app/app-routing.module.ts`, `src/styles.css`, `public/favicon.ico` against `docs/specs/601.md` (F5, "UI behaviour"). The spec requires only a minimal root component with no console errors and has no navigation, form or styling requirements. PrimeNG, theming and shared components are out of scope, so there is no Aura or shared-component baseline to compare against yet.

## What conforms
- `index.html` has `lang="en"`, a responsive viewport meta tag (`width=device-width, initial-scale=1`) and a meaningful `<title>` ("Desk Booking"). This satisfies the basic accessibility and responsiveness rules.
- The template is reduced to `<h1>{{ title }}</h1><router-outlet />`, so no boilerplate marketing content ships (F5).
- There is a single `<h1>`, and the heading text matches the document title.
- No fixed widths or overflow-prone styles exist, so the page reflows at any viewport width.
- The empty, loading, error and disabled states, form validation, keyboard navigation and route `data` are not applicable: the page has no interactive elements and `routes` is `[]`.

## Findings

### Low
1. **No `<main>` landmark** - `Frontend/src/app/app.component.html` (line 1). The `<h1>` and `<router-outlet />` sit outside any landmark, so screen-reader users get no "main" region to jump to (WCAG 1.3.1 / 2.4.1). Fix: when feature pages are added, wrap the outlet in `<main>` (and add `<header>` for the top bar). It is not needed to pass this task.
2. **No `<noscript>` fallback** - `Frontend/src/index.html` (line 10). With JavaScript disabled the page is blank with no explanation. Fix: add `<noscript>This app requires JavaScript.</noscript>` inside `<body>`. This can wait for the first real-UI task.
3. **Unstyled defaults** - `Frontend/src/styles.css` (line 1), `app.component.css` (empty). The page uses the browser default serif font and 8px body margin. This is acceptable because the spec has no styling requirements. Follow-up: the PrimeNG/Aura task should set the base typography, body margin and `box-sizing` globally so later pages stay consistent.
4. **Favicon is likely the Angular default** - `Frontend/public/favicon.ico`. This could not be verified because the file is binary. Spec F5 asks that no boilerplate ships, and the default Angular icon is branding for another product. Replace it with an app icon in a later task.

## Notes
- No empty-route or 404 handling exists (`routes = []`). Any URL other than `/` renders only the heading. This is out of scope here. Add a wildcard/not-found route when the first feature routes land.
