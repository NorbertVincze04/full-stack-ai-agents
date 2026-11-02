# Containers context

Status: **built and started; verified by the Container Tester (Round 5): AC1-AC4, AC6-AC10, AC12 and AC13 passed with `FRONTEND_PORT=4201`, because host port 4200 was occupied by a local `ng serve`.** Build proxy path per D8 (build-only host networking); classic-builder-only per D9 (no `additional_contexts`, no `COPY --from=certs`). Port note: the default `FRONTEND_PORT=4200` clashes with `npm start`/`ng serve` on the host; stop it or set `FRONTEND_PORT` in `.env` (then use that port in the URLs below). Machine runs with WSL mirrored networking, docker-compose v5.6.1 is the compose provider, image tags exist. See `Decisions and known gaps`. Keep this file current as reality changes.

Runtime: Podman (WSL provider) with `podman compose`. Everything runs locally; one command from the repo root starts the whole stack: `podman compose up -d --build` (run `podman` with `HTTP_PROXY`/`HTTPS_PROXY` set to `containers.proxy.hostProxyUrl` for image pulls). Stop with `podman compose down` (never `-v`).

## Services

| Service | Image / build | Host port | Notes |
| --- | --- | --- | --- |
| `db` | `docker.io/library/postgres:16.9-alpine` | none (internal only) | named volume `db-data`; healthcheck `pg_isready -h 127.0.0.1`; init SQL `Backend/db/migrations` mounted read-only into `/docker-entrypoint-initdb.d` (runs on an empty volume only) |
| `backend` | `Backend/Containerfile` (multi-stage, `node:22.18.0-alpine`, `npm ci --omit=dev`, user `node`) | none (internal only) | `init: true`; `depends_on: db (healthy)`; healthcheck `GET http://127.0.0.1:3000/api/health` via `node`; `cap_drop: ALL`, `no-new-privileges` |
| `frontend` | `Frontend/Containerfile` (`node:22.18.0-alpine` build -> `docker.io/library/nginx:1.28.0-alpine`, user `nginx`) | `127.0.0.1:${FRONTEND_PORT}` (4200) -> 8080 | `depends_on: backend (healthy)`; serves the SPA, proxies only `/api/` to `backend:3000`; `cap_drop: ALL`, `no-new-privileges` |

Service names on the compose network `app`: `db`, `backend`, `frontend`. Only the frontend is published; the backend and db are reachable inside the compose network only. From the host use `http://localhost:4200` and `http://localhost:4200/api/health`; for everything else use `podman exec`/`podman logs`.

## Files

| Path | Role | Tracked |
| --- | --- | --- |
| `compose.yaml` | the three services, network `app`, volume `db-data`, healthchecks | yes |
| `.env.example` | variable names with placeholder values | yes |
| `.env` | real values and generated secrets (created only if missing) | **never** (gitignored) |
| `Backend/Containerfile`, `Backend/.containerignore`, `Backend/.dockerignore` | backend image; `.dockerignore` is identical to `.containerignore` (docker-compose reads `.dockerignore` for the build context; keep both in sync) | yes |
| `Frontend/Containerfile`, `Frontend/nginx.conf`, `Frontend/.containerignore`, `Frontend/.dockerignore` | frontend image, non-root nginx config; ignore files as for the backend | yes |
| `certs/README.md` | explains the optional CA folder | yes |
| `certs/*.crt` | optional corporate CA, supplied by the human, only after a TLS error | no (gitignored) |
| `db-backups/` | `pg_dump` backups taken before risky migrations | no (gitignored) |
| `Backend/db/migrations/*.sql` | init SQL (schema `"ico-env"`, `users`, `bookings`, `schema_migrations`) | yes |

## Environment variables (`.env`)

| Variable | Use |
| --- | --- |
| `COMPOSE_PROJECT_NAME` | `deskbooking` (agents only touch this project) |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | database settings; the password is generated, 64 hex chars |
| `DB_SCHEMA` | `ico-env`, passed to the backend |
| `JWT_SECRET` | generated, passed to the backend |
| `FRONTEND_PORT` | published host port (4200), bound to `127.0.0.1` |
| `BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY` | build `ARG`s only |

There are no `DB_PORT`/`BACKEND_PORT` variables. Compose assembles for the backend: `DATABASE_URL=postgresql://<user>:<password>@db:5432/<db>`, `JWT_SECRET`, `PORT=3000`, `NODE_ENV=production`, `CORS_ORIGIN=http://localhost:${FRONTEND_PORT}`, `DB_SCHEMA`. Secrets are never baked into images and `DATABASE_URL` is visible via `podman inspect` of the backend container (accepted, R3).

## Bosch proxy

- The host shell has `HTTP(S)_PROXY=http://rb-proxy-de.bosch.com:8080`, which answers 407. The local authenticating proxy listens on `127.0.0.1:3128`. Run `podman` commands with `HTTP_PROXY`/`HTTPS_PROXY` set to `containers.proxy.hostProxyUrl` (`http://127.0.0.1:3128`) for image pulls.
- D8: the Podman machine uses WSL mirrored networking, so the proxy is `127.0.0.1:3128` inside the VM; `host.containers.internal:3128` resolves to 169.254.1.2 from build containers and is refused. The `backend` and `frontend` build entries therefore set `build.network: host` (build only; runtime services keep the internal network `app`, no `network_mode: host`).
- Builds use `containers.proxy.buildProxyUrl` (`http://127.0.0.1:3128`, also the `.env.example` default) as credential-free `ARG`s (`BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY`), applied inline to `npm ci` (`npm_config_proxy`, `npm_config_https_proxy`, `npm_config_noproxy`) in the build stages only; never `ENV`, never in the runtime stages. `NO_PROXY` includes `localhost,127.0.0.1,db,backend,frontend`.
- Podman forwards host proxy variables into containers by default, so every service sets `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` (upper and lower case) to empty strings. Verify with `podman inspect` that no proxy value exists at runtime.
- TLS inspection: no CA is wired into the builds now (none needed; no TLS error seen; `certs/` holds only `README.md`). Per D9 (human option 1) `additional_contexts` / `COPY --from=certs` are not used because `podman compose` uses Podman's classic builder, which rejects named additional contexts (buildx is not installed and not approved); compose and both Containerfiles must stay free of BuildKit-only features (no `additional_contexts`, `COPY --from=<external context>`, `RUN --mount`, heredocs, `# syntax=`), so the single command `podman compose up -d --build` keeps working. If a build later fails with `x509`/`UNABLE_TO_GET_ISSUER_CERT_LOCALLY`, the human places the root CA in `certs/*.crt` and the Container Builder is re-run to wire it in, build stage only: copy the `.crt` files into `Backend/ca/` and `Frontend/ca/` (gitignored, never staged; the contexts are `Backend/` and `Frontend/`, so `certs/` at the repo root is not reachable), add a plain `COPY ca/ /tmp/certs/` before the `npm ci` step of the build stage, concatenate `*.crt` into `/tmp/extra-ca.pem` and set `NODE_EXTRA_CA_CERTS` for `npm` only. The `.containerignore` and `.dockerignore` files do not exclude `ca`, and no copy of `ca/` is added until a TLS error occurs (a mandatory `COPY ca/` would fail when the folder is absent). Runtime images never carry the CA. TLS verification is never disabled; the system store is not touched.
- If pulls/builds time out or return 407, report it to the human; do not change proxy tooling or Podman/WSL proxy settings.

## Conventions
- Fully qualified image names with pinned tags; minimal base images; run as non-root (postgres uses its image's entrypoint user handling); no `--privileged`.
- `depends_on` with `condition: service_healthy`; healthchecks on all three services.
- Only the frontend is published (`127.0.0.1:4200`). No host mounts other than the read-only `Backend/db/migrations` and the named volume `db-data`.
- `.env` is created from `.env.example` only when missing, with generated secrets, and is never printed, logged or committed.
- Allowed operations: `build`, `up -d`, `down` (no `-v`), `ps`, `logs`, `exec`, `inspect` on project `deskbooking`. No `volume rm`, `system prune`, `down -v`.
- Migrations are tracked in `"ico-env".schema_migrations(version, applied_at)`; init SQL runs only on an empty volume.

## Verification checklist (Container Tester)
Machine up; images build through the proxy; all services running and healthy; `db` ready and `"ico-env"` has `users`, `bookings`, `schema_migrations` (via `podman exec ... psql`); `http://localhost:4200` returns 200 with `<app-root`; `http://localhost:4200/api/health` is 200 (and 503 with `db` stopped), not 502/504; no host port for backend/db (`podman port`, nothing on 3000/5432); containers non-root; no proxy/secret in `podman inspect` runtime env or image history; `.env` git-ignored; `down` then `up -d` keeps the data.

## Decisions and known gaps
- Decisions D1-D7 and R1-R8 of `docs/specs/manual-containerize-the-app-with-podman.md` apply: only the frontend is published; nginx (not `nginx-unprivileged`) with a non-root config; `X-Forwarded-For` is neither set nor forwarded (client-supplied values are blanked), so the login rate limiter sees one client IP behind nginx (separate task).
- D8 (build-only host networking, proxy `http://127.0.0.1:3128`) supersedes D5's `host.containers.internal` build proxy. Environment now: machine running with mirrored networking, docker-compose v5.6.1 provider (`podman compose` works). Not yet re-verified: a build through the proxy with `build.network: host`.
- Compose-provider check: with docker-compose v5.6.1, `podman compose config --quiet` accepts `build.network: host`, merge keys and `${VAR:?}`, but it only parses; it does not prove the classic builder supports a key (F1: `additional_contexts` parsed fine and failed at build). `build.network` is the same key as `--network` of `podman build`. Never run plain `podman compose config` (it prints interpolated secrets); use `--quiet` or `--no-interpolate`.
- `.env` `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` must be `http://127.0.0.1:3128` (stale `host.containers.internal:3128` was updated in place).
- Image tags (`postgres:16.9-alpine`, `node:22.18.0-alpine`, `nginx:1.28.0-alpine`) were chosen without a pull; if a tag does not exist, replace it with a pinned existing tag from an allowed registry.
- nginx resolves `backend` once at startup; if the backend container is recreated alone, restart `frontend`.
- Init SQL does not re-run on an existing volume; later changes need a new numbered migration (or `down -v`, which needs separate approval).
