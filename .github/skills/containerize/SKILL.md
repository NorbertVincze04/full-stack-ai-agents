---
name: containerize
description: "Use to containerize the app (frontend, backend, PostgreSQL, one compose file) for Podman or Docker, start it with one compose up and test it. Detects an existing setup and converts it when the other runtime is requested. Containerization workflow."
argument-hint: "[podman | docker] [task-id]"
user-invocable: true
---

Agent: `Container Engineer`. If you are another agent, run this skill through a `Container Engineer` subagent. Load the `container-runtime` skill for the Docker/Podman differences and the conversion procedure.

# Get task
- Runtime: the argument, else `.github/config.json` -> `containers.runtime`.
- Task: the given ID (read `docs/runs/<id>/brief.md` first if it exists). Without one, ask `Task Analyst` for `/get-task manual: containerize the app for <runtime>` and `/spec` so a spec with `Area: containers` and a `Risk gate` exists (the Orchestrator runs the human gates). Take `approved-risks` from the caller.
- Read `docs/agents/container-engineer.md` first (what was built, runtime history, past failures and fixes), then `docs/context/project.md`, `docs/context/containers.md` (services, files, env vars, proxy), `.github/config.json` -> `containers`, `workflow`, and the build/start commands and ports from `backend.md` / `frontend.md`.

## Steps
1. **Detect**: existing `compose.yaml`, `Backend/Containerfile`, `Frontend/Containerfile`, `Frontend/nginx.conf`, ignore files, `.env`, and which runtime they were built and verified for (`containers.runtime`, header comment in `compose.yaml`, `containers.md`). Installed runtimes: `podman --version`, `podman machine list`, `docker --version`, `docker info`, and the compose command of each.
2. **Choose the mode**: `create` (nothing exists), `verify` (setup exists for the requested runtime), `convert` (setup exists for the other runtime; follow the conversion procedure in `container-runtime`: shared files stay, only runtime-specific parts change).
3. **Runtime ready?** If the runtime, a Podman machine or a compose provider is missing, or Docker is not running, return `needs-approval` describing what must be installed or started and how it passes the proxy (installing or creating them is a risk-gate item).
4. **Build the files** listed under "Files" in [details.md](./details.md). If the app needs a change (health route, DB connection code, `apiUrl`), list it as a required change for `backend`/`frontend` instead of editing it.
5. **Migrations**: if `Backend/db/migrations` has files, apply the pending ones to the local `db` container as described in `.github/skills/implement/database.md` ("Apply to the local database container").
6. **Start and test**: `<runtime> compose up -d --build` (`HTTP_PROXY`/`HTTPS_PROXY` = `containers.proxy.hostProxyUrl` for that command only; `curl.exe --noproxy "*"` for localhost) and run every check under "Checks" in [details.md](./details.md).
7. **Test-fix loop**: keep a counter per failing check; fix and re-run up to `workflow.maxTestFixLoops` rounds. Classify each failure with "Failure classes" in [details.md](./details.md). If the root cause is application code, stop with `needs-human`, `Root cause in: backend | frontend`; if it is the machine, proxy or certificates, `Root cause in: environment` and say what the human must do.
8. **Review**: call `Reviewer` `/review <id> containers`. On `blocker` or `high` findings fix them, re-run steps 6-7 and the review, up to `workflow.maxFixIterations` times; remaining findings are reported, then `needs-human`.
9. **Record**: update `docs/context/containers.md` (runtime, status, files, commands) and the containers row in `docs/context/project.md`; when the runtime changed (and the human approved it), set `.github/config.json` -> `containers.runtime`. Write `docs/runs/<task-id>/containerize.md` (about 60 lines): mode, runtime, files, results table with one line of evidence per check, failures, required app changes, actions awaiting approval. Variable names only, never values.
10. **Update context**: update `docs/agents/container-engineer.md` per `docs/context/README.md` (Agent context files): task row (runtime, mode, result), each failure and its root cause and fix under `Defects and lessons`, refresh `Open items`.
11. Return `Status`, runtime and mode, stack summary (services, URLs, start and stop commands, where `.env` is), open findings, report path. Next step: `/create-pr <id>`.

## When it fails
- Actions from the risk gate row `Local environment / containers` that are not in `approved-risks`: `needs-approval` to the caller; if the human started this command directly, the top-level chat asks them the risk question and repeats the step with their decision.
- Pull or build times out or returns 407/`x509`: report it; if TLS inspection is the cause, the human places the root CA in `certs/*.crt` and this skill wires it into the build stage only (see `containers.md`). Do not change proxy tooling, WSL or Docker/Podman proxy settings.
- Port conflict (for example 4200): set `FRONTEND_PORT` in `.env` only if `.env` was created by you; otherwise ask.
- Both runtimes have stacks of the same compose project: stop the other one first (`down` without `-v`) before starting the requested one.
- The database volume does not move between runtimes: after a conversion the new stack starts with an empty database and the init migrations run; moving data (`pg_dump` and restore) needs approval.

## Never
- Edit application source, print/log/commit `.env` values, or put secrets in images, `ARG`/`ENV`, compose files or reports.
- Create the machine, install a runtime, compose provider or CA, change proxy/WSL settings, or overwrite an existing `.env` without approval.
- `down -v`, `volume rm/prune`, `system prune`, remove anything outside this compose project, use `--privileged`, bind a port to a non-loopback address, or pull from registries not in `containers.allowedRegistries`.
- Run plain `compose config` (prints interpolated secrets); use `--quiet` or `--no-interpolate`.
- Touch a remote database or the Cloud Foundry tunnel.
