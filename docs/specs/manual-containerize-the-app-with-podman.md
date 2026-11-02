---
id: manual-containerize-the-app-with-podman
title: Containerize the app with Podman
area: backend, containers
status: specified
---

# Spec manual-containerize-the-app-with-podman - Containerize the app with Podman

## Summary
Run frontend, backend and PostgreSQL as three Podman containers from one `compose.yaml`, started with `podman compose up -d --build` from the repo root. Credentials live in a gitignored `.env`. The backend talks to the `db` container, and the schema `"ico-env"` with the tables `users` and `bookings` is created automatically in it. The backend gets a new `GET /api/health` that answers 200 only when the database responds. The frontend container serves the Angular build with nginx on `http://localhost:4200` and proxies `/api/` to the backend. Only the frontend is published to the host (`127.0.0.1:4200`); `backend` and `db` are reachable only on the internal compose network (R5). Everything is built and pulled behind the Bosch proxy.

All former open questions were answered by the human (recommended option (a) each; D6 superseded by R5); see `Decisions`. The human also decided every risk-gate item R1-R8; see `Risk gate`. Environment facts the human did not state are listed under `Environment prerequisites`.

## Scope
- `compose.yaml` (services `db`, `backend`, `frontend`, network, named volume `db-data`, healthchecks), `.env.example`, root `.gitignore` check (`.env` is already ignored, `.env.example` is tracked).
- `Backend/Containerfile`, `Backend/.containerignore`, `Backend/.dockerignore`; `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`, `Frontend/.dockerignore` (container files only; no Angular source change). Each `.dockerignore` has the same content as the `.containerignore` next to it and both are kept in sync (the docker-compose provider reads `.dockerignore` for the build context, Podman reads `.containerignore`).
- Database init SQL for the container: schema `"ico-env"`, tables `users` and `bookings`, `schema_migrations` (D1, D2, D4).
- Backend: `GET /api/health` (D3), configurable schema for the existing `users` query (D1, R7), tests with no real database.
- Bosch proxy handling for image pulls and build-time `npm ci` (D5, R2).
- Context updates: `docs/context/containers.md` (status, final files/vars), `backend.md` (health route, `DB_SCHEMA`), `project.md` (state table).

## Out of scope
- Any Frontend source change (no API calls, `apiUrl` or environment files are needed; nginx makes `/api` same-origin).
- `bookings` endpoints, booking logic, seed data, user creation scripts.
- Production hardening (TLS, secrets manager, registry push, Kubernetes), CI/CD pipeline changes.
- The existing Cloud Foundry database and `Backend/migrations/001_create_users.sql` (kept untouched; human-applied, `public.users`).
- Changing WSL or proxy tooling, or reconfiguring/removing an existing Podman machine. Agents may only `podman machine init`/`start` when no machine exists or it is not running (R1, R2).
- Publishing `backend` or `db` ports to the host (R5).

## Area
**backend, containers** (no `frontend`).
- `backend`: a health route and DB access change are needed in `Backend/src`. Without them AC3 cannot be met.
- `containers`: compose, Containerfiles, nginx, `.env`, db container and init, proxy handling (see `docs/context/containers.md`).
- `frontend` is not needed: the SPA makes no API calls today and the nginx proxy keeps requests same-origin. The `Frontend/Containerfile` and `Frontend/nginx.conf` are container artefacts owned by the container agents.
- Order: backend, then containers.

## Scope flags
- `ui-changes`: no - no visible UI, templates, styles or routes.
- `logic-changes`: yes - new health endpoint with a DB probe, schema selection in the user query.
- `security-relevant`: yes - credentials/secrets in `.env`, unauthenticated endpoint, SQL, port exposure, proxy/CA handling, reverse proxy.
- `dependencies-changed`: yes - container base images and the compose provider only; no new npm packages are planned.
- `database-changes`: yes - new schema and tables in the local `db` container (no existing data affected).
- `scaffolding-only`: no - application behaviour is added.

## Current state (verified)
Implementation already exists in the repo and is reused; this spec describes it and its acceptance criteria. Present: `compose.yaml`, root `.env.example`, `Backend/Containerfile`, `Backend/.containerignore`, `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`, `Backend/db/migrations/001-003_ico_env_*.sql`, `GET /api/health` (`healthRoutes`/`healthController`/`healthService`/`healthRepository`, `createApp({ dbProbe, healthTimeoutMs })`), `Backend/src/config/dbSchema.ts` (`parseDbSchema`). Still to be proven by a run: AC1-AC4, AC8-AC10, AC12 (build through the proxy not yet re-verified). The bullets below that say a file does not exist describe the pre-implementation baseline.
- `Backend/src/server.ts` requires `JWT_SECRET` and `DATABASE_URL` (exit 1 if missing), creates a `pg.Pool` from `DATABASE_URL`, listens on `PORT` (default 3000).
- `Backend/src/app.ts` `createApp(options)` mounts only `/api/auth`; everything else is 404. CORS origin from `CORS_ORIGIN` (default `http://localhost:4200`); `*` is refused when `NODE_ENV=production`.
- `userRepository` queries `public.users`; `Queryable` type allows injecting a Pool or a fake.
- `Backend/migrations/001_create_users.sql` creates `public.users` (uuid id, full_name, email unique, password_hash, type admin|user, created_at); human-applied only. `bookings` does not exist anywhere.
- Backend runs TypeScript natively (`node src/server.ts`, Node >= 22.18); `npm run build` (`tsc`) exists but `npm start` does not use `dist/`.
- Frontend: Angular 18 `application` builder, output `Frontend/dist/frontend` (static files in `browser/`), `npm run build`; no `HttpClient`, no API calls.
- Baseline (before implementation): no `compose.yaml`, `Containerfile`, `.containerignore` or root `.env.example`. Root `.gitignore` already ignores `.env`, `.env.*` (except `.env.example`), `/certs/*.crt`, `/db-backups/`.
- `.github/config.json` -> `containers`: runtime podman, `compose.yaml`, `.env`, proxy `hostProxyUrl` `http://127.0.0.1:3128`, `buildProxyUrl` `http://127.0.0.1:3128` (updated per D8), `noProxy` `localhost,127.0.0.1,db,backend,frontend`, `caCertDir` `certs`, `allowedRegistries` `docker.io/library`, `quay.io`, `ghcr.io`.
- `docs/context/containers.md` says no Podman machine existed when written.

## Functional requirements

### Compose and images
- FR1. `compose.yaml` at the repo root defines `db`, `backend`, `frontend` on one compose network, project name `deskbooking` (`COMPOSE_PROJECT_NAME`), named volume `db-data`. `podman compose up -d --build` starts all three; `depends_on` with `condition: service_healthy` (frontend waits for backend, backend waits for db).
- FR2. `db`: `docker.io/library/postgres:<pinned 16-alpine tag>`, env `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` from `.env`, healthcheck `pg_isready`, volume `db-data`, init SQL from `Backend/db/migrations` mounted read-only into `/docker-entrypoint-initdb.d` (D4). `POSTGRES_DB` defaults to `deskbooking` (D1). No `ports:` entry: not published to the host, internal compose network only (R5).
- FR3. `backend`: `Backend/Containerfile`, multi-stage, Node 22 alpine (pinned tag), production dependencies only (`npm ci --omit=dev`), runs as non-root, `NODE_ENV=production`, starts the server. Receives from compose interpolation `DATABASE_URL` (built from the `POSTGRES_*` values, host `db`), `JWT_SECRET`, `PORT=3000`, `CORS_ORIGIN=http://localhost:${FRONTEND_PORT}`, `DB_SCHEMA=ico-env`. Healthcheck calls `GET /api/health` on `127.0.0.1:3000` inside the container. No `ports:` entry: not published to the host, internal compose network only (R5).
- FR4. `frontend`: `Frontend/Containerfile`, stage 1 Node 22 alpine `npm ci` + `npm run build`, stage 2 `docker.io/library/nginx:<pinned>-alpine` with a non-root config (listen 8080, pid and temp paths under `/tmp`) serving the build output (D7). The only published port: `127.0.0.1:${FRONTEND_PORT}` (default 4200) -> 8080 (R5). Allowed images only (R4).
- FR5. `Frontend/nginx.conf`: serves static files with SPA fallback (`try_files ... /index.html`); only `location /api/` proxies to `http://backend:3000` (prefix preserved); no other upstream; do not set or forward `X-Forwarded-For`; `trust proxy` and the login rate limit stay unchanged (separate task, R6; see Risks).
- FR6. `.containerignore` files and the identical `.dockerignore` files (kept in sync; the compose provider docker-compose reads `.dockerignore`) exclude `node_modules`, `dist`, `.angular`, `.env*`, `.git`, `certs`, `db-backups`, tests/docs not needed by the build; they must not exclude `ca` (the optional CA copy of FR16). No secret is copied into an image or set via `ENV`/`ARG` in a Containerfile. Compose and Containerfiles use only features of the classic builder (no `additional_contexts`, `COPY --from=<external context>`, `RUN --mount`, heredocs or `# syntax=`), see D9.

### Environment and secrets
- FR7. `.env.example` (tracked) lists every variable with placeholders: `COMPOSE_PROJECT_NAME`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_SCHEMA`, `JWT_SECRET`, `FRONTEND_PORT`, `BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY`. `.env` (untracked, gitignored) is created from it only when missing, with generated secrets (>= 32 hex chars for the password and `JWT_SECRET`), and is never overwritten, printed, logged, committed or baked into an image (R3). `compose.yaml` contains no literal secret. There are no `DB_PORT`/`BACKEND_PORT` variables because those ports are not published (R5).

### Database
- FR8. On first start of an empty `db-data` volume the init SQL creates schema `"ico-env"`, `"ico-env".users`, `"ico-env".bookings` and `"ico-env".schema_migrations(version, applied_at)` and records the applied versions. All statements are idempotent (`CREATE SCHEMA IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`); no `DROP`/`TRUNCATE`/`DELETE`. Init scripts run only on an empty volume; later schema changes go through `Database Migrator` (`Backend/db/migrations`).
- FR9. `"ico-env".users` mirrors the existing definition (uuid `id` default `gen_random_uuid()`, `full_name`, `email` unique, `password_hash`, `type` CHECK admin|user, `created_at`). `"ico-env".bookings` per D2: `id` serial PK, `user_name` varchar(255) NOT NULL, `booking_date` date NOT NULL, `booking_desk` varchar(100) NOT NULL, `created_at` timestamptz NOT NULL default `now()`, `UNIQUE (booking_date, booking_desk)`.
- FR10. Agents apply/verify SQL only against the local `db` container of project `deskbooking` (via `podman exec` or compose, since `db` is not published); never against Cloud Foundry or a remote host (`docs/risk-gate.md` rule 5).

### Backend
- FR11. New route `GET /api/health` (routes -> controller -> service -> repository layering): runs `SELECT 1` through the injected `Queryable` with a short timeout (default 2000 ms). Success: 200 `{ "success": true, "payload": { "status": "ok" } }`. DB error or timeout: 503 `{ "success": false, "message": "Database unavailable" }`. Fixed minimal bodies only: no error detail, host, version or credentials in either body or in logs (log message only) (R8). No authentication, no rate limit, not blocked in nginx (D3); reachable from the host only through the frontend at `http://localhost:4200/api/health`.
- FR12. `createApp()` accepts an injectable DB probe (for tests); when none is given the health route answers 503. `server.ts` passes the real Pool. Existing behaviour of `/api/auth/login` is unchanged.
- FR13. The `users` query uses a schema taken from `DB_SCHEMA` (default `public`, validated against `^[A-Za-z0-9_-]+$` at startup, used as a quoted identifier). Default behaviour (no `DB_SCHEMA`) is identical to today (D1, R7). The init SQL stays idempotent and non-destructive (FR8).
- FR14. Backend tests (`node:test`, no DB): health 200 with a fake that resolves, 503 when it rejects or times out, body has no error detail; schema validation accepts `public`/`ico-env` and rejects unsafe values; all existing tests still pass.

### Bosch proxy
- FR15. Image pulls use the host proxy settings of the shell running `podman` (`hostProxyUrl`). Build containers use host networking for the BUILD only (`build.network: host` per service in `compose.yaml`, or `--network host` for direct `podman build`), never at runtime, so the Podman VM's mirrored-network proxy at `http://127.0.0.1:3128` is reachable from build steps (EP2). Build-time `npm ci` and package installs use `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY`/`BUILD_NO_PROXY` as credential-free build `ARG`s only (never `ENV`); the `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` default is `http://127.0.0.1:3128` (not `host.containers.internal:3128`, which resolves to 169.254.1.2 from build containers and is refused); `NO_PROXY` always includes `localhost,127.0.0.1,db,backend,frontend`. Runtime containers get no proxy, have no `network_mode: host` and keep the internal compose network. No Podman/WSL proxy setting is changed by agents (D5, R2).
- FR16. No CA is wired into the builds by default (none seen to be needed). Only if a build fails with a TLS error (`x509`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`), the human supplies the Bosch root CA as `certs/*.crt` and the Container Builder is re-run to wire it in with a mechanism the classic builder supports: the `.crt` files are copied into a gitignored `ca/` folder inside each build context (`Backend/ca/`, `Frontend/ca/`) and a plain `COPY ca/ ...` in the build stage only sets `NODE_EXTRA_CA_CERTS` for `npm` (D9). No `additional_contexts`, no `COPY --from=certs`, no mandatory copy that fails when `ca/` is absent. The runtime images do not carry the CA; `certs/*.crt` and `ca/` are never staged or committed (R2, EP3). TLS verification is never disabled (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `--tls-verify=false`, `npm config set strict-ssl false` are forbidden).
- FR17. Container operations are limited to `build`, `up -d`, `down` (no `-v`), `ps`, `logs`, `exec` and `inspect` on project `deskbooking`; no `volume rm`, `system prune`, `down -v` or other volume/prune actions without separate human approval (R4). `podman compose` uses an already installed provider; if none is installed, stop with `needs-human` (EP4).

## API / data changes
| Item | Change |
| --- | --- |
| `GET /api/health` | new, public; 200 `{ success: true, payload: { status: "ok" } }` / 503 `{ success: false, message: "Database unavailable" }` |
| Env (backend) | new optional `DB_SCHEMA` (default `public`); `DATABASE_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN` unchanged |
| DB (container only) | schema `"ico-env"`; tables `users`, `bookings`, `schema_migrations` |
| Ports | only `frontend` published (`127.0.0.1:4200`); `backend` and `db` internal only |
| Files | `compose.yaml`, `.env.example`, `Backend/Containerfile`, `Backend/.containerignore`, `Backend/.dockerignore`, `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`, `Frontend/.dockerignore`, `Backend/db/migrations/*.sql` |

## UI behaviour
No UI change. `http://localhost:4200` shows the existing shell (header, empty main, footer); `/api/...` requests from the browser reach the backend through nginx. `http://localhost:3000` and `localhost:5432` are not reachable from the host.

## Acceptance criteria
- [ ] AC1. `podman compose up -d --build` from the repo root builds and starts `db`, `backend` and `frontend`; `db` and `backend` report healthy.
- [ ] AC2. `http://localhost:4200` returns 200 with `<app-root`, and `http://localhost:4200/api/health` is answered by the backend (not 502/504).
- [ ] AC3. `GET /api/health` returns 200 only when a `SELECT 1` against the db container succeeds, and 503 when the database is unreachable (for example `db` stopped), without leaking error details. Verified through `http://localhost:4200/api/health` and/or `podman exec` into the `backend` container; never via host ports 3000/5432.
- [ ] AC4. The schema `"ico-env"` with the tables `users` and `bookings` exists in the `db` container after the first start, created automatically by the init SQL (agents ran no manual SQL by hand and nothing was dropped); re-running is idempotent. Verified with `podman exec ... psql` inside the `db` container (not from the host).
- [ ] AC5. `.env` holds all credentials and generated secrets, was created only because it was missing (never overwritten) and is not tracked (`git check-ignore .env` succeeds); `.env.example` is tracked with placeholders only; no secret appears in `compose.yaml`, image layers/history, `podman compose config` output committed to the repo, agent output or logs.
- [ ] AC6. The backend uses `"ico-env"` for `users` in the container (`DB_SCHEMA=ico-env`) and `public` by default elsewhere; existing login tests pass unchanged.
- [ ] AC7. Backend tests for the health route and the schema validation (both `public` and `ico-env` accepted, unsafe values rejected) pass with no database; the full `npm test` of `Backend/` is green.
- [ ] AC8. Images pull and build behind the Bosch proxy; builds use host networking (`build.network: host` / `--network host`) with the credential-free build `ARG` proxy URL `http://127.0.0.1:3128`; proxy values exist only as build `ARG`s and are absent from the runtime environment and image config; runtime containers have no proxy, no host networking and stay on the internal compose network (`podman inspect` shows no host network mode); no CA is installed by default; one is added only after a TLS error, supplied by the human (`certs/*.crt`, copied via the gitignored `ca/` folder of the build context, FR16), in build stages only; TLS verification is never disabled. The compose file and Containerfiles contain no BuildKit-only feature, so the classic builder accepts them.
- [ ] AC9. Only the frontend port is published, bound to `127.0.0.1:4200` (`podman compose ps`/`podman port` show no host port for `backend` and `db`; nothing listens on host 3000/5432); containers run as non-root, no `--privileged`, no host mounts other than repo-internal read-only files and the named volume; all images come from `allowedRegistries` (nginx from `docker.io/library/nginx:<tag>-alpine`) with pinned tags.
- [ ] AC10. `podman compose down` (without `-v`) followed by `up -d` keeps the database data (`db-data` volume).
- [ ] AC11. `docs/context/containers.md`, `backend.md` and `project.md` describe the new state and the decisions below, including that only the frontend is published (4200) and that the backend and db are internal.
- [ ] AC12. nginx proxies only `/api/` to the backend and sets/forwards no `X-Forwarded-For`; `trust proxy` and the login rate limit are unchanged.
- [ ] AC13. No agent action used `down -v`, volume removal or prune; the Podman machine was initialised/started only if it did not exist/run.

## Decisions
Answered by the human; all take the recommended option (a), except D6, which was superseded by the risk-gate decision R5.
- D1. Both `users` and `bookings` live in schema `"ico-env"` in the container; the backend reads the schema from `DB_SCHEMA` (default `public`, container sets `ico-env`). Container database name `POSTGRES_DB` defaults to `deskbooking`.
- D2. `bookings`: `id` serial PK, `user_name`, `booking_date`, `booking_desk`, `created_at`, `UNIQUE (booking_date, booking_desk)`.
- D3. `GET /api/health`: 200 `{ success: true, payload: { status: "ok" } }` / 503 `{ success: false, message: "Database unavailable" }`; public; 2 s DB timeout.
- D4. Init SQL in `Backend/db/migrations`, mounted read-only into `/docker-entrypoint-initdb.d`; `Database Migrator` handles later changes.
- D5. Bosch proxy repo defaults: host `http://127.0.0.1:3128`, no credentials, no proxy at runtime. Build proxy URL superseded by D8 (was `http://host.containers.internal:3128`).
- D8. Human-approved design change (option 2), supersedes D5's `buildProxyUrl`: the Podman machine uses WSL mirrored networking, the proxy is reachable inside the VM at `http://127.0.0.1:3128`, while `host.containers.internal:3128` resolves to 169.254.1.2 from build containers and is refused. Build containers use host networking for the BUILD only (`build.network: host` in compose / `--network host`, never at runtime) and the credential-free build `ARG` proxy URL is `http://127.0.0.1:3128`. Runtime containers get no proxy and keep the internal compose network. `buildProxyUrl` in `.github/config.json` is stale and must be updated to `http://127.0.0.1:3128` by the human or a task that may edit it (this spec does not touch it).
- D9. Human decision (option 1) after the build failed with "the classic builder doesn't support additional contexts": `podman compose` (docker-compose over Podman's API) uses the classic builder and buildx is not installed. The compose file and Containerfiles use no `additional_contexts` and no `COPY --from=certs`; AC1 stays the single command `podman compose up -d --build` (no per-image `podman build` steps, no buildx install). The Bosch CA is supplied only when a TLS error actually occurs (none seen), via a classic-builder-compatible copy from the main build context (FR16), build stages only, never in runtime images, TLS verification never disabled. D8 is unchanged.
- D6. Superseded by R5: only the frontend is published, on `127.0.0.1:4200`; `backend` (3000) and `db` (5432) are not published (internal compose network only).
- D7. nginx image `docker.io/library/nginx:<tag>-alpine` with a non-root config (not `nginx-unprivileged`).

## Environment prerequisites
Not stated by the human, so not blocking spec questions. The Container Tester/Orchestrator verifies each before building. EP1 may be fixed by agents per R1; for EP2-EP4 a missing item stops the run with `needs-human` and `Root cause in: environment`, and builders do not create or change them (R2, R4).
- EP1. A Podman machine exists and is running (`podman machine list`, `podman info`). If it does not exist, agents may run `podman machine init`; if it exists but is stopped, `podman machine start` (R1). Nothing else about the machine is changed.
- EP2. WSL mirrored networking is enabled in `%UserProfile%\.wslconfig` (`networkingMode=mirrored`), the Podman machine uses it, and the local Bosch proxy is running and reachable inside the VM at `http://127.0.0.1:3128` (build containers reach it through `build.network: host`, D8, R2).
- EP3. A Bosch root CA as `certs/*.crt` is needed only if a build reports a TLS error (`x509`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY`); the human supplies it, and the Container Builder then wires it in through the gitignored `ca/` folder of each build context (FR16, D9). No TLS error has been seen.
- EP4. A compose provider for `podman compose` is installed: docker-compose v5.6.1, installed standalone (not installed by agents without approval; this installation was approved, see `Human-approved agent actions`).

### Human-approved agent actions
The human approved, and agents already carried out, these environment actions (D8, R2): editing `%UserProfile%\.wslconfig` to enable mirrored networking, and installing docker-compose v5.6.1 standalone as the compose provider. No further WSL, Podman machine or tool changes are approved by this.

## Risk gate
Per `docs/risk-gate.md`. The human decided every item R1-R8; the decisions below are binding for all agents and are reflected in the FRs and ACs. D1-D7 were decided earlier (D6 superseded by R5).

| Id | Category | Item | Impact | Human decision |
| --- | --- | --- | --- | --- |
| R1 | Local environment | The Podman machine (EP1) may not exist or may be stopped; `podman machine init/start` (WSL provider) would be needed before any build. | Changes the user's WSL/Podman setup, downloads a VM image through the proxy. | **Approved as described.** Agents may `podman machine init`/`start`, only when no machine exists or it is not running; an existing running machine is left untouched, no other machine/WSL change. (EP1, AC13) |
| R2 | Local environment / security | Bosch proxy per D5/D8: proxy passed into builds, dependence on the local authenticating proxy at `http://127.0.0.1:3128` (WSL mirrored networking, EP2) reached from build containers via host networking for the BUILD only, and possibly a corporate CA from `certs/` installed into build stages (EP3). | Build steps share the VM network namespace during the build, so they can reach VM-local services; a wrong setup leaks proxy settings into images or weakens TLS verification; installing a CA widens trust inside the build stage. | **Re-approved by the human with the D8 change (build-only host networking, proxy `http://127.0.0.1:3128`).** Safer alternatives considered and declined: a firewall change, another proxy address. Conditions: `build.network: host` / `--network host` for builds only, never at runtime; credential-free build `ARG`s only, never `ENV`, nothing at runtime; no change to Podman/WSL proxy settings by agents; CA only after a TLS error, supplied by the human, installed in build stages only; TLS verification is never disabled (`NODE_TLS_REJECT_UNAUTHORIZED=0`, `--tls-verify=false`); missing proxy/CA -> `needs-human` (`Root cause in: environment`). (FR15, FR16, AC8) |
| R3 | Local environment / security | Credentials in `.env`: generated DB password and `JWT_SECRET`; `DATABASE_URL` assembled in compose and visible via `podman inspect` of the backend container. | Secret exposure on commit/log/print, or overwriting an existing `.env`. | **Safer alternative chosen.** `.env` gitignored, created only if missing, never printed, not baked into images (`.containerignore`, no `ENV`/`ARG` secrets). (FR6, FR7, AC5) |
| R4 | Local environment | Pulling and running images, then running init SQL in the `db` container; a compose provider (EP4) may be missing. | Image pulls from allowed registries; init SQL executes inside the container on first start; resetting the DB later needs `down -v`/volume removal. | **Safer alternative chosen.** Frontend image `docker.io/library/nginx:<tag>-alpine` with a non-root `nginx.conf` (no `nginx-unprivileged`); use the installed compose provider or stop with `needs-human`; no volume/prune actions (no `down -v`, `volume rm`, `system prune`). (FR4, FR17, AC9, AC13) |
| R5 | Local environment / security | Port exposure per former D6: `db` (5432), `backend` (3000), `frontend` (4200) published to the host. | A non-loopback bind exposes the DB, API or app to the LAN; published db/backend widen the attack surface. | **Safer alternative chosen: publish ONLY the frontend** on `127.0.0.1:4200`. `backend` and `db` have no `ports:` and live on the internal compose network only. Supersedes Q6(a)/D6. Verification goes through nginx on 4200 (`/api/health`) or `podman exec`/compose healthchecks, never host 3000/5432. (FR2, FR3, FR4, FR7, AC2, AC3, AC4, AC9) |
| R6 | Security | nginx proxies `/api/` to the backend. | Misconfiguration could proxy wrongly, hide the backend client IP (the login rate limiter keys on `req.ip`, so all clients share one bucket behind nginx; known gap in `backend.md`), or leak headers. | **Safer alternative chosen.** Proxy only `/api/`; no `X-Forwarded-For`; `trust proxy` and the rate limit are left for another task; the gap is documented. (FR5, AC12) |
| R7 | Database / major functionality | Schema `"ico-env"` for `users` and `bookings` (D1, D2) changes the SQL of the existing login query via `DB_SCHEMA`; new schema/tables in the container. | A mistake breaks login against the existing `public.users` (Cloud Foundry DB). New tables hold no data; no drops. | **Safer alternative chosen.** `DB_SCHEMA` defaults to `public`, validated and quoted; tests for both `public` and `ico-env`; idempotent, non-destructive init SQL. (FR8, FR13, FR14, AC4, AC6, AC7) |
| R8 | Security | New unauthenticated `GET /api/health` (D3): public, not blocked in nginx. | Information disclosure or an unauthenticated DB-load vector. | **Safer alternative chosen.** Fixed minimal bodies, `SELECT 1` only, 2 s timeout; no details in bodies or logs. nginx does not block the route. (FR11, AC3) |

## Risks
- Existing docs and code disagree: `containers.md` says `PG*` variables and migrations in `Backend/db/migrations`; the code reads `DATABASE_URL` and the existing migration is in `Backend/migrations` (public). The spec follows the code (`DATABASE_URL` assembled in compose) and puts new container SQL in `Backend/db/migrations`; `containers.md` must be corrected.
- The existing `users` migration does not match the older design in `.github/docs/PROJECT_OVERVIEW.md` (`secret_key`, `temp_password_hash`, serial id); the spec follows the actual code.
- Init scripts do not re-run on an existing volume; schema fixes later need `Database Migrator`, or `down -v` (needs approval).
- Backend runs `.ts` natively with Node >= 22.18; the Node image tag must be >= 22.18.
- If the local Bosch proxy does not accept connections from the VM, pulls/builds time out or return 407; this is reported, not worked around.
- With `backend` and `db` unpublished (R5), debugging from the host needs `podman exec`/`podman logs`; the browser and curl reach the API only through `http://localhost:4200/api/`.
- `GET /api/health` is also used by the compose healthcheck; an unhealthy DB makes the backend unhealthy and blocks the frontend start.

## Open Questions
none. Missing environment prerequisites (EP1-EP4) are escalated at run time, not asked here. No tags were provided on the task (not blocking).
