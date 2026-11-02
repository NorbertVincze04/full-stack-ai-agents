# Container build - manual-containerize-the-app-with-podman

Verdict: needs-human
Root cause in: environment

Files are written and statically reviewed; nothing was built, pulled or started because EP1, EP2 and EP4 are not met.

## Environment prerequisites (checked, read-only)
| EP | Result |
| --- | --- |
| EP1 Podman machine | `podman` 6.0.2 installed; `podman machine list` empty; no connection. `wsl --status` reports "Windows Subsystem for Linux optional component" is not enabled for WSL1 (default version 2). R1 allows `podman machine init`/`start`, but it needs the WSL feature and a VM image download through the proxy (EP2), so it was not attempted. |
| EP2 Bosch proxy | Nothing listens on `127.0.0.1:3128` (`Test-NetConnection` false). Reachability from the VM as `host.containers.internal:3128` is unverifiable. |
| EP3 CA | Not applicable yet (no build ran, no TLS error). |
| EP4 Compose provider | `docker-compose`/`podman-compose`/`docker` not on PATH; `podman compose version` fails with no machine. |

### What the human must do
1. Enable the Windows "Windows Subsystem for Linux" / "Virtual Machine Platform" features (needs admin), then ask to re-run so the agent can `podman machine init`/`start` (R1), or create/start the machine yourself.
2. Start the local Bosch proxy so it listens on `127.0.0.1:3128` and accepts connections from the VM.
3. Install a compose provider (`docker-compose` v2 or `podman-compose`) that is on PATH. `docker-compose` v2 is preferred (supports `additional_contexts`, `${VAR:?}`).
4. Only if a build later fails with a TLS error: put the root CA as `certs/*.crt`.

## Files created
- `compose.yaml`, `.env.example`
- `.env` (created because it was missing; generated 64-hex `POSTGRES_PASSWORD` and `JWT_SECRET`; not printed; gitignored, `git check-ignore .env` succeeds). Note: a first generation attempt wrote all-zero values (PowerShell 5.1 has no `RandomNumberGenerator.Fill`); it was regenerated immediately with `GetBytes`, before any use. Variables: `COMPOSE_PROJECT_NAME`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_SCHEMA`, `JWT_SECRET`, `FRONTEND_PORT`, `BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY`.
- `Backend/Containerfile`, `Backend/.containerignore`
- `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`
- `certs/README.md`
- Updated: `docs/context/containers.md` (rewritten to the final state), `docs/context/project.md` (database row, new containers row). `docs/context/backend.md` already describes `/api/health`, `DB_SCHEMA` and init SQL; no change needed. Root `.gitignore` checked: `.env`, `.env.*` (except `.env.example`), `/certs/*.crt`, `/db-backups/` already covered; no change.

## Commands
- Start: from the repo root, with `HTTP_PROXY`/`HTTPS_PROXY` set to `http://127.0.0.1:3128` for that command: `podman compose up -d --build`
- Stop: `podman compose down` (never `-v`).
- Verify: `podman compose ps`; `curl http://localhost:4200/api/health`; `podman exec deskbooking-db-1 psql -U <user> -d <db> -c '\dt "ico-env".*'`.

## Acceptance criteria (design, not executed)
- AC1 compose with `service_healthy` chain; healthchecks on all services. Not run.
- AC2 nginx serves the SPA with fallback; `/api/` proxied to `backend:3000`. Not run.
- AC3 backend healthcheck and nginx path via `/api/health`. Not run.
- AC4 init SQL mounted read-only into `/docker-entrypoint-initdb.d`. Not run.
- AC5 `.env` ignored; `compose.yaml` has no literal secret (only `${VAR}`); no secret `ENV`/`ARG` in Containerfiles; `.containerignore` excludes `.env*`.
- AC8 proxy only as build `ARG`s (inline for `npm ci`), runtime proxy variables blanked in all services; CA via `NODE_EXTRA_CA_CERTS` in build stages only; no TLS disabling.
- AC9 only `127.0.0.1:${FRONTEND_PORT:-4200}:8080` published; backend runs as `node`, nginx as `nginx`; `cap_drop: ALL` + `no-new-privileges` on both; no privileged; only mount besides the volume is read-only repo SQL; images from `docker.io/library` with pinned tags. The `db` container runs the upstream postgres entrypoint (starts as root, drops to `postgres`), so it has no `cap_drop`.
- AC10 `db-data` named volume; no `-v` used.
- AC12 only `location /api/`; `X-Forwarded-For` blanked (not set/forwarded).
- AC13 no `down -v`, volume removal or prune; no machine was initialised (none existed, blocked by environment).

## Required changes in other areas
None for application source. The backend `init: true` fix for PID 1 is handled in compose.

## Known gaps / to verify by the Container Tester
- Pinned tags (`postgres:16.9-alpine`, `node:22.18.0-alpine`, `nginx:1.28.0-alpine`) were chosen without a pull.
- Provider support for `additional_contexts`, YAML merge keys and `${VAR:?}`; `security_opt: no-new-privileges:true`.
- The Angular output path `Frontend/dist/frontend/browser` (application builder) is assumed.
- Empty-string runtime proxy variables: confirm with `podman inspect` that no proxy value remains.
- nginx resolves `backend` only at startup.
- Login rate limit sees one client IP behind nginx (R6, separate task).
- Backend likely connects as the database superuser (security review M3).

## Round 2: D8 build-only host networking (FR15, AC8)

Verdict: done (static; not rebuilt in this round)

Changes:
- `compose.yaml`: `build.network: host` added to the `backend` and `frontend` build entries (build only; no `network_mode`, runtime services keep the internal network `app`, runtime proxy variables still blanked). Comment added for the build proxy args.
- `.env.example`: `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` default `http://127.0.0.1:3128`; `BUILD_NO_PROXY` unchanged.
- `.env`: only the two non-secret `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` lines were updated in place from the stale `host.containers.internal:3128` to `http://127.0.0.1:3128`; nothing else read, printed or changed.
- `.github/config.json` -> `containers.proxy.buildProxyUrl`: `http://127.0.0.1:3128` (approved single edit).
- `docs/context/containers.md`: status, Bosch proxy section and decisions updated for D8.
- `Backend/Containerfile`, `Frontend/Containerfile`: unchanged (proxy values remain build `ARG`s applied inline to `npm ci`, never `ENV`).

Compose provider: docker-compose v5.6.1 via `podman compose`; `podman compose config --quiet` exits 0 and `--no-interpolate` shows `build.network: host` for both builds. No adaptation needed (`additional_contexts`, merge keys, `${VAR:?}` accepted). No change to `podman` settings, WSL, volumes or images.

Commands: unchanged. Start with `HTTP_PROXY`/`HTTPS_PROXY` = `http://127.0.0.1:3128` in the shell: `podman compose up -d --build`.

Open concerns:
- Not rebuilt: whether `build.network: host` is honoured and the proxy is reachable from build steps is for the Container Tester to confirm. If it fails, the next fallback is `podman build --network host` per image.
- Possible TLS error through the proxy would need a human-supplied `certs/*.crt` (none now).
- Do not run plain `podman compose config` (prints secrets).

---

## Round 3: test-fix round 1 (tester F1, classic builder)

Verdict: done (static; not rebuilt in this round)

Root cause: `additional_contexts: certs` and `COPY --from=certs` need BuildKit/buildx; `podman compose` (docker-compose over Podman's API) uses the classic builder, and buildx is not installed (installing it is not approved). `compose config --quiet` only parses, so it did not catch this in Round 2.

Changes:
- `compose.yaml`: removed `additional_contexts` from the `backend` and `frontend` builds. Kept `build.network: host`, build `ARG` proxy values (`BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY`), blank runtime proxy variables, internal network `app`, single published port `127.0.0.1:4200`.
- `Backend/Containerfile`, `Frontend/Containerfile`: removed `COPY --from=certs` and the optional `NODE_EXTRA_CA_CERTS` block; `npm ci` keeps the inline proxy settings from `ARG`s (never `ENV`). Images, tags, non-root users unchanged.
- `certs/README.md`: states the folder is not read by the builds now and how a CA gets wired in after a TLS error.
- `docs/context/containers.md`: status, TLS inspection bullet (later CA path: copy `.crt` into gitignored `Backend/ca/` and `Frontend/ca/`, build-stage-only `COPY ca/ /tmp/certs/` + `NODE_EXTRA_CA_CERTS` for `npm`, runtime images never carry it, TLS never disabled) and compose-provider note.

Verification: `podman compose config --quiet` exits 0 (nothing printed). No build, `down -v`, volume removal, prune, Podman/WSL change; `.env` not touched.

Concerns / for the tester:
- Re-run `podman compose up -d --build` with `HTTP(S)_PROXY=http://127.0.0.1:3128`; whether `build.network: host` is honoured and the proxy reachable from build steps (D8, AC8) is still unverified. Fallback: `podman build --network host` per image.
- Later CA support needs a new change (plus `ca` entries in `.gitignore`, and `Backend/.containerignore`/`Frontend/.containerignore` must not exclude `ca`); `certs` at the repo root is outside both build contexts, so a plain `COPY certs/` is not possible with the current contexts.

---

## Round 4: human decision option 1 (classic builder, D9)

Verdict: done (static; nothing built or started)

Human decision: no `additional_contexts` and no `COPY --from=certs`; AC1 stays the single command `podman compose up -d --build` (no per-image `podman build`, no buildx). The Bosch CA is supplied only after a real TLS error (none seen), through a classic-builder-compatible copy from the main build context; build stages only; TLS verification never disabled. D8 unchanged.

Verified (static):
- `compose.yaml`, `Backend/Containerfile`, `Frontend/Containerfile` contain no `additional_contexts`, no `COPY --from=<external context>` (only `COPY --from=deps` / `--from=build`, which are stage names), no `RUN --mount`, no heredocs, no `# syntax=`. The `<<:` in `compose.yaml` are YAML merge keys.
- `podman compose config --quiet` exits 0 (docker-compose from `%LOCALAPPDATA%\Programs\docker-compose`, added to PATH for that command only; nothing printed).
- `Backend/.containerignore` and `Frontend/.containerignore` do not exclude `ca`; no `COPY ca/` is added now because it would fail when the folder is absent.

Changes (container files and docs only, no application code):
- `docs/specs/manual-containerize-the-app-with-podman.md`: FR6 (classic-builder-only features, `ca` not ignored), FR16 (CA only after a TLS error via gitignored `ca/` in each build context, plain `COPY ca/`, no `additional_contexts`), AC8 and EP3 wording, new D9 (human option 1); stale `buildProxyUrl` note in "Current state" updated to `http://127.0.0.1:3128` (config.json already has it). D8 untouched.
- `docs/context/containers.md`: status line and TLS inspection bullet (D9, classic-builder-only rule, future CA path).
- `certs/README.md`: same mechanism; never commit certificates.
- `.gitignore`: added `/Backend/ca/` and `/Frontend/ca/` so a future CA copy is never staged.

Concerns:
- Not rebuilt: `build.network: host` and the proxy path (D8, AC8) are still unverified; `compose config --quiet` only parses.
- A future `COPY ca/` must be added only together with a `ca/` folder (the copy fails if the folder is absent); the Builder adds it on demand.
- `docker-compose` is not on PATH in new shells, so `podman compose` fails with "looking up compose provider failed" until `%LOCALAPPDATA%\Programs\docker-compose` is on PATH (shell setting, not changed).

---

## Round 5: orchestrated run

Verdict: done (static verification only; nothing built, pulled or started; no Podman/WSL change; no application source edited)

Approved risks: R1, R2 as described; R3-R8 safer alternative. No other risk-gate item found.

Verified against the spec (no deviation unless noted):
- FR1/FR2/FR3/FR4: `compose.yaml` has `db`, `backend`, `frontend`, `name: deskbooking`, network `app`, volume `db-data`, `service_healthy` chain, pinned images from `docker.io/library` (postgres 16.9-alpine, node 22.18.0-alpine, nginx 1.28.0-alpine), `pg_isready` healthcheck, init SQL mounted `:ro`, `DB_SCHEMA` default `ico-env`, backend healthcheck on `127.0.0.1:3000/api/health`, `CORS_ORIGIN` from `FRONTEND_PORT`. `npm ci --omit=dev`, backend user `node`, frontend user `nginx`, listen 8080, pid/temp under `/tmp`.
- FR5/AC12: only `location /api/` proxies to `http://backend:3000` (prefix kept); `X-Forwarded-For` blanked, never set; no other upstream. `trust proxy` and the login rate limit are unchanged (no `trust proxy` in `Backend/src`; `app.ts` diff only adds imports/health wiring).
- FR6/D9/AC8: both `.containerignore` files exclude `node_modules`, `dist`, `.env*`, `.git`, `certs`, `db-backups`, docs/tests and do not exclude `ca`. No `additional_contexts`, `COPY --from=<external>`, `RUN --mount`, heredoc, `# syntax=`, `ENV`/`ARG` secret, TLS-disabling setting, `privileged` or `network_mode` (grep). `build.network: host` only under `build`; proxy values only as build `ARG`s (deps/build stages); runtime proxy variables blanked in all three services.
- FR7/AC5: `.env.example` tracked-to-be (still untracked until committed) with all 10 variables; `.env` exists, is ignored (`.gitignore:1`), is not tracked, has all 10 variable names, `POSTGRES_PASSWORD` and `JWT_SECRET` are 64 hex chars (lengths only checked, values not printed), `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` = `http://127.0.0.1:3128`. No literal secret in `compose.yaml`.
- FR15: matches D8 and `.github/config.json` (`buildProxyUrl` `http://127.0.0.1:3128`).
- FR16: no CA wired; `certs/` holds only `README.md`; `/certs/*.crt`, `/Backend/ca/`, `/Frontend/ca/` are ignored (`git check-ignore`); `Backend/ca`, `Frontend/ca` do not exist.
- FR17/AC9: only `127.0.0.1:${FRONTEND_PORT:-4200}:8080` published; no `ports:` on `db`/`backend`; only mounts are the read-only SQL folder and `db-data`.

Deviations found and fixed (docs only):
- `docs/context/project.md`: Containers row still said the environment has no Podman machine, compose provider or proxy; Backend row still said `public.users` only. Both updated. `docs/context/containers.md` and `backend.md` already match reality (no change).

Open concerns for the tester:
- Not verified by a build: `build.network: host` with the proxy at `127.0.0.1:3128`, classic-builder acceptance of both Containerfiles, the Angular output path `dist/frontend/browser`, nginx running non-root with `/dev/stdout` and `/dev/stderr` logs.
- `db` has no `cap_drop` and starts as root before the postgres entrypoint drops to `postgres` (upstream behaviour); AC9 "non-root" should be judged on the running process.
- `.env.example`, `compose.yaml`, Containerfiles, `.containerignore` files and `Backend/db/` are still untracked/uncommitted; `.env` must stay untracked.
- `docker-compose` is not on PATH in new shells (`%LOCALAPPDATA%\Programs\docker-compose` must be added to PATH for that shell).
- Never run plain `podman compose config` (prints secrets).

---

## Round 6: test-fix round 1

Verdict: done (docs and ignore files only; nothing built, pulled or started; no application source edited)

Approved risks: R1, R2 as described; R3-R8 safer alternative. No other risk-gate item.

- F2: docker-compose reads `.dockerignore` for the build context, not `.containerignore`. Added `Backend/.dockerignore` and `Frontend/.dockerignore` with the same content as the respective `.containerignore` (`ca` not excluded, FR6).
  - Backend ignores: `node_modules`, `dist`, `.env*`, `.git`, `.gitignore`, `certs`, `db-backups`, `db`, `migrations`, `tests`, `*.md`, `Containerfile`, `.containerignore`. The Backend build only copies `package.json`, `package-lock.json` and `src` (Node runs TypeScript natively, no `tsconfig.json` needed), all still in the context.
  - Frontend ignores: `node_modules`, `dist`, `.angular`, `.vscode`, `.env*`, `.git`, `.gitignore`, `certs`, `db-backups`, `*.md`, `Containerfile`, `.containerignore`. `COPY . .` keeps `angular.json`, `tsconfig*.json`, `src`, `public`, `package*.json` and `nginx.conf` (needed by the runtime stage).
  - Spec FR6, Scope and Files table, and `docs/context/containers.md` (Files table, CA note) now mention the `.dockerignore` files (same content, kept in sync). Not yet verified by a build (context size and time).
- F3: `docs/context/containers.md` status line now states the verified state (built and started; AC1-AC4, AC6-AC10, AC12, AC13 passed in tester Round 5 with `FRONTEND_PORT=4201`) and the note that port 4200 clashes with a host `npm start`/`ng serve` (stop it or set `FRONTEND_PORT` in `.env`). Default `FRONTEND_PORT` unchanged.
- F1: environment issue (host `ng serve` on 4200); not touched, not stopped.

Concerns: the two `.dockerignore` files are new and untracked until committed; keep them identical to the `.containerignore` files.
