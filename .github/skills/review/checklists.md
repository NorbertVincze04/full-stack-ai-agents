# Review checklists

## code - backend
Acceptance criteria met; layering routes -> controllers -> services -> repositories; input validation; HTTP codes and the `{ success, payload?, message?, errors? }` shape; async error handling; transactions and race conditions; consistency with existing patterns; typing; dead code; naming; query correctness against the migration; build result.

## code - frontend
Acceptance criteria met; RxJS subscriptions (unsubscribe or `async` pipe); change detection; typing (no needless `any`); module boundaries (`core`/`features`/`shared`); reuse of existing components and services; error handling; dead code; naming; duplication; lint/build result.

## security - backend
SQL built by concatenation; missing validation; missing auth/admin middleware on new routes; broken access control (IDOR); JWT handling and hard-coded fallbacks; password and secret storage; rate limiting; CORS; error messages leaking internals; logging of personal data; `child_process` usage. Dependencies: `npm audit --omit=dev` and `npm outdated` in `Backend/`, especially newly added packages.

## security - frontend
Secrets or tokens in code or environment files; sensitive data in `localStorage`, logs or URLs; XSS (`innerHTML`, `bypassSecurityTrust*`, unsanitised input); guard coverage on new routes; error messages leaking internals; over-fetching personal data; CORS/URL assumptions; open redirects. Dependencies: `npm audit --omit=dev` and `npm outdated` in `Frontend/`.

## ux
Consistency with shared components, layout wrappers and `docs/context/frontend.md`; spacing and typography; empty, loading, error and disabled states; form validation messages; keyboard navigation; labels and ARIA; contrast; responsive behaviour; navigation flow and route `data` (header/top bar).

## containers (Docker or Podman, see `container-runtime`)
- Images: pinned tags, fully qualified names from `containers.allowedRegistries`, multi-stage, minimal base, non-root user, no build tools in the final image, ignore files (`.containerignore` and `.dockerignore`, identical) exclude `.env`, `.git`, `node_modules`.
- Secrets: `.env` untracked and ignored (`git ls-files .env`, `git check-ignore .env`); no secrets in `ARG`/`ENV`/layers/compose files; `.env.example` has placeholders only; `certs/*.crt` and `db-backups/` ignored.
- Network: DB bound to loopback or not published; no unnecessary published ports; nginx `/api` proxy correct; security headers; no wildcard CORS.
- Reliability: healthchecks (in compose), `depends_on` with `service_healthy`, restart policy, named volume for the database.
- Proxy: proxy values only as build `ARG`, no credentials, `NO_PROXY` includes the service names, proxy blanked at runtime.
- Portability: no BuildKit-only or Podman-only features in the shared files (`# syntax=`, `RUN --mount`, heredocs, `additional_contexts`); runtime-specific parts isolated as described in `container-runtime`; `containers.runtime` and `docs/context/containers.md` match the files.
- Migrations: tracking table, idempotence, risky statements approved and marked `RISK`, backups git-ignored.
- Only `compose config --quiet` or `--no-interpolate`; never print interpolated config.

## pipelines
- Permissions: top-level read-only; `contents: write` only on the merge job; no `write-all`; no `pull_request_target` with untrusted checkout.
- Secrets: none hard-coded, no `secrets.*` without approval, nothing echoed, dummy test values only.
- Actions: official `actions/*` pinned to a major version or SHA; anything else was approved.
- Injection: no untrusted `${{ github.event.* }}` interpolated into `run:`; use `env:`.
- Triggers: CI on integration pushes and pull requests only; CD only via `workflow_run` of CI plus manual dispatch; no `schedule`; no self-triggering loop.
- CI order: security check -> build -> test -> container build; every check blocks (no `continue-on-error`); the audit blocks only on `critical`.
- CD: merges only the CI-tested SHA, requires successful CI, `--no-ff`, aborts on conflict, no force-push, no deletion; nothing is deployed, published, tagged or released.
- Reliability: `concurrency`, `timeout-minutes`, lockfile install, cache keys on lockfiles, correct working directories and script names; containers job builds only, `push: false`, no proxy or secrets.
- Docs: `docs/context/pipelines.md` matches the files; prerequisites (workflow permissions, branch protection) are stated.
