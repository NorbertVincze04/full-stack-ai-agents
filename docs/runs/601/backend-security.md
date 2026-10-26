# Backend security report - task 601

Verdict: approved

Scope: `Backend/` (`src/app.ts`, `src/server.ts`, `package.json`, `package-lock.json`, `tsconfig.json`, `.env.example`, `.gitignore`) and root `.gitignore`. Read-only checks only; no code modified.

## Findings by severity

| Severity | Count |
| --- | --- |
| blocker | 0 |
| high | 0 |
| medium | 0 |
| low | 4 |

### Low

**L1 - `PORT` not validated** (`Backend/src/server.ts` line 4)
`Number(process.env.PORT ?? 3000)` yields `NaN` for non-numeric values, and an empty string gives `0` (random port). Risk: misconfiguration, not exploitable.
Fix: validate with `Number.isInteger` and range, else fail fast or fall back to 3000.

**L2 - CORS origin fallback and empty value** (`Backend/src/app.ts` line 7)
Single-origin allow-list from `CORS_ORIGIN`; no wildcard, no `credentials`. That is safe for this task. Two points for later tasks:
- `??` does not catch an empty `CORS_ORIGIN=`, which `cors` then handles as a non-matching string. This is a fail-closed misconfiguration.
- The localhost default is applied in every environment. Production must set `CORS_ORIGIN` explicitly.
Fix: require `CORS_ORIGIN` when `NODE_ENV=production`. If the auth task adds cookies (`credentials: true`), keep the exact origin and never use `*`.

**L3 - No hardening middleware** (`Backend/src/app.ts`)
There is no `helmet`, so `X-Powered-By: Express` is sent. There is no rate limiting and `express.json()` uses the default 100 kb limit. No routes exist yet, so there is no current exposure; auth, JWT and rate limiting are out of scope for 601 per the spec.
Fix: `app.disable("x-powered-by")` or `helmet`, plus rate limiting when auth and booking routes are added.

**L4 - Outdated dependencies** (`npm outdated`, no CVEs)
| Package | Current | Latest | Note |
| --- | --- | --- | --- |
| `dotenv` | 16.6.1 | 18.0.8 | major behind; no advisory |
| `typescript` | 5.9.3 | 7.0.2 | major behind; the `^5.8` range is intentional |
| `@types/node` | 22.20.5 | 26.6.5 | intentionally pinned to the Node 22 line |
Fix: no action now; review at the next dependency refresh.

## Checks with no findings

- **Dependencies:** `npm audit --omit=dev` and `npm audit` both report 0 vulnerabilities. `express@5`, `cors` and `dotenv` are the only runtime packages.
- **Injection / SQL:** no database, no routes, no query construction.
- **Auth / access control:** no endpoints, so there is nothing to protect yet; no hard-coded JWT secret or fallback credentials.
- **Secrets:** no hard-coded secrets in source. `.env.example` holds only `PORT` and `CORS_ORIGIN`, with non-sensitive values. No real `.env` file exists in `Backend/`.
- **`.env` handling:** `dotenv/config` is loaded in `server.ts` only. The root `.gitignore` and `Backend/.gitignore` both ignore `.env` and `.env.*` and re-include `.env.example`. They also ignore `node_modules/`, `dist/`, and `.angular/` (root only).
- **Unsafe APIs:** no `child_process`, `eval`, or dynamic requires.
- **Logging / error leakage:** startup logs only `hello world`; no personal data or stack traces are exposed.
- **Build scripts:** the build and start scripts are plain `tsc` and `node`; the `tsx` dev tool is a dev dependency only. The npm warning about the esbuild postinstall is not a runtime concern.

## Notes

- The workspace is not a git repository (`git status` fails), so ignore rules were verified by file inspection only, not with `git check-ignore`. Re-check once the repository is initialised that `Backend/.env` and `Backend/dist/` are untracked.
- `Backend/dist/` exists locally from the build; it is git-ignored.
- Out of scope per spec 601: auth, DB, rate limiting, containers and CI. Findings L1-L3 should be tracked for the tasks that introduce those features.
