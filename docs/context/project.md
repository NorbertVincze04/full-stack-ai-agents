# Project context

Desk reservation web app: employees pick a date and a desk and book it; admins manage bookings. Full target design: `.github/docs/PROJECT_OVERVIEW.md` (not yet implemented). Read it only for the part a task touches.

## Current state

| Area | State |
| --- | --- |
| Backend | Express 5: CORS + JSON, `POST /api/auth/login` and public `POST /api/auth/register` (bcrypt + JWT, rate limited; both return `payload.user`), `GET /api/health` (DB probe), `pg` access to `users` in the schema from `DB_SCHEMA` (default `public`; `ico-env` in the container). See `backend.md`. |
| Frontend | Angular 18 NgModule shell: header (app name link, Help link, Login button or signed-in user name + logout icon), footer, lazy pages `/info`, `/login`, `/register`; `AuthService` (login/register/logout, `sessionStorage` session). See `frontend.md`. |
| Database | PostgreSQL database `ico-env` (schema `public`), reachable only through a Cloud Foundry tunnel. `users` migration written (`Backend/migrations/001_create_users.sql`), applied by a human. Local `db` container: schema `"ico-env"` with `users`, `bookings`, `schema_migrations` from `Backend/db/migrations` (init SQL, first start only). |
| Containers | Podman compose stack built, running and verified (`compose.yaml`, Containerfiles, nginx, `.env.example`); Podman machine (WSL mirrored networking) and docker-compose v5.6.1 provider exist, classic builder only (see `containers.md`). Only the frontend is published (`127.0.0.1:4200`); backend and db are internal. |
| Pipelines | GitHub Actions written (run results not recorded here; confirm in the Actions tab): `ci.yml` (`CI`: backend/frontend build+test, container image builds, on push to `dev` and PRs) and `cd.yml` (`CD`: after green CI on `dev`, merges the tested commit into `main` with `--no-ff`; merge-only, no deployment). Branch state is not recorded here; check with `git ls-remote origin dev` and `git ls-tree origin/main .github/workflows`. Enablement (ensure `dev` is on `origin`, check its CI run, merge workflows into `main` identical to `dev`, check settings, push to `dev` again) and human settings (bot bypass on `main`) are in `pipelines.md`. |

## Cross-cutting conventions

- Node >= 22.18, npm, one `package.json` per area (`Backend/`, `Frontend/`).
- API response shape (target): `{ success: boolean, payload?, message?, errors? }`.
- Backend dev port 3000, frontend dev port 4200; backend CORS allows `http://localhost:4200` by default.
- Workflow artifacts live in `docs/` (`tasks`, `specs`, `runs`, `handover`); see `docs/workflow.md`.

