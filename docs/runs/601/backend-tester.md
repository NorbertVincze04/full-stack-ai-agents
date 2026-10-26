# Backend tester report - task 601

Verdict: pass

## Tests added (`Backend/tests/`, no new dependencies)
Uses `node:test` + `node:assert` with Node's native TS type-stripping (no `tsx` needed at runtime), `fetch`, and a spawned child process for startup checks.

- `app.test.ts` (8 tests): `createApp()` returns an Express app and a new instance per call; unknown GET `/does-not-exist`, `/`, and unknown POST with JSON body return 404; default CORS origin `http://localhost:4200` is allowed; other origins are not granted; `CORS_ORIGIN` env override is honoured. Ephemeral port (`listen(0)`), no network dependencies, no DB.
- `server.test.ts` (2 tests): `node src/server.ts` (the `npm start` command) prints exactly `hello world` with empty stderr; compiled `dist/server.js` prints `hello world` (skipped if `dist/` is missing).

## Run command
`node --test "tests/**/*.test.ts"` from `Backend/` (a bare `tests/` directory argument fails on Node 24; see finding M1).

## Results
- 10 tests, 10 pass, 0 fail, 0 skipped.
- Coverage (`--experimental-test-coverage`): `src/app.ts` 100% line/branch/function. `src/server.ts` runs in a child process so it is not counted.

## Acceptance criteria coverage
| AC | Result | Evidence |
| --- | --- | --- |
| AC3 | pass | `package.json` and `src/server.ts` exist; server test starts it |
| AC4 | pass | `npm start` output is `> node src/server.ts` then `hello world`; stderr empty; automated test also asserts exact output |
| AC5 | pass | `npm run build` exit 0 on a clean `dist/`; emits `app.js`, `server.js`; compiled server prints `hello world` |
| AC6 | pass (file inspection) | root and `Backend/.gitignore` list `node_modules/`, `dist/`, `.env`, `.env.*` (`.env.example` re-included); root also `.angular/`. Not verified with git: the workspace is not a git repository |
| AC1, AC2 | not tested | Frontend out of scope for this run |

Backend behaviour: no routes (404 everywhere), as required by "API / data changes: none". Auth/validation/conflict/rate-limit tests are not applicable to this scaffold.

## Findings
- blocker: none
- high: none
- medium: none
- low:
  - L1. `package.json` has no `test` script, so `npm test` fails with "Missing script: test". Suggested: `"test": "node --test \"tests/**/*.test.ts\""`. Not changed (production files off-limits).
  - L2. `engines.node` is `>=22.18`, but tests and builder verification ran only on Node v24.21.0; Node 22.18 is untested.
  - L3. `server.ts` ignores an invalid `PORT` (e.g. `abc` gives `NaN`, which Node treats as a random port) and prints `hello world` before confirming the real bound address. Acceptable for the scaffold.
  - L4. `tsconfig.json` `include` is `src/**/*.ts`, so `tests/` is not type-checked by `tsc`; tests rely on type-stripping only.

## Notes
- `npm run dev` (`tsx watch`) was not tested.
- Test processes are spawned with `PORT=0` and killed after the log line, so port 3000 is not required to be free for the test suite.
