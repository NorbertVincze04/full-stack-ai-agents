# Backend code review - task 601

Verdict: approved

Scope: `Backend/` scaffold and root `.gitignore` against `docs/specs/601.md` (B1-B6, AC3-AC6). Source was not modified. `npm run build` re-run by the reviewer: exit 0.

## Acceptance criteria
| ID | Status | Notes |
| --- | --- | --- |
| AC3 | met | `Backend/package.json` and `Backend/src/server.ts` exist. |
| AC4 | met (by inspection and the builder's run) | `npm start` is `node src/server.ts`. `server.ts` logs exactly `hello world` from the listen callback. See M1 for a bind-error edge case. |
| AC5 | met | `tsc` exits 0 (re-verified). |
| AC6 | met | Root `.gitignore` covers `.env`, `.env.*` (with `!.env.example`), `node_modules/`, `dist/` and `.angular/`. `Backend/.gitignore` covers the same backend paths. `git status` could not confirm this because the workspace is not a git repository. |

## Requirements
- B1: met. Dependencies and dev dependencies match. `type: module`, `nodenext`, `.ts` import extensions, `verbatimModuleSyntax` and `erasableSyntaxOnly` are all set. `engines.node` is `>=22.18` (OQ1a).
- B2/B3: met. Scripts are `start`, `dev` and `build`.
- B4: met. `createApp()` is used, the port defaults to 3000, and the output is exactly `hello world`.
- B5: met. Double quotes, semicolons, trailing commas, 2-space indent and `import type` are used.
- B6: met. No `routes/`, `controllers/`, `services/` or `repositories/` folders were created. The `createApp()` factory leaves room for them.

## Findings

### Blocker
None.

### High
None.

### Medium
- M1 - `Backend/src/server.ts:6-8` - Express 5's `app.listen` registers the callback with `server.once("error", done)` (`node_modules/express/lib/application.js:598-606`, express 5.3.0). If the port is already in use (`EADDRINUSE`), the callback runs with the error as its argument. The process then prints `hello world` even though nothing is listening. Express then hits an unhandled error and the process exits. This only gives a misleading log line in a failure case and does not affect the happy path. Suggested fix: `listen(port, (error?: Error) => { if (error) { throw error; } console.log("hello world"); })`.

### Low
- L1 - `Backend/src/server.ts:4` - `Number(process.env.PORT ?? 3000)` yields `NaN` for a non-numeric `PORT` (for example `PORT=abc`), and `listen(NaN)` binds an arbitrary port. An empty `PORT=` gives `0`, which also binds a random port. Consider a small check that fails fast. This is optional for a scaffold; do it when config handling is added.
- L2 - `Backend/tsconfig.json:5,15` - `lib: ["es2023"]` does not match `target: "es2022"`, and `esModuleInterop` is redundant under `module: nodenext`. This is harmless. Align `lib` and `target`, and drop `esModuleInterop`, if you want a tidier config.
- L3 - `Backend/package.json:6-8` / `Backend/.gitignore` - `engines` is not enforced (npm only warns without `engine-strict`). There is no `.nvmrc` or `.node-version` to pin Node 22, and the local machine runs Node 24, so 22.18 is untested. Consider adding `.nvmrc` with `22`. The spec's Risks section already flags the Node version conflict with the container/CI text.
- L4 - `Backend/.gitignore` - This duplicates the root `.gitignore` entries. The spec asks for both, so this is acceptable, but the two files can drift. Optional: trim the backend file to what is backend-specific, or note in the builder report which file is authoritative. The root file also has no entries for logs (`*.log`), `coverage/`, `*.tsbuildinfo` or OS/IDE files; add them when needed.
- L5 - `Backend/package.json:15` - `dotenv@^16`. Version 17 is current and logs a banner on load. Staying on 16 is fine and avoids the extra output in the `hello world` check.

## Positive notes
- `createApp()` is separate from `listen`, which keeps it testable.
- `dotenv/config` is imported before `createApp()` runs, and `app.ts` reads `process.env` inside the factory, so ESM import hoisting is not a problem.
- `rewriteRelativeImportExtensions` makes `dist/` output resolve to `.js` imports while `src/` keeps `.ts` imports. This is a good fit for native type-stripping.
- Generated and sensitive files are handled correctly: `.env.example` is re-included, `dist/` is ignored, and `package-lock.json` is committed.

## Summary counts
- blocker: 0
- high: 0
- medium: 1
- low: 5
