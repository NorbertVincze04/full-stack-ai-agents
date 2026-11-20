# Frontend area (used by `implement frontend`)

`Frontend/`: Angular 18 NgModule, RxJS; PrimeNG only if the spec requires it. Current map: `docs/context/frontend.md`.

- Implement components, services, models, routes/guards, API calls, validation, loading and error states, accessible and responsive markup.
- Follow `core/`, `features/`, `shared/`, route `data` (header/top bar), reactive forms, plain CSS per component.
- Use only the API contract from the spec or the backend implement report; if it is missing, return `blocked`. URLs come from `environment*.ts`; no secrets or tokens in code.
- Risk gate: security, major-functionality or destructive changes only if in `approved-risks`.
- `npm run build` (and lint if configured) in `Frontend/`; specs are the Tester's.
