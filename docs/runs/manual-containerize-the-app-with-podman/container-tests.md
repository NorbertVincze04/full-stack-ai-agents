# Container tests - manual-containerize-the-app-with-podman (round 7)

Verdict: **pass**. The local proxy `127.0.0.1:3128` is up again; `podman compose up -d --build` built and started all three services and all checks passed. No file was changed except this report. The stack is left running. Round 6 (proxy down) is resolved.

## Environment
Podman 6.0.2 (Windows client), machine `podman-machine-default` (WSL, running), compose provider Docker Compose v5.6.1, `FRONTEND_PORT=4200`. The build ran with `HTTP_PROXY`/`HTTPS_PROXY=http://127.0.0.1:3128` set for the `podman` command only; localhost checks used `curl.exe --noproxy "*"`.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Machine running | pass | `podman machine list`: Currently running |
| Compose provider | pass | `podman compose version`: v5.6.1 |
| `.env` present and git-ignored | pass | `Test-Path .env` true; `git check-ignore .env` prints `.env`; no value printed |
| Proxy `127.0.0.1:3128` answers | pass (was FAIL, resolved) | `curl.exe -x http://127.0.0.1:3128 -I https://registry.npmjs.org/` -> HTTP 200; TCP test True |
| Build `podman compose up -d --build` | pass (was FAIL, resolved) | exit 0; backend and frontend images built (frontend layers cached), containers recreated and started |
| All services running, healthchecks healthy | pass | `deskbooking-db-1`, `-backend-1`, `-frontend-1`: Up, `(healthy)` |
| `db` ready | pass | `pg_isready -h 127.0.0.1`: accepting connections |
| Schema `"ico-env"` and migrations | pass | tables `bookings`, `schema_migrations`, `users`; migrations `001_ico_env_schema`, `002_ico_env_users`, `003_ico_env_bookings` |
| Backend reachable / health | pass | in-container `GET http://127.0.0.1:3000/api/health` -> 200 `{"success":true,"payload":{"status":"ok"}}`; no crash loop, no errors in logs |
| Backend -> db connectivity | pass | health route runs `SELECT 1` and returns 200; no connection errors in logs |
| Frontend `GET http://localhost:4200/` | pass | 200 OK, body contains `<app-root` |
| `/api/` via nginx | pass | `GET http://localhost:4200/api/health` -> 200 from Express through nginx (not 502/504) |
| Only frontend published | pass | `podman port`: `8080/tcp -> 127.0.0.1:4200`; nothing listening on host 3000/5432 |
| Non-root | pass | backend uid 1000, frontend uid 101 |
| No proxy/secret leakage | pass | no non-empty `*_proxy` env var in any container; image history of both images has no proxy URL and no `JWT_SECRET`/`POSTGRES_PASSWORD`/`DATABASE_URL`; `podman compose config --quiet` exit 0 |

## Failing checks
None. Previous F1 (proxy down) is resolved.

## Notes
- Backend log shows only `hello world` (startup line); not a defect.
- `down` then `up -d` data persistence was not exercised in this run.

## Final state
- Stack running. Volume `deskbooking_db-data` untouched; no `down`, `-v`, prune or volume command was run.
- URLs: frontend `http://localhost:4200/`; API through nginx `http://localhost:4200/api/health`. Backend and db are internal only.

## Verdict
- Verdict: pass
- Report: docs/runs/manual-containerize-the-app-with-podman/container-tests.md
