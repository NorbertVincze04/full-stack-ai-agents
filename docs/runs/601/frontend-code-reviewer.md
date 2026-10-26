# Frontend code review - task 601

Verdict: approved

Findings: blocker 0, high 0, medium 1, low 4

## Acceptance criteria check
- AC1: met. NgModule app (`AppModule`, `AppRoutingModule`, `bootstrapModule` in `src/main.ts`); `@angular/core` `^18.2.0`; `angular.json` schematics set `standalone: false`; prefix `app`.
- AC2 / F2: met. `npm start` runs `ng serve` (default port 4200, development configuration).
- F3: `npm run build` re-run during review: succeeds, no warnings, initial total 233 kB. Specs were not re-run (builder reports 3/3 passing); the specs are consistent with the component.
- F4: met. `.editorconfig` has UTF-8, 2 spaces, final newline, single quotes for `.ts`.
- F5: met. Template reduced to `<h1>{{ title }}</h1><router-outlet />`; spec and `index.html` title aligned.
- AC6 (frontend part): met. The root `.gitignore` covers `.env`, `node_modules/`, `dist/`, `.angular/`; `Frontend/.gitignore` also covers them.
- Scope: no PrimeNG, `environment.ts`, proxy or feature folders. Out-of-scope items respected.

## Findings

### Medium
1. `Frontend/package.json` - no `engines` field.
   - Problem: spec Risks/OQ1 recommends Node 22 LTS (`>=22.18`); the builder ran Node 24 and added nothing. Angular 18 supports Node 18.19+, 20.11+ and 22, so an unsupported Node fails with an unclear error.
   - Fix: add an `engines` entry consistent with the Backend (for example `"node": ">=22.18"`), or document the decision.

### Low
2. `Frontend/package.json` - no `lint` script or ESLint config.
   - Problem: no automated static check for the TypeScript/Angular conventions described in the spec.
   - Fix: out of scope for 601; add `ng add @angular-eslint/schematics` in a follow-up task.
3. `Frontend/README.md` - generated CLI boilerplate.
   - Problem: it is the generic "This project was generated with Angular CLI" text, with no project-specific info (Node version, `npm start`, port).
   - Fix: replace it with a short project README.
4. `Frontend/src/app/app.component.ts` - `title` is mutable and untyped.
   - Problem: it is a constant, but declared as a mutable field.
   - Fix: optionally `readonly title = 'Desk Booking';`. Cosmetic.
5. `Frontend/src/app/app.component.spec.ts` - the "should have as title" and "should render title" specs overlap.
   - Problem: both check the same string, so changing the title needs two edits. Also, `ng test` opens Chrome with the watcher by default (builder note), and no headless launcher or `test:ci` script exists for CI.
   - Fix: keep one title spec; add a `test:ci` script (`ng test --watch=false --browsers=ChromeHeadless`) when CI is introduced.

## Checks with no issues
- RxJS/subscriptions: none present.
- Change detection: default; acceptable for a skeleton.
- Typing: strict mode on, `strictTemplates` on, no `any`.
- Module boundaries: `core/features/shared` intentionally absent (out of scope).
- Dead code: none; `app.component.css` is empty, which is the CLI default.
