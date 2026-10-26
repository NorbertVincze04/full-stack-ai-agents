# Frontend Security Review - Task 602

Verdict: approved

The 602 change adds no security issues. The one high finding is a pre-existing dependency issue that this change does not introduce or exercise. Track it as a follow-up.

## Scope reviewed
- `Frontend/src/app/app.component.html`, `.css`, `.ts`, `.spec.ts` (git diff)
- `Frontend/src/index.html`, `Frontend/package.json`
- Spec: `docs/specs/602.md`; builder report: `docs/runs/602/frontend-builder.md`
- Commands run (read-only): `git diff`, `npm audit --omit=dev`, `npm outdated`

## Findings

### F1 - high - Vulnerable Angular 18.2.x packages (pre-existing, not added by 602)
- Package: `@angular/core`, `@angular/compiler`, `@angular/common`, `@angular/router`, `@angular/animations`, `@angular/forms`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`. Installed 18.2.14. Audit flags `<=19.2.25`.
- `npm audit --omit=dev` reports 8 vulnerabilities: 4 high (`core`, `compiler`, `common`, `router`) and 4 moderate.
- The advisories cover XSS and sanitisation bypasses:
  - i18n attribute and event-handler bindings
  - SVG/MathML attributes
  - namespace bypass
  - host-binding bypass
  - two-way binding bypass
  - client hydration DOM clobbering and response-cache poisoning
- Exposure in 602: none. The footer only uses `{{ currentYear }}` text interpolation, which Angular auto-escapes. The change has no i18n, SVG/MathML, `innerHTML`, host bindings or SSR/hydration.
- Impact: the app is exposed as soon as it uses any of the affected features, and Angular 18 is no longer receiving fixes.
- Suggested fix: plan a separate upgrade task to a supported, patched Angular major.
  - `npm audit` points to 20.1.8 for `@angular/animations` and 22.2.3 for the other packages.
  - Upgrade `@angular/cli`, `@angular-devkit/build-angular`, `typescript` and `zone.js` in step with it.
  - Do not use `npm audit fix --force` blindly.
- Not a blocker for 602, because it is pre-existing and not reachable from this change.

### F2 - low - No Content-Security-Policy or other hardening headers or meta
- File: `Frontend/src/index.html`
- No CSP is defined. This is acceptable for the scaffold. Add a CSP, preferably as a response header from the host, before real data or auth is introduced.

### F3 - low - Dev tooling config changed in the working tree, outside the 602 frontend scope
- Files: `.vscode/mcp.json` (`ADO_MCP_PROXY` set to `http://127.0.0.1:3128`), `scripts/ado-mcp.mjs` (proxy override), `.github/config.json` (`project` set to `WebTools`).
- No secret is committed. `ADO_PAT` is still read from an input prompt and removed from the child environment.
- The local proxy is plain HTTP on loopback only. Make sure the proxy is trusted and that the loopback port is not exposed to other hosts.
- These changes are unrelated to the 602 frontend. Commit them separately from the feature.

## Checklist results

| Check | Result |
|---|---|
| Secrets or tokens in code or env files (frontend) | None found |
| Sensitive data in `localStorage`, logs, URLs | None; no storage or logging added |
| XSS sinks (`innerHTML`, `bypassSecurityTrust*`, unsanitised input) | None; text interpolation only |
| Auth guards on new routes | N/A; no routes added |
| Error messages leaking internals | N/A; none added |
| Over-fetching of personal data / API calls | None; no HTTP calls |
| CORS / hard-coded URL assumptions | None |
| Open redirects | None |
| Year computed at runtime (no stale or injected data) | `new Date().getFullYear()` in the component; safe |

## Dependencies
- Newly added dependencies: none.
- `npm audit --omit=dev`: 8 vulnerabilities (4 high, 4 moderate), all Angular 18.2.x (see F1).
- `npm outdated`: the Angular packages are on 18.2.x and the latest is 20 to 22. Other outdated packages are all dev-only and not part of the audit findings:
  - `typescript` 5.5.4 (latest 7.0.2)
  - `zone.js` 0.14.10 (latest 0.16.3)
  - `jasmine-core` 5.2.0 (latest 7.0.2)
  - `@types/jasmine` 5.1.15 (latest 7.0.0)
  - `karma-jasmine-html-reporter` 2.1.0 (latest 2.3.0)
  - `@angular/cli` and `@angular-devkit/build-angular` (18.2.21, latest 22.2.4 and 21.2.28)

## Counts
- blocker: 0
- high: 1
- medium: 0
- low: 2
