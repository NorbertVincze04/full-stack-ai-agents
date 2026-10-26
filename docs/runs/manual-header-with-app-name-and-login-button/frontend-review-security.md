# Frontend security review - manual-header-with-app-name-and-login-button

Verdict: approved

Note: the requested path was `frontend-security-reviewer.md`; the mode instructions specify `frontend-review-security.md`. This report is written at the mode-defined path.

## Scope reviewed
- `Frontend/src/app/app.component.html`, `app.component.css`, `app.component.spec.ts` (uncommitted diff), plus `app.component.ts`, `app-routing.module.ts`, `main.ts`.
- Builder report: `docs/runs/manual-header-with-app-name-and-login-button/frontend-builder.md`.

## Code checks
- Secrets/tokens in code or environment files: none found in `Frontend/src`.
- `localStorage`/`sessionStorage`/URLs/logs with sensitive data: none. Only `console.error(err)` in `main.ts` (unchanged, pre-existing).
- XSS: no `innerHTML`, `bypassSecurityTrust*` or unsanitised input. `{{ title }}` is interpolated from a hard-coded readonly constant and is auto-escaped.
- Auth guards: no routes added (`routes = []`); nothing to guard. The `Login` button has no handler, no navigation and no auth state.
- Open redirects: `routerLink="/"` is a static internal link.
- Error leakage, over-fetching, CORS/URL assumptions: no HTTP calls or new data access.
- `package.json`/lock files: unchanged; no dependencies added.

## Dependency checks (`Frontend/`)
- `npm audit --omit=dev`: 8 vulnerabilities (4 high, 4 moderate), 0 critical. All are in the existing Angular 18.2.x packages (`@angular/core`, `common`, `compiler` and their dependants); the advisories cover i18n/SVG sanitisation bypasses, HttpTransferCache, XSRF token handling and formatDate/number DoS. Fix is only available via `npm audit fix --force` (Angular 22, breaking).
- `npm outdated`: all `@angular/*` packages are at 18.2.x (latest 22.2.x); also `@angular-devkit/build-angular`, `@angular/cli`, `typescript`, `zone.js`, `jasmine-core`, `@types/jasmine` behind latest.
- Under the updated rule (only npm `critical` is a blocker), these are reported as `medium` and are not blocking. None were introduced by this task.

## Findings

| # | Severity | File / package | Problem | Suggested fix |
|---|----------|----------------|---------|---------------|
| 1 | medium | `@angular/core`, `@angular/common`, `@angular/compiler` (18.2.14, transitively router/forms/platform-browser/animations) | npm audit reports high-severity advisories (XSS/sanitisation bypasses, XSRF token leakage, HttpTransferCache) in the installed Angular range `<=19.2.25`. Pre-existing; not added by this task. The new header does not use i18n, SVG bindings, `HttpClient`, SSR or hydration, so the changed code does not exercise the affected features. | Plan a separate Angular upgrade task (to a patched supported version) before adding `HttpClient`/auth work. |
| 2 | low | `Frontend/package.json` | Whole Angular toolchain and TypeScript are several majors behind latest (18.x vs 22.x). | Include in the same upgrade task. |
| 3 | low | `app.component.html` (login button) | Placeholder `Login` button. No risk today. When real login is implemented, tokens must not go to `localStorage`/URLs, and guards must cover new routes. | Review again when the auth task is built. |

## Counts
- blocker: 0
- high: 0
- medium: 1
- low: 2
