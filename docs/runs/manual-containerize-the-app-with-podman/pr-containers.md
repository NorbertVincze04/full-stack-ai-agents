# PR (containers) - manual-containerize-the-app-with-podman

Mode: prepare (nothing staged, committed, pushed; no branch created)

## OPEN ITEM - not built or run (needs-human)
The container files were written and statically reviewed (approved: 0 blocker, 0 high, 3 medium, 9 low) but were **never built, pulled or started**. Task status: `needs-human`, root cause in the environment (`container-builder.md`):
- EP1: no Podman machine (`podman machine list` empty); WSL optional component not enabled (needs admin).
- EP2: nothing listens on the Bosch proxy `127.0.0.1:3128`.
- EP4: no compose provider on PATH (`docker-compose` v2 preferred; `podman-compose` otherwise).

Consequence: AC1, AC2, AC3 (runtime), AC4 (execution in container), AC8 (runtime/inspect part), AC9 (`podman compose ps`), AC10, AC13 are **unverified**. Merging means merging untested infrastructure. Recommended: run the Container Tester after EP1/EP2/EP4 are fixed, or open the PR as draft.

## Title
manual-containerize-the-app-with-podman: Containerize the app with Podman (containers)

## Branch and base
- Head (proposed, not created): `feature/manual-containerize-the-app-with-podman-containerize-the-app-with-podman` (shared with the backend part; does not exist yet; reuse it if the backend commit created it).
- Base: `feature/manual-backend-login-endpoint-backend-login-endpoint` (`a4cc66f`), as in `pr-backend.md`. Not `main`: the backend changes build on the login commit, which is not on `main` and not on `origin` (`origin` only has `main` at `43f6326`; local `main` `faa3c44` is unpushed). A stacked PR needs the login branch pushed first (separate push confirmation); retarget to `main` after the login PR merges.
- Order: backend commit first, container commit second, on the same head branch.

## Proposed commit
Message: `manual-containerize-the-app-with-podman: Containerize the app with Podman (containers)`

Body: Adds compose.yaml (db, backend, frontend; only frontend published on 127.0.0.1:4200), Containerfiles, nginx config proxying /api/ only, .env.example and build-time proxy/CA handling. Not built or run yet: Podman machine, proxy and compose provider are missing (needs-human).

## Files to commit (exact list)
New:
- `compose.yaml`
- `.env.example`
- `Backend/Containerfile`
- `Backend/.containerignore`
- `Frontend/Containerfile`
- `Frontend/nginx.conf`
- `Frontend/.containerignore`
- `certs/README.md`
- `docs/context/containers.md`
- `docs/runs/manual-containerize-the-app-with-podman/container-builder.md`
- `docs/runs/manual-containerize-the-app-with-podman/container-reviewer.md`
- `docs/runs/manual-containerize-the-app-with-podman/pr-containers.md`

Modified:
- `docs/context/project.md` (database row, new containers row)

Already in the backend commit (`pr-backend.md`); include here only if that commit is not made first:
- `Backend/db/migrations/001_ico_env_schema.sql`, `002_ico_env_users.sql`, `003_ico_env_bookings.sql`
- `docs/tasks/manual-containerize-the-app-with-podman.md`, `docs/specs/manual-containerize-the-app-with-podman.md`
- `docs/runs/manual-containerize-the-app-with-podman/` backend and database reports

Never staged: `.env` (exists, ignored via `.gitignore:1`, untracked), `certs/*.crt` (none present; ignored via `.gitignore:7`), `db-backups/` (ignored via `.gitignore:8`).

Not stageable by this mode, needs a human decision: root `.gitignore` (adds `/certs/*.crt` and `/db-backups/`). It is uncommitted and not in the allowed list. Without committing it, a fresh clone does not ignore a CA certificate or backups. Commit it separately or with the backend/other commit.

Excluded (other tasks or out of scope): `.github/**`, `docs/risk-gate.md`, `docs/workflow.md`, `docs/context/README.md`, `docs/context/backend.md` (backend commit), `Backend/src/**`, `Backend/tests/**`, `Backend/.env.example`, tasks/handover files of other tasks.

## Summary
Three Podman containers from one `compose.yaml`, started with `podman compose up -d --build`:
- `db`: `postgres:16.9-alpine`, named volume `db-data`, init SQL mounted read-only from `Backend/db/migrations` (schema `"ico-env"`, `users`, `bookings`, `schema_migrations`), no published port.
- `backend`: multi-stage Node 22.18 alpine, non-root, `init: true`, `DATABASE_URL` assembled from `POSTGRES_*`, `DB_SCHEMA=ico-env`, no published port.
- `frontend`: Angular build served by `nginx:1.28.0-alpine` (non-root, port 8080), SPA fallback, only `location /api/` proxied to `backend:3000`, published only on `127.0.0.1:${FRONTEND_PORT:-4200}`.
- Proxy values only as credential-free build `ARG`s; runtime proxy variables blanked; CA only in build stages via `NODE_EXTRA_CA_CERTS`; TLS verification never disabled.
Work item: none (source: manual).

## Acceptance criteria
- [ ] AC1 one command starts db, backend, frontend (design only, not run)
- [ ] AC2 `http://localhost:4200` loads and `/api` reaches backend (design only, not run)
- [ ] AC3 `/api/health` 200 only when the DB answers (backend code and tests done, 72 pass; container path not run)
- [ ] AC4 tables exist in the db container (SQL written; not executed)
- [x] AC5 `.env` holds credentials, ignored and untracked; no secret in `compose.yaml`, Containerfiles, `.env.example`
- [x] AC6, AC7 (backend scope, see `pr-backend.md`)
- [ ] AC8 proxy as build `ARG` only (static check passed; runtime `podman inspect` not done)
- [ ] AC9 only frontend published on 127.0.0.1 (static check passed; `compose ps` not run)
- [ ] AC10 data kept after `down`/`up` (not run)
- [x] AC11 context docs updated (`containers.md`, `project.md`; `backend.md` in backend commit)
- [x] AC12 only `/api/` proxied, `X-Forwarded-For` blanked (static)
- [x] AC13 no `down -v`, volume removal, prune; no machine initialised

## How to start
1. Prerequisites: Podman machine running, Bosch proxy on `127.0.0.1:3128` reachable from the VM, compose provider installed (`docker-compose` v2 preferred).
2. `Copy-Item .env.example .env`, then set real values (do not use placeholders; generate password and `JWT_SECRET` with 64 hex chars).
3. With `HTTP_PROXY`/`HTTPS_PROXY` set to `http://127.0.0.1:3128` in the shell: `podman compose up -d --build`
4. Open `http://localhost:4200`; check `http://localhost:4200/api/health`.
5. Stop with `podman compose down` (never `-v`).
6. TLS error during build only: put the Bosch root CA (PEM) in `certs/*.crt` (never committed).

## Required `.env` variables (names only)
`COMPOSE_PROJECT_NAME`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DB_SCHEMA`, `JWT_SECRET`, `FRONTEND_PORT`, `BUILD_HTTP_PROXY`, `BUILD_HTTPS_PROXY`, `BUILD_NO_PROXY`.

## Test results
- Container: none. Nothing built or run (EP1, EP2, EP4).
- Static review: approved, 0 blocker, 0 high, 3 medium, 9 low.
- Backend (from `pr-backend.md`): `npm run build` ok; `npm test` 72/72 pass, no database contacted.

## Migrations applied
None applied. `Backend/db/migrations/001..003` (idempotent, no DROP/TRUNCATE/DELETE) run automatically on the first start of an empty `db-data` volume; they do not re-run on an existing volume.

## Approved risks (R1-R8)
All decided by the human per the spec Risk gate. Safer alternatives used for R2-R6 (credential-free build ARGs and CA in build stages only; `.env` gitignored, never printed; frontend-only publish on 127.0.0.1; no `down -v`/prune; `/api/` only proxy without `X-Forwarded-For`). R1 (machine init/start) not exercised: blocked by the missing WSL feature. R7 (non-destructive schema) and R8 (minimal health bodies) as in the backend PR.

## Open findings
Environment (blocking verification):
- EP1 Podman machine/WSL not enabled, EP2 proxy not listening, EP4 no compose provider.

Review, medium:
- M1 `additional_contexts` (CA `COPY --from=certs`) needs provider support; could block AC1 even without a CA. Verify on first run or remove from the default path.
- M2 backend connects as the DB superuser (`POSTGRES_USER`); least-privilege role as a follow-up migration (also security M3).
- M3 nginx only sets `X-Content-Type-Options`; add `X-Frame-Options`, `Referrer-Policy`, CSP, `proxy_hide_header X-Powered-By`.

Review, low (L1-L9): no `restart:` policy; `db` without `no-new-privileges`/`cap_drop`; images pinned by tag, not digest; `DB_SCHEMA` must stay `ico-env` (SQL hard-codes it); `.env.example` placeholders become weak secrets if copied; CA concatenation fails if a cert lacks a trailing newline; `update-ca-certificates` (FR16) replaced by `NODE_EXTRA_CA_CERTS` (spec wording deviation); nginx logging to `/dev/stdout` as non-root unverified under rootless Podman; no read-only root filesystem.

Unverified assumptions to check in the first run: pinned tags exist; provider supports `${VAR:?}`, YAML merge keys, `service_healthy`, `init`, `security_opt`; empty runtime proxy variables via `podman inspect`; nothing listens on host 3000/5432.

Carried over from the backend PR: login rate limit collapses to one bucket behind nginx (R6, separate task); health probe shares the login pool without timeouts (backend M1); base-branch situation (stacked on the unpushed login branch).

## Backend and frontend PRs
- Backend: `docs/runs/manual-containerize-the-app-with-podman/pr-backend.md` (health endpoint, `DB_SCHEMA`, init SQL, 72 tests pass).
- Frontend: `pr-frontend.md` does not exist; no frontend source change in this task.
