# Container Tester - manual-containerize-the-app-with-podman (round 0, new run)

Status: **needs-human** - `Root cause in: environment` (EP2, container -> proxy path). EP4 is fixed. The stack was not built or started: the build would stop at `npm ci` because the spec's `buildProxyUrl` is not reachable from a container.

Previous round: failures EP2 (VM could not reach the proxy) and EP4 (no compose provider). This run applied the two human-approved environment fixes. EP4 is resolved. EP2 is partly resolved (VM side) and still failing (container side).

## Environment changes made (human-approved)

| Item | Detail |
| --- | --- |
| `%UserProfile%\.wslconfig` | File did not exist, so no backup was needed. Created with exactly `[wsl2]` and `networkingMode=mirrored`. Nothing else changed. |
| WSL / machine | `wsl --shutdown`, then `podman machine start` (with `HTTP(S)_PROXY=http://127.0.0.1:3128`). No init, rm, reset or `set`. |
| Compose provider | `docker-compose` v5.6.1 (standalone, windows x86_64) from the official `github.com/docker/compose` release, downloaded through `http://127.0.0.1:3128`. SHA256 verified against the release `checksums.txt` (`91b1492f...25c4cd`, match). Installed as `C:\Users\VIN4CLJ\AppData\Local\Programs\docker-compose\docker-compose.exe` (no admin, no Docker Desktop, no daemon). That directory was added to the USER PATH and to the current session PATH; the downloaded `checksums.txt` was deleted. |
| Images pulled | `docker.io/library/postgres:16.9-alpine`, `node:22.18.0-alpine`, `nginx:1.28.0-alpine` (needed to verify tags and for the container probe). |
| Not changed | Any other proxy, WSL, Podman or TLS setting; `.env`; compose files; no volume, prune or `down` command. |

Environment: Podman 6.0.2 (Windows client), WSL 2.7.11.0 provider, machine `podman-machine-default` (rootless, 7 CPUs, 2 GiB), rootless network cmd `pasta`, compose provider v5.6.1.

## Prerequisite results

| Check | Id | Result | Evidence |
| --- | --- | --- | --- |
| Machine exists and is running | EP1 | pass | `podman machine list`: running; `podman machine ssh` works. Note: the first `podman machine start` after the mirrored switch returned exit 125 ("machine is not listening on ssh port") because `sshd` in the VM could not bind port 63944 ("Address already in use", host TIME_WAIT sockets on `::1:63944`). It cleared by itself after about 90 s and `sshd` came up. Mirrored mode makes this a possible race on every machine start. |
| Proxy from VM: `127.0.0.1:3128` | EP2 (VM) | **pass (fixed)** | `podman machine ssh`: `curl -x http://127.0.0.1:3128 -I https://registry-1.docker.io/v2/` returns `401`. TCP connect to `127.0.0.1:3128` is open. |
| VM `HTTP(S)_PROXY` value | EP2 (VM) | pass | `http_proxy`, `https_proxy` and upper-case variants are all `http://127.0.0.1:3128`. In mirrored mode that is the host proxy, so it works. Reported only, not changed. |
| Proxy from VM shell: `host.containers.internal:3128` | EP2 | **FAIL** | `host.containers.internal` does not resolve in the VM shell (expected; it is injected into containers only). Connecting to `169.254.1.2:3128` from the VM times out. |
| Proxy from a container: `host.containers.internal:3128` | EP2 (container) | **FAIL** | Throwaway `node:22.18.0-alpine` container (proxy env blanked): `host.containers.internal` resolves to `169.254.1.2`; TCP to port 3128 gives `ECONNREFUSED`. Also `ECONNREFUSED` for `169.254.1.2`, `10.40.231.214` (the mirrored host IP), `10.40.224.1` (VM gateway) and the container's own `127.0.0.1`. From the VM shell, `10.40.231.214:3128` is also refused. |
| Registry through the proxy | EP2 | pass for the VM, fail for containers | VM: 401 as expected. Containers: no path to the proxy (row above). |
| Image tags exist | step 2 | **pass** | Real `podman pull` succeeded for `postgres:16.9-alpine`, `node:22.18.0-alpine`, `nginx:1.28.0-alpine` from `docker.io/library` (the previous "no such host" was the old VM proxy problem). |
| Compose provider | EP4 | **pass (fixed)** | `podman compose` runs `docker-compose.exe` v5.6.1; `podman compose version` prints "Docker Compose version v5.6.1". That is above v2.17, so `additional_contexts` is supported. `podman compose config --services` lists `db`, `backend`, `frontend` (parses; no values printed). |
| CA in `certs/*.crt` | EP3 | not evaluated | No TLS error occurred; the build was never reached. |

## Decision (design rule from the approval)
`127.0.0.1:3128` works from the VM, but `host.containers.internal:3128` does not work from a container. The approval says to change no design or config in that case, so I stopped and report the facts. The spec's `buildProxyUrl` (`http://host.containers.internal:3128`, used for `BUILD_HTTP_PROXY`/`BUILD_HTTPS_PROXY` and `npm ci` in the build stages) would need to change, or the human must make the proxy reachable from containers. Build `RUN` steps run in the same rootless `pasta` network as containers, so `npm ci` through `buildProxyUrl` would fail the same way. `podman compose up -d --build` was therefore not run.

## Check table (AC1-AC13)

| AC | Result | Evidence |
| --- | --- | --- |
| AC1 build and start, db/backend healthy | not run | blocked by container -> proxy path (EP2) |
| AC2 `localhost:4200` 200 + `<app-root`, `/api/health` not 502/504 | not run | blocked |
| AC3 `/api/health` 200 / 503 with db stopped | not run | blocked |
| AC4 schema `"ico-env"`, `users`, `bookings`, `schema_migrations` | not run | blocked |
| AC5 `.env` not tracked, `.env.example` tracked, no secrets | partial pass | `git check-ignore .env` prints `.env`; `.env` exists; no value printed. `.env.example` is still untracked (change not yet committed). No image exists yet to check history. |
| AC6 backend uses `"ico-env"` in the container | not run | blocked (unit tests for both schemas are in the passing suite) |
| AC7 Backend `npm test` | **pass** | 72 tests, 72 pass, 0 fail, 18 suites |
| AC8 proxy only as build ARG, absent at runtime | not run | static review only: `compose.yaml` blanks runtime proxy vars and passes `BUILD_*` as build args. Not verified on a built image. |
| AC9 only `127.0.0.1:4200` published, non-root, allowed registries, pinned tags | partial | static review: no `ports:` for db/backend, frontend bound to `127.0.0.1`, no `privileged`; the three pinned tags exist in `docker.io/library`. Runtime checks not run. |
| AC10 `down` then `up -d` keeps data | not run | blocked |
| AC11 context docs updated | not checked | out of scope for this run; `containers.md` still says "not built or verified" and "no Podman machine" |
| AC12 nginx proxies only `/api/`, no X-Forwarded-For | not run | nginx config check skipped; no nginx container was run |
| AC13 no `down -v`, volume removal or prune; machine init only if missing | pass | none were run; this run did not init the machine (it already existed) and did not recreate it |

## Failing checks

### F1 - EP2: containers cannot reach the proxy at `host.containers.internal:3128`
- Category: proxy / environment.
- Severity: blocker.
- Root cause in: environment (the spec's `buildProxyUrl` may also have to change; that is a decision for the human).
- Suspected cause: with `networkingMode=mirrored`, the VM reaches the host proxy only on its own loopback (`127.0.0.1:3128`). The rootless `pasta` network used by containers and builds has no working route to it: `host.containers.internal` (`169.254.1.2`) is refused, and even the mirrored host IP is refused from the VM shell (probably the Hyper-V/Windows firewall for inbound connections from the VM, or the proxy listeners not accepting that source). I did not change any firewall or proxy setting.
- Options for the human (each needs a decision; none was applied):
  1. Make the proxy reachable from containers: allow inbound TCP 3128 from the VM/container network (Windows or Hyper-V firewall), and use the address that then works as `buildProxyUrl`, or fix `host.containers.internal` forwarding. Verify with `podman run --rm docker.io/library/node:22.18.0-alpine` and a `CONNECT registry-1.docker.io:443` to `host.containers.internal:3128`.
  2. Change the design: build with host networking so `127.0.0.1:3128` is the proxy (for example `build.network: host` in `compose.yaml` and `buildProxyUrl` `http://127.0.0.1:3128`). This needs a spec change by the builder and a new risk-gate approval.
  3. Use a different, reachable proxy address for builds.

### Side note (not an app failure)
Mirrored mode can make `podman machine start` fail once with "machine is not listening on ssh port" when a recent connection to `localhost:63944` is still in TIME_WAIT. It recovers after about 90 s; retry `podman machine ssh "echo ok"` before running compose.

## Notes for the next run
- Machine is running; `docker-compose` v5.6.1 is on the PATH (new terminals pick it up from the user PATH). The three images are already pulled.
- After F1 is resolved, re-run from the build step (one `podman compose up -d --build`), then the full check list (schema, 4200, `/api/health` 200 and 503, ports, non-root, history, AC10, AC12).
- The stack was never started, so nothing is running.

## Verdict
- Verdict: needs-human
- Report: docs/runs/manual-containerize-the-app-with-podman/container-tester.md
- Root cause in: environment

---

# Round 1 (D8 re-verification, build-only host networking)

Verdict: **fail** - build rejected before any step ran. `Root cause in: containers` (compose `additional_contexts` / `COPY --from=certs` is unsupported by the podman builder path). Nothing was built or started. D8 itself (`build.network: host`, proxy `http://127.0.0.1:3128`) is therefore still unverified.

## Environment
Podman 6.0.2 (Windows client), machine `podman-machine-default` (WSL, running), compose provider docker-compose v5.6.1 via `podman compose`. `DOCKER_BUILDKIT`, `COMPOSE_BAKE`, `DOCKER_HOST` are unset; no `docker`/`buildx` binary and no `~/.docker/cli-plugins`.

## Prerequisite results
| Check | Result | Evidence |
| --- | --- | --- |
| Machine running | pass | `podman machine list`: Currently running |
| WSL mirrored networking | pass | `.wslconfig` has `networkingMode=mirrored` |
| Proxy reachable from the VM | pass | `podman machine ssh` curl via `http://127.0.0.1:3128` to `registry-1.docker.io/v2/` returns 401; host TCP 3128 open |
| Compose provider | pass | `podman compose version`: v5.6.1 |
| `.env` present and ignored | pass | `Test-Path .env` true; `git check-ignore .env` prints `.env`; no value read |
| TLS / CA | not evaluated | no TLS error reached; `certs/` holds only `README.md` |

## Build result
`podman compose up -d --build` (shell `HTTP(S)_PROXY=http://127.0.0.1:3128`, `NO_PROXY=localhost,127.0.0.1`) stopped at the first build:

```
Image localhost/deskbooking-backend:local Building
the classic builder doesn't support additional contexts; building with BuildKit requires the buildx Docker CLI plugin, and DOCKER_BUILDKIT must not be set to 0
Error: executing ...docker-compose.exe up -d --build: exit status 1
```
`podman compose ps` afterwards: no containers. No image pulled or built, so the proxy path with `build.network: host` was not exercised.

## Failing checks
### F1 - build: `additional_contexts: certs` needs BuildKit/buildx
- Category: Containerfile / compose error (not proxy, not TLS).
- Severity: blocker.
- Root cause in: containers (`compose.yaml` `build.additional_contexts.certs` in `backend` and `frontend`; `COPY --from=certs . /tmp/certs/` at `Backend/Containerfile:11` and `Frontend/Containerfile:12`).
- Suspected cause: docker-compose talks to Podman's Docker-compatible API, which only offers the classic builder; named additional contexts require BuildKit through the buildx plugin, which is not installed. Round 2 builder notes assumed `podman compose config --quiet` acceptance meant build support; it only checks parsing.
- Suggested fixes (none applied; no files edited):
  1. Preferred: drop `additional_contexts` and the `COPY --from=certs` stage-copy; supply an optional CA another way that the classic builder supports (for example a `certs/` copy via the main context with `Backend/`/`Frontend/` containing a `.crt` glob, or add the CA only when a TLS error occurs, as FR16 already says it is conditional). No CA is needed now (no TLS error seen).
  2. Alternative: install the buildx plugin (tool installation, needs human approval per `docs/risk-gate.md`); it may still not work with Podman's API.
  3. Alternative: build with `podman build --network host` per image (FR15 fallback) and `podman compose up -d` without `--build`; `COPY --from=certs` still fails unless `--build-context certs=./certs` is passed, which Podman supports.

## AC1-AC13
| AC | Result | Evidence |
| --- | --- | --- |
| AC1 | fail | build rejected (F1) |
| AC2, AC3, AC4, AC6, AC10, AC12 | not run | no stack |
| AC5 | partial | `.env` exists and is git-ignored (`git check-ignore`); no values printed; image history not checkable |
| AC7 | pass (Round 0) | Backend `npm test` 72/72; not re-run |
| AC8 | not run | static: `build.network: host` and blank runtime proxy vars in `compose.yaml`; nothing built to inspect |
| AC9 | static only | no `ports:` for `db`/`backend`, frontend `127.0.0.1:4200`; tags pinned in allowed registry; runtime not checked |
| AC11 | not checked | out of scope |
| AC13 | pass | no `down -v`, volume removal or prune; machine not initialised/changed |

## Verdict
- Verdict: fail
- Report: docs/runs/manual-containerize-the-app-with-podman/container-tester.md
- Root cause in: containers
- Stack: not running; no URLs available.

---

# Round 5: orchestrated run

Verdict: **needs-human** - `Root cause in: environment`. Build, health, schema, security and persistence checks pass. The only failing item: the host port `127.0.0.1:4200` cannot be bound by the frontend container because a host Angular dev server (`ng serve`, pid 8384) already listens on `[::1]:4200`. Everything was verified on the frontend through `127.0.0.1:4201` (shell-only `FRONTEND_PORT=4201` override; `.env` untouched, still `4200`). The stack is left running on 4201.

## Environment
Podman 6.0.2 (Windows client), machine `podman-machine-default` (WSL, running, mirrored networking), compose provider Docker Compose v5.6.1 (`%LOCALAPPDATA%\Programs\docker-compose` added to the command PATH), `HTTP(S)_PROXY=http://127.0.0.1:3128`, `NO_PROXY=localhost,127.0.0.1` for `podman`. Localhost checks used `curl.exe --noproxy "*"`.

## Start state and build
- On entry a `podman compose up -d --build` (pid 28544, started 15:44) from the cut-off invocation was still running; I did not start a second build and polled until it exited (about 18 min in total).
- Result of that run: `localhost/deskbooking-backend:local` built (`2d7890125d3f`), `localhost/deskbooking-frontend:local` built (`f045d5c3264a`; all steps `Using cache`, so this run did not repeat `npm ci`/`ng build`; earlier uncached layers were built through the proxy, I did not see those logs). No `x509`, `407`, `ECONN*` or `ETIMEDOUT` in the build log. `db` stayed up (volume `deskbooking_db-data` untouched), `backend` recreated and healthy.
- The run then exited 1 at the frontend start: `rootlessport listen tcp 127.0.0.1:4200: bind: address already in use` (also with `podman start deskbooking-frontend-1`). Cause in F1.
- Re-run `podman compose up -d` (no rebuild, images exist) with `FRONTEND_PORT=4201` set for that command only: exit 0, all three healthy.

## Prerequisites
| Check | Result | Evidence |
| --- | --- | --- |
| EP1 machine running | pass | `podman machine list`: `podman-machine-default` running=true (not initialised or changed) |
| EP2 proxy from the VM | pass | `curl -x http://127.0.0.1:3128 -I https://registry-1.docker.io/v2/` inside the VM returns 401 |
| EP4 compose provider | pass | `podman compose version`: Docker Compose version v5.6.1 |
| EP3 CA | not needed | no TLS error in any build log |

## AC1-AC13
| AC | Result | Evidence |
| --- | --- | --- |
| AC1 `up -d --build` builds and starts, db/backend healthy | **fail at 4200 / pass at 4201** | Builds succeeded, `db` and `backend` healthy (restarts 0). With the default port the command exits 1 on the frontend bind (F1). With `FRONTEND_PORT=4201` all three services are `running`, health `healthy`. |
| AC2 `localhost:4200` 200 + `<app-root`; `/api/health` not 502/504 | **fail at 4200 / pass at 4201** | `http://localhost:4201/` 200 with `<app-root></app-root>`; `http://localhost:4201/api/health` 200. `127.0.0.1:4200` answers 000 (nothing published); `[::1]:4200` answers 200 from the host dev server, not the container. |
| AC3 health 200 / 503 | pass | db up: `{"success":true,"payload":{"status":"ok"}}` 200. After `podman compose stop db` (only db): `{"success":false,"message":"Database unavailable"}` 503, twice, no detail in body. After `podman compose start db`: db healthy within 5 s and health 200 on the first poll. Backend log has only `Health check failed: database unavailable` and `Database pool error: terminating connection due to administrator command` (message only, no host or credentials). |
| AC4 schema and tables via `podman exec` | pass | `"ico-env"` has `users`, `bookings`, `schema_migrations`; `schema_migrations` = `001_ico_env_schema`, `002_ico_env_users`, `003_ico_env_bookings`; `users` and `bookings` columns match FR9/D2; `bookings` has PK and `UNIQUE (booking_date, booking_desk)`; no tables in `public`; both tables empty. After `down`/`up -d` the db log says "Database directory appears to contain a database; Skipping initialization" (idempotent, nothing re-run). `pg_isready -h 127.0.0.1`: accepting connections. |
| AC5 `.env` and secrets | partial pass | `git check-ignore .env` prints `.env`; `.env` not tracked. Neither `POSTGRES_PASSWORD` nor `JWT_SECRET` (compared in memory, never printed) occurs in the history or image config of the backend, frontend and postgres images, in `compose.yaml`, `.env.example` or the Containerfiles. `.env.example` is still untracked (`??` with the other new files): not committed yet, so "tracked" is pending the commit. `.gitignore` has 4 added lines (modified, uncommitted). Plain `podman compose config` was not run. |
| AC6 backend uses `"ico-env"` | pass | backend env `DB_SCHEMA=ico-env`; `POST /api/auth/login` with unknown credentials through nginx returns 401 `Invalid credentials` (the query against `"ico-env".users` runs, no 500). Backend `npm test`: 74 tests, 72 pass, 0 fail, 2 skipped (POSIX signal tests on Windows). |
| AC7 backend tests | pass | see AC6 |
| AC8 proxy only as build ARG; none at runtime | pass | All three runtime containers have `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY` and lowercase variants set to empty strings (length 0); no `3128` or `host.containers.internal` in any runtime env. No `*PROXY` env in any image config; no `BUILD_*_PROXY` or `3128` in image history. `compose.yaml` sets `build.network: host` on backend and frontend (lines 44 and 73, build only); containers run with network mode `bridge` on `deskbooking_app`, never host. No CA installed; no TLS-disabling flags. Builds are classic-builder compatible (the build ran). Caveat: this run's frontend build was fully cached (see Build). |
| AC9 ports, non-root, images | pass | `podman port`: db and backend publish nothing (only the image `EXPOSE` shows in `ps`); frontend `8080/tcp -> 127.0.0.1:4201` (spec: 4200). 0 host listeners on 3000/5432. Users: backend uid 1000 (`node`), frontend uid 101 (`nginx`), postgres processes run as `postgres`. `privileged=false`; backend and frontend `cap_drop` set and `no-new-privileges`; mounts: db has only the named volume and the read-only `/docker-entrypoint-initdb.d` bind, backend and frontend none. Images: `docker.io/library/postgres:16.9-alpine`, `nginx:1.28.0-alpine`, `node:22.18.0-alpine`, all pinned, from `docker.io/library`. db has no `cap_drop` (not required by the spec). |
| AC10 `down` then `up -d` keeps data | pass | `podman compose down` (no `-v`) removed containers and network `deskbooking_app`; volume `deskbooking_db-data` stayed. After `up -d` the volume creation time and the `schema_migrations` versions and `applied_at` values are identical to before; postmaster restarted; init skipped; health 200 and frontend 200 again. Tables hold no rows, so persistence is shown by the unchanged applied-migration timestamps and the skipped init. |
| AC11 context docs | partial | `backend.md` and `project.md` describe the health route, `DB_SCHEMA` and the container schema. `containers.md` covers services, ports (frontend only) and decisions, but its status line still says "not yet re-verified by a build" and `frontend.md` still lists `npm start` on 4200 without noting the clash (F3). Out of the tester's edit scope. |
| AC12 nginx | pass | `nginx -T`: single `listen 8080`; the only `location` blocks are `/api/` (`proxy_pass http://backend:3000`, prefix kept) and `/` (`try_files`); `proxy_set_header X-Forwarded-For ""` (client value blanked, nothing added). `GET /health` returns the SPA fallback (200 `text/html`), `/api/nothing` returns 404 from the backend. `trust proxy` appears nowhere in `Backend/src` or in HEAD, and `loginRateLimit.ts` has no diff against HEAD. |
| AC13 no destructive actions | pass | Only `build`, `up -d`, `stop db`, `start db`, `down` (no `-v`), `ps`, `port`, `logs`, `exec`, `inspect`, `history`, `volume ls`/`inspect`. No `down -v`, `volume rm`, prune, machine init/start/rm or proxy/WSL change; no file edited except this report (helper scripts live in `%TEMP%`). |

## Failing checks

### F1 - host port 4200 cannot be bound (AC1, AC2)
- Category: runtime / port conflict.
- Severity: high (the documented URL `http://localhost:4200` does not reach the container; blocks the default `podman compose up -d --build`).
- Root cause in: environment.
- Suspected cause: `node ...\ng.js serve` (pid 8384, started 8:39, `npm start` of `Frontend/`) listens on `[::1]:4200`. The Podman machine uses WSL mirrored networking, so `rootlessport` binding `127.0.0.1:4200` collides with it ("address already in use"). Nothing listens on 4200 inside the VM (`ss`), and the stack works on 4201. I did not stop the dev server (not my process, not approved) so the link is strong but not proven by stopping it.
- Suggested fix (human): stop the dev server, then `podman compose up -d` (recreates only the frontend; images exist) to get `http://localhost:4200`; or set `FRONTEND_PORT` in `.env` to a free port (CORS origin follows it). Consider noting in `frontend.md`/`containers.md` that `npm start` and the container both use 4200.

### F2 - frontend build context is huge; build is very slow (observation)
- Category: Containerfile / compose (performance).
- Severity: medium.
- Root cause in: containers.
- Suspected cause: `docker-compose` (client) builds the tar context itself and reads `.dockerignore`, not `.containerignore`. `Frontend/` and `Backend/` have only `.containerignore`, so `Frontend/node_modules` (about 275 MB), `.angular` and `dist` are tarred and sent although `.containerignore` excludes them. The cut-off invocation spent about 14 minutes (docker-compose CPU about 114 s) in that phase even with every step cached. Not confirmed by removing the files.
- Suggested fix: add `Frontend/.dockerignore` and `Backend/.dockerignore` with the same content as the `.containerignore` files (classic builder compatible, keeps `ca` un-ignored).

### F3 - context docs stale (AC11)
- Category: docs. Severity: low. Root cause in: containers (docs owner `Container Builder`).
- `docs/context/containers.md` status line still says the stack is not yet verified by a build; add the port-4200 note from F1.

## Final state
- Stack running (left up): `deskbooking-db-1` healthy, `deskbooking-backend-1` healthy, `deskbooking-frontend-1` healthy; volume `deskbooking_db-data` intact.
- URLs now: `http://localhost:4201` and `http://localhost:4201/api/health` (frontend published on `127.0.0.1:4201` via the `FRONTEND_PORT=4201` shell override). Spec URL `http://localhost:4200` will work after F1 is resolved.

## Verdict
- Verdict: needs-human
- Report: docs/runs/manual-containerize-the-app-with-podman/container-tester.md
- Root cause in: environment (F1); F2 containers; F3 docs
