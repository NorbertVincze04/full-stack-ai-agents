# Container review - manual-containerize-the-app-with-podman

Verdict: approved
Scope: static review only. Nothing was built, pulled or started (no Podman machine, no proxy on `127.0.0.1:3128`, no compose provider). Findings marked "unverified" must be confirmed by the Container Tester once the environment is available.

Findings: blocker 0, high 0, medium 3, low 9.

## Checked and passing
| Area | Result |
| --- | --- |
| `.env` | Exists; `git check-ignore -v .env` matches `.gitignore:1`; `git ls-files .env` is empty (untracked). Contents not read. |
| Ignore rules | `/certs/*.crt` and `/db-backups/` ignored (`.gitignore:7-8`); `.env.example` is not ignored (shows as untracked, to be committed). `certs/` holds only `README.md`. |
| Secrets in files | `compose.yaml`, both Containerfiles, `nginx.conf`, `certs/README.md` contain no secret value, no secret `ENV`/`ARG`. `.env.example` has placeholders only. `POSTGRES_USER`, `POSTGRES_PASSWORD`, `JWT_SECRET` use `${VAR:?}` (fail fast if unset). |
| Ports (R5, AC9) | Only `frontend` has `ports:`: `127.0.0.1:${FRONTEND_PORT:-4200}:8080`. `db` and `backend` have none. |
| Non-root | backend `USER node`, frontend `USER nginx`; `cap_drop: [ALL]` and `no-new-privileges` on both; no `privileged`. `db` uses the upstream entrypoint (root, then drops to `postgres`). |
| `init: true` | Present on `backend` (Node as PID 1). |
| Mounts | Only `db-data` (named volume, `/var/lib/postgresql/data`) and `./Backend/db/migrations:/docker-entrypoint-initdb.d:ro`. The mounted directory has only the three `.sql` files, no `DROP`/`TRUNCATE`/`DELETE`, all `IF NOT EXISTS`, versions recorded in `"ico-env".schema_migrations`. |
| Images | `docker.io/library/postgres:16.9-alpine`, `node:22.18.0-alpine` (>= 22.18, type stripping on by default), `nginx:1.28.0-alpine`: fully qualified, allowed registry, pinned, minimal alpine bases. Built images named `localhost/deskbooking-*:local`. Tag existence is unverified (no pull). |
| Multi-stage | Backend: `deps` -> `runtime` (`npm ci --omit=dev`, only `node_modules`, `package.json`, `src` copied; no build tools). Frontend: `build` -> `nginx` (only `dist/frontend/browser` copied). |
| Proxy (R2, AC8) | `BUILD_*` only as `ARG` in the build stages, used inline via `npm_config_*` for `npm ci`; runtime stages declare no proxy `ARG`/`ENV`; all three services blank `HTTP(S)_PROXY`/`NO_PROXY` (both cases); `BUILD_NO_PROXY` default includes `localhost,127.0.0.1,db,backend,frontend`; no credentials in defaults or `.env.example`. |
| CA / TLS | CA is `COPY --from=certs` into the build stages only and used through `NODE_EXTRA_CA_CERTS` for `npm`; runtime images do not carry it. No TLS disabling anywhere (grep for `NODE_TLS_REJECT_UNAUTHORIZED`, `tls-verify`, `strict-ssl`, `rejectUnauthorized`: no match). |
| `DATABASE_URL` | `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-deskbooking}`; the `POSTGRES_DB` default matches the `db` service. `DB_SCHEMA` default `ico-env` matches the init SQL. `CORS_ORIGIN` is a single origin, no wildcard (and `*` is refused in production by the app). |
| Reliability | Healthchecks on all three (`pg_isready -h 127.0.0.1` so the init-phase socket-only server is not reported ready; `$$` escaping correct; backend `fetch` of `/api/health`; frontend `wget 127.0.0.1:8080`). `depends_on` uses `service_healthy` (backend waits for db, frontend waits for backend). |
| nginx | Only `location /api/` proxies, `proxy_pass http://backend:3000` without URI so the prefix is preserved; SPA fallback `try_files $uri $uri/ /index.html`; `X-Forwarded-For` is blanked, not set (`nginx.conf:39`); pid and all temp paths under `/tmp`; listens on 8080; `server_tokens off`; default `conf.d/default.conf` removed. |
| Angular output | `angular.json` has builder `application`, `outputPath` `dist/frontend`, so `dist/frontend/browser` is correct. |
| Package locks | `Backend/package-lock.json` and `Frontend/package-lock.json` exist (needed by `npm ci` and the `COPY`). |
| `.containerignore` | Both exclude `node_modules`, `dist`, `.env*`, `.git`, `certs`, `db-backups`, `*.md`, `Containerfile`; backend also excludes `tests`, `db`, `migrations`; frontend also `.angular`, `.vscode`. `nginx.conf` is not excluded (needed). |
| Docs | `docs/context/containers.md` matches the files (services, ports, env vars, proxy, CA, conventions) and states honestly that nothing was built. `project.md` and `backend.md` agree. Known gaps (rate limit behind nginx, no re-run of init SQL, nginx resolves `backend` once) are documented. |

## Findings

### Medium
- M1. `compose.yaml#L43-L44`, `compose.yaml#L72-L73` (and `COPY --from=certs` in `Backend/Containerfile`, `Frontend/Containerfile`): every build depends on the compose provider supporting `additional_contexts`, although the CA is optional and only needed after a TLS error. Support is not guaranteed: `docker-compose` talking to the Podman socket may use the classic build API (no named contexts), and older `podman-compose` ignores the key. A rejected key would block AC1 for the common case with no CA. Unverified.
  Fix: either document the minimum provider version and check it in the Tester's prerequisites, or remove the dependency for the default path (for example put an always-present, ignored `certs` copy inside each build context, or use a repo-root context with per-Containerfile ignore files), and keep `additional_contexts` out of the non-CA path.
- M2. `compose.yaml#L52` (`DATABASE_URL`): the backend connects with `POSTGRES_USER`, the database superuser, so an SQL injection or app compromise has full DB rights (create roles, read all schemas). Already noted as security-review M3 and accepted for this local stack.
  Fix (follow-up task): add a migration that creates an `app` role with only `USAGE` on `"ico-env"` and DML on its tables, and use it in `DATABASE_URL`.
- M3. `Frontend/nginx.conf#L31`: the only response header is `X-Content-Type-Options`. No `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Content-Security-Policy`; the Express `X-Powered-By` header passes through `/api/` because the backend has no helmet.
  Fix: add `add_header X-Frame-Options DENY always;`, `Referrer-Policy no-referrer always;`, a CSP suited to the Angular build (test it, Angular needs inline styles), and `proxy_hide_header X-Powered-By;` in `location /api/`.

### Low
- L1. `compose.yaml` (all services): no `restart:` policy. A crashed backend or db stays down. Fix: `restart: unless-stopped` (or `on-failure`) on all services.
- L2. `compose.yaml` `db` service: no `cap_drop`/`no-new-privileges`; the image starts as root. Fix: `security_opt: ["no-new-privileges:true"]`, optionally `cap_drop: [ALL]` with `cap_add: [CHOWN, DAC_OVERRIDE, FOWNER, SETGID, SETUID]`; confirm with the Tester that init still works.
- L3. All three images are pinned by tag only, not by digest. Fix (optional): add `@sha256:` once the tags are pulled.
- L4. `compose.yaml#L55` vs `Backend/db/migrations/001..003`: the schema name `"ico-env"` is hard-coded in the SQL, but `DB_SCHEMA` is configurable through `.env`. Changing `DB_SCHEMA` breaks login with "relation does not exist". Fix: note in `.env.example` that `DB_SCHEMA` must stay `ico-env` for the init SQL, or fix the value in compose.
- L5. `.env.example`: if copied unchanged, the placeholder (`replace-with-generated-hex`) becomes a weak `JWT_SECRET` and DB password; nothing rejects it. Fix: add a startup check in the backend for minimum `JWT_SECRET` length (separate backend task) or state "do not use as is" next to the values.
- L6. `Backend/Containerfile` and `Frontend/Containerfile` CA block (`cat /tmp/certs/*.crt`): a certificate file without a trailing newline merges two PEM blocks into an invalid bundle. Fix: `for f in /tmp/certs/*.crt; do cat "$f"; echo; done > /tmp/extra-ca.pem`. Also note that `certs/README.md` says PEM only (correct).
- L7. FR16 names `update-ca-certificates`; the builder uses only `NODE_EXTRA_CA_CERTS` for `npm` (documented in `containers.md`). This is narrower trust and acceptable, but it is a documented deviation from the spec text; confirm with the spec owner or update the spec wording.
- L8. `Frontend/nginx.conf#L14`, `#L2`: logs go to `/dev/stdout`/`/dev/stderr` while nginx runs as `nginx`. Under rootless Podman the stdio pipe may not be writable by that uid (`open() "/dev/stdout" failed (13: Permission denied)`). Unverified; Tester should check `podman logs deskbooking-frontend-1` and that the container stays up.
- L9. Hardening not applied: no `read_only: true` root filesystem (backend needs no writable path; nginx only `/tmp`, which could be a `tmpfs`), and `frontend` has no `init: true` (not required for nginx). Optional.

## Required before merge
None blocking. Recommended: M1 (verify the provider supports `additional_contexts` during the first run, or remove the dependency), M3, L1. Commit the new files (`compose.yaml`, `.env.example`, Containerfiles, `.containerignore` files, `nginx.conf`, `certs/README.md`); `.env` stays untracked.

## For the Container Tester (unverified items)
Tags exist and pull; provider supports `additional_contexts`, `${VAR:?}`, YAML merge keys, `depends_on` `service_healthy`, `init`, `security_opt`; `podman inspect` shows empty proxy variables at runtime; image history shows no proxy `ARG` in the runtime images; nginx logs work as non-root; `/api/health` is 200 through port 4200 and 503 with `db` stopped; nothing listens on host 3000/5432.
