---
name: container-runtime
description: "Use when containerizing for Docker or Podman or converting an existing setup from one to the other: command mapping, differences that affect the shared files, detection, conversion procedure and verification."
argument-hint: "[podman | docker] [convert]"
user-invocable: false
---

Agent: `Container Engineer`. Loaded by `containerize`; not a standalone command.

# Get task
Requested runtime: the argument, else `.github/config.json` -> `containers.runtime`. Current runtime of the setup: `containers.runtime`, the header comment of `compose.yaml` and `docs/context/containers.md`. If they differ, the mode is `convert`. Read `docs/context/containers.md` for the project's actual decisions (D8 build networking, D9 classic builder, Bosch proxy).

## Steps
1. **Detect**: `podman --version`, `podman machine list`, `podman compose version` / `docker --version`, `docker info`, `docker compose version`. Note which runtime is installed and running.
2. **Command mapping**: replace `podman` with `docker` (and back) in start/stop commands, comments, docs and the `<runtime>` placeholders; `compose` is a subcommand in both (`podman compose`, `docker compose`). Allowed: `build`, `up -d`, `down` (no `-v`), `ps`, `logs`, `exec`, `inspect`.
3. **Keep the shared core portable** (works unchanged under both): `compose.yaml`, `Containerfile`s referenced with `build.dockerfile: Containerfile`, `nginx.conf`, `.env.example`, healthchecks declared in compose (not `HEALTHCHECK`, which Podman's default OCI image format ignores), fully qualified image names, ignore files `.containerignore` and an identical `.dockerignore` (Docker reads only the latter), no BuildKit-only syntax (`# syntax=`, `RUN --mount`, heredocs, `additional_contexts`) so the classic Podman builder works.
4. **Runtime-specific parts** (isolate them, comment them, document them in `containers.md`):

| Aspect | Podman | Docker |
| --- | --- | --- |
| Engine | daemonless, rootless; on Windows/macOS needs a running `podman machine` (WSL) | daemon (Docker Engine or Docker Desktop) must be running |
| Compose | `podman compose` delegates to a provider (docker-compose or podman-compose) | `docker compose` plugin |
| Local image names | `localhost/<name>` prefix | no prefix needed; `localhost/<name>` still works as a plain name |
| Host from container | `host.containers.internal` | `host.docker.internal` |
| Build proxy | host proxy variables are forwarded into containers: blank them at runtime; build `ARG`s; `build.network: host` only where machine networking requires it (D8) | Docker Desktop/daemon proxy settings inject proxy variables into builds and containers: blank them at runtime; build `ARG`s still work; `build.network: host` is normally not needed |
| Bind mounts | add `:Z`/`:z` only on SELinux hosts | not needed |
| `init: true` | catatonit | tini |
| Cleanup | `podman compose down` | `docker compose down` |

5. **Convert** (setup exists for the other runtime):
   a. Stop the old stack (`down`, never `-v`) so the port (default 4200) is free.
   b. Keep the shared files; change only the runtime-specific parts from the table: header comments and commands in `compose.yaml`, `build.network: host` (remove for Docker unless the proxy needs it; add for Podman only with the mirrored-network proxy, D8), proxy values in `.env`/`.env.example` (`BUILD_*`), `docs/context/containers.md` (runtime section, commands, checklist), `.github/config.json` -> `containers.runtime`.
   c. Do not delete the other runtime's files or settings unless the human asks; the goal is one compose file that runs under both.
   d. Warn that the database volume is local to the runtime: the new stack starts empty and the init migrations run again; moving data needs a `pg_dump`/restore (approval).
6. **Verify** with the checklist of `containerize` step 6 under the new runtime, then record the result.

## When it fails
- Runtime or compose provider missing, machine stopped, Docker daemon not running: return `needs-approval`/`blocked` with exactly what to install or start; do not install it.
- Compose key accepted by `config` but rejected at build (classic builder): remove it; `config` only parses and does not prove a key works at build time.
- Image short-name resolution prompt (Podman): use fully qualified names.
- Healthcheck never turns healthy on one runtime: check that it is declared in compose and that its command exists in the image.

## Never
- Add runtime-specific syntax to the shared files without isolating and documenting it.
- Install a runtime, compose provider, CA, or change proxy, WSL, Docker Desktop or machine settings without approval.
- Run `down -v`, prune or remove volumes, or delete the other runtime's setup on your own.
- Disable TLS verification or put the proxy or CA into runtime images.
