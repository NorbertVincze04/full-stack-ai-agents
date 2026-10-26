# Backend context

## Stack and commands
Node >= 22.18, TypeScript ESM (`module: nodenext`, `.ts` import extensions, `erasableSyntaxOnly`), Express 5, `cors`, `dotenv`. Dev tooling: `tsx`, `typescript`.

| Command (in `Backend/`) | Purpose |
| --- | --- |
| `npm start` | `node src/server.ts` (native TS type stripping) |
| `npm run dev` | `tsx watch src/server.ts` |
| `npm run build` | `tsc` -> `dist/` |
| `node --test "tests/**/*.test.ts"` | tests (there is no `npm test` script yet) |

## Structure (path -> role)

| Path | Role |
| --- | --- |
| `src/app.ts` | `createApp()`: builds the Express app (CORS, `express.json()`); no routes yet |
| `src/server.ts` | loads `dotenv`, reads `PORT`, listens, logs `hello world` |
| `tests/app.test.ts` | `createApp()` behaviour: 404s, CORS default and override |
| `tests/server.test.ts` | startup log from `node src/server.ts` and from `dist/` |
| `.env.example` | documented env vars |

Target layering when features arrive: routes -> controllers -> services -> repositories.

## Config / environment

| Var | Default | Use |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGIN` | `http://localhost:4200` | allowed origin |

## API or routes
None. Every request returns 404.

## Data
None yet. See `project.md` for the planned schema.

## Conventions
- Import local modules with the `.ts` extension.
- Parameterised SQL only; secrets only from environment.
- Response shape `{ success, payload?, message?, errors? }` once routes exist.

## Tests
`node:test` + `describe/it`, run through Node's test runner; no DB or network access.

## Decisions and known gaps
- Express 5 `listen` callback also runs on bind errors (port conflict still logs `hello world`).
- `PORT` and empty `CORS_ORIGIN` are not validated; no helmet/rate limiting yet.
