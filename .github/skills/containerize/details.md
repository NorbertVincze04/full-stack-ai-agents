# Containerize details (used by `containerize` steps 4, 6 and 7)

## Files
Follow the conventions in `docs/context/containers.md`:
- Multi-stage Containerfiles for backend and frontend: non-root, pinned tags, registries from `containers.allowedRegistries`.
- `db` service with a named volume and `Backend/db/migrations` mounted read-only.
- One `compose.yaml` with healthchecks and `depends_on: service_healthy`; the Bosch proxy only as build `ARG`s.
- nginx with the `/api/` proxy; `.containerignore` plus an identical `.dockerignore`.
- `.env.example`; `.env` only if missing (generated secrets, never printed); `certs/README.md`.
- Keep every shared file portable between Docker and Podman (`container-runtime`).

## Checks
Report each as pass/fail with one line of evidence:
- all services running and healthy;
- `db` ready, with schema `"ico-env"` and `schema_migrations`;
- backend healthy;
- `GET http://localhost:<FRONTEND_PORT>/` returns 200 and contains `<app-root`;
- `/api/health` through the frontend is 200, not 502/504;
- backend and db are not published to the host;
- containers run non-root;
- no proxy value or secret in the runtime environment or image history;
- `.env` is git-ignored;
- `down` then `up -d` keeps the data.

## Failure classes
| Class | Signs | First action |
| --- | --- | --- |
| proxy | 407, timeouts on pull or `npm ci` | check `containers.proxy.hostProxyUrl` is up; report to the human, do not change proxy tooling |
| TLS | `x509`, `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` | human places the root CA in `certs/*.crt`; wire it into the build stage only |
| registry | pull denied, short-name prompt | fully qualified name from an allowed registry |
| Containerfile | build step error | read the failing step, fix the file |
| runtime crash | restart loop, unhealthy | `compose logs --tail 80 <service>`; application cause means `needs-human`, `Root cause in: backend | frontend` |
