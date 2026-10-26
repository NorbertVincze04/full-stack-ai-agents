# Frontend security review - task 601

Verdict: changes-requested (re-review after fix iteration 1)

Scope: scaffolded `Frontend/` (Angular 18, NgModule), per `docs/specs/601.md` and `docs/runs/601/frontend-builder.md` (including "Iteration 1").
Checks run (read-only): source review of changed files, `npm audit --omit=dev`, `npm outdated` in `Frontend/`.

## Summary

| Severity | Count | Change since iteration 0 |
|----------|-------|--------------------------|
| blocker  | 0     | none |
| high     | 1     | H1 still open |
| medium   | 1     | M1 still open |
| low      | 2     | L1 resolved, L2 and L3 unchanged |

## Findings

### H1 - high - OPEN - Angular 18.2.14 runtime packages have unpatched high-severity advisories
- Package: `@angular/core`, `@angular/common`, `@angular/compiler` (installed 18.2.14), plus dependents `@angular/forms`, `@angular/router`, `@angular/platform-browser`, `@angular/platform-browser-dynamic`, `@angular/animations`. Declared in `Frontend/package.json` (`^18.2.0`).
- Re-run `npm audit --omit=dev` (iteration 1): 8 vulnerabilities (4 moderate, 4 high), identical to iteration 0. All are Angular packages, affected range `<=19.2.25`. `npm outdated` is unchanged.
- Advisories include XSS (i18n bindings and event-handler attributes, unsanitised SVG/MathML attributes, template/namespace sanitisation bypass, host-binding sanitisation bypass, two-way binding bypass), XSRF token leakage via protocol-relative URLs in `HttpClient`, `HttpTransferCache` data leakage/poisoning, hydration DOM clobbering, and DoS in `formatDate`/number formatting.
- The only fix npm offers is `@angular/*@22.2.3` (breaking, via `--force`). Nothing within 18.x or 19.x resolves it. Angular 18 is also out of support.
- Current exploitability is low: the app has no i18n, `HttpClient`, SSR/hydration, SVG bindings, dynamic components or user input, and renders only `{{ title }}`. The risk applies as soon as booking features are built on this base.
- Builder response (iteration 1): documented as "accepted risk pending owner decision". No dependency change was made, which is correct: the spec pins Angular 18 (F1, AC1) and no in-range fix exists (`npm audit fix` made no changes; every fix is a breaking major).
- Why it stays open:
  - A builder note is not a risk acceptance. The builder report says the decision is pending, and no owner sign-off exists in `docs/`.
  - No follow-up upgrade task has been created; the builder only states one is "required".
  - The advisories remain unfixed in the shipped dependency set.
- The builder's exploitability assessment is confirmed: iteration 1 changes add no i18n, `HttpClient`, SSR/hydration, SVG bindings or user input. Grep of `Frontend/src` for `innerHTML`, `bypassSecurityTrust*`, `eval(`, `localStorage`, `sessionStorage`, `HttpClient`, `apiUrl` has no matches.
- To close H1, do one of:
  1. Record an explicit owner risk acceptance (in `docs/specs/601.md` or the task) limited to the no-feature baseline, plus a created upgrade task that blocks all feature work. The finding can then be tracked as medium and the verdict moved to approved.
  2. Upgrade to a supported Angular release (22.x per audit) under an amended spec.

### M1 - medium - OPEN - Spec-pinned stack is several major versions behind
- `npm outdated`: Angular packages 18.2.x vs 22.2.3 latest, `@angular/cli` 18.2.21 vs 22.2.3, `@angular-devkit/build-angular` 18.2.21 vs 21.2.27, `typescript` 5.5.4 vs 7.0.2, `zone.js` 0.14.10 vs 0.16.3, `jasmine-core` 5.2.0 vs 7.0.2, `@types/jasmine` 5.1.15 vs 7.0.0, `karma-jasmine-html-reporter` 2.1.0 vs 2.3.0.
- Same root cause as H1; the dev tooling (CLI, build-angular) is also on an old line and is not covered by `--omit=dev`.
- Fix: schedule the upgrade together with H1. Run `npm audit` without `--omit=dev` in the same task to cover the build toolchain.

### L1 - low - RESOLVED - No `engines` field
- `Frontend/package.json` now has `"engines": { "node": ">=22.18" }`.
- Optional hardening: add `.nvmrc` or a CI pin so builds use the supported Node.

### L2 - low - OPEN (deferred, acceptable) - No Content-Security-Policy or security headers defined
- `Frontend/src/index.html` has no CSP `<meta>` and the dev server sends no headers. Acceptable for a scaffold with no content.
- Fix: define a CSP and headers (nginx, per the project overview) when the container/deploy task is done. Avoid `unsafe-inline` and `unsafe-eval` for scripts.

### L3 - low - OPEN (no action) - Generated `Frontend/.vscode/` and build output present in the workspace
- `Frontend/.vscode/{extensions,launch,tasks}.json` contain only localhost URLs (`4200`, `9876`) and no secrets.
- `Frontend/dist/` and `Frontend/.angular/` exist locally. They are ignored by the root `.gitignore` (`dist/`, `.angular/`, `node_modules/`). The workspace is not a git repository (no `.git`), so ignore rules could not be verified with `git check-ignore`.
- Fix: none required. Confirm the ignore rules once the repository is initialised.

## Iteration 1 change review (no new findings)
- `Frontend/src/app/app.component.html`: `<main>` wrapper, interpolation only, no HTML sinks.
- `Frontend/src/index.html`: static `<noscript>` text, no inline scripts.
- `Frontend/package.json`: new `test:ci` script and `engines` only; no dependency added or changed.

## Checks with no findings
- Secrets or tokens in code or config: none found. No `.env*` files in `Frontend/`. Root `.gitignore` covers `.env`, `.env.*` (with `!.env.example`).
- Sensitive data in `localStorage`, `sessionStorage`, logs or URLs: none. The only logging is `console.error(err)` in `Frontend/src/main.ts` (the CLI bootstrap default; it prints the bootstrap error only).
- XSS sinks (`innerHTML`, `bypassSecurityTrust*`, `eval`): none. The template uses interpolation only (`Frontend/src/app/app.component.html`).
- Auth guards: no routes defined (`app-routing.module.ts` has no routes), so nothing to guard yet.
- Open redirects, CORS/URL assumptions, `apiUrl`, proxy config: none present. No backend calls.
- Over-fetching of personal data and error messages leaking internals: not applicable, no data access.
- `angular.json`: production configuration keeps defaults (optimisation and hashing on, source maps only in the development configuration).

## Recommendation
Keep the scaffold at no-feature baseline. Approve only after H1 is closed through owner acceptance with a blocking upgrade task, or through an upgrade. Do not start feature work on Angular 18.
