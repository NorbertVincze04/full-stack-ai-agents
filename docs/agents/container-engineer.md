# Container Engineer - context

Agent: `.github/agents/container-engineer.agent.md` | Skills: `containerize`, `container-runtime` | Replaces: Container Builder and the stack half of Container Tester (Container Reviewer is now `Reviewer` scope `containers`).

Design, ports, env variables and proxy rules: `docs/context/containers.md`. Settings: `.github/config.json` -> `containers`.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (manual-desk-labeling)

## Tasks (containerize the app with Podman)

| Item | Result |
| --- | --- |
| Runtime | Podman 6.0.2, WSL machine with mirrored networking, `podman compose` via Docker Compose v5.6.1 provider |
| Stack | `compose.yaml`: `db` (`postgres:16.9-alpine`, named volume `db-data`), `backend` (Node 22.18 alpine, non-root, healthcheck), `frontend` (nginx 1.28 non-root, `127.0.0.1:4200` -> 8080, proxies only `/api/`) |
| Files | `Backend/Containerfile`, `Frontend/Containerfile`, `Frontend/nginx.conf`, `.containerignore` and identical `.dockerignore`, `.env.example`, `.env` (generated, git-ignored), `certs/README.md` |
| Proxy | Build `ARG`s only (`http://127.0.0.1:3128`), runtime proxy variables blanked, CA never in runtime images |
| Last verification | Round 7: pass. All services healthy, schema `"ico-env"` with `users`, `bookings`, `schema_migrations`, `/` and `/api/health` 200 through nginx, only the frontend published, non-root, no secret or proxy in env or image history |

## Defects and lessons

| Round | Failure | Root cause | Resolution |
| --- | --- | --- | --- |
| Before round 0 | Not built or run (EP1, EP2, EP4) | No Podman machine, nothing on the proxy `127.0.0.1:3128`, no compose provider | Human-approved environment fixes: machine, compose provider v5.6.1 |
| 0 | Containers could not reach `host.containers.internal:3128` | Mirrored networking: proxy is `127.0.0.1:3128` inside the VM only | D8: `build.network: host` for builds only, proxy `http://127.0.0.1:3128` |
| 1 | Build rejected | `additional_contexts` and `COPY --from=certs` need BuildKit | D9: classic builder only; CA wiring moved to a plain `COPY ca/` added only after a TLS error |
| 5 | Frontend could not bind `127.0.0.1:4200` | Host `ng serve` already listening | Verified on 4201 through a shell override; `.env` untouched |
| 6 | Build failed | Local proxy `127.0.0.1:3128` was down | Round 7 re-run after the proxy came back: pass |
| manual-desk-labeling | Local DB showed old labels D01..D12 | `db-data` volume predated 006; init SQL only runs on an empty volume | R1+R2 approved: dump desks+bookings to `db-backups/`, `down -v`, `up -d --build`; 16 rows A1-D4, API and bundle verified |

## Open items

- `down` then `up -d` data persistence was not exercised in round 7.
- New migrations in `Backend/db/migrations` only reach an existing volume via the apply step (database.md); otherwise the volume must be recreated.
- `db-backups/` is git-ignored, so dumps are never committed.
- Machine note: in mirrored mode `podman machine start` can fail once ("not listening on ssh port") and recovers after about 90 s.
- nginx resolves `backend` once; recreate `frontend` after recreating `backend`.
- Docker has never been run against this setup. The shared files are already portable (`dockerfile: Containerfile`, `.dockerignore`), but the first `/containerize docker` run is the first real test of `convert` mode, including `build.network: host`.
- The database volume does not move between runtimes; a conversion starts with an empty database.
- Task status: no handover document exists for the containerize task.
