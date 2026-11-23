# Reviewer - context

Agent: `.github/agents/reviewer.agent.md` | Skill: `review` (+ `checklists.md`) | Replaces: Frontend (UX, Code, Security), Backend (Code, Security), Container and Pipeline reviewers.

Scopes: `code`, `security`, `ux`, `containers`, `pipelines`. Dependency advisories: npm `critical` blocks, everything lower is a follow-up.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (manual-terms-services-page)

## Tasks

| Task | Scopes run | Verdict and findings |
| --- | --- | --- |
| 601 | backend code and security, frontend code, security, UX | No blocker; H1 Angular 18 advisories (high) accepted by the human; M1 `listen` error ignored |
| 602 | frontend UX, code, security | First pass: 2 high UX, 1 medium code; fixed in iteration 1, re-review approved; Angular advisories pre-existing |
| header | frontend UX, code, security | Approved; low findings only; security flagged the placeholder login for re-review with real auth |
| info page | frontend UX, code (security skipped by scope flags) | Approved; medium: no route `title`, missing `provideLocationMocks()`, stale doc count |
| backend login endpoint | backend code, security | Code: 1 medium, 6 low. Security: 3 medium (body-parser advisory, shared rate-limit bucket, CORS `*` guard only on exact `production`), 7 low |
| login and register pages | backend code, security; frontend code, UX, security | Backend approved (shared bucket, body-parser). Frontend approved after re-review 1; UX M1-M6 and no CSP/headers in nginx are follow-ups |
| 648 | all five | All approved: backend code 2 medium, security 2 medium (no rate limit, DELETE without window check); frontend UX 3 medium, code 2 medium (races) |
| create a mockup office | code, security, UX | 5 medium (date race, 12 px desk text at 320 px, no rate limit on desk routes, FK `NOT VALID`) and 9 low, details in [pr.md](../runs/manual-create-a-mockup-office-for-booking/pr.md) |
| containerize | containers (static, before the first build) | Approved: 0 blocker, 0 high, 3 medium, 9 low |
| add CI and CD pipelines | pipelines | 0 blocker, 0 high, 4 medium (M1 concurrency drops a pending promotion, M2 `GITHUB_TOKEN` cannot push workflow changes, M3 bot bypass plus dispatch, M4 Chrome `--no-sandbox`), 6 low |
| CI on dev, CD after CI | pipelines (twice) | Round 1: 1 high, 2 medium, 2 low, all fixed; re-review approved with 0 findings |
| 649 select/deselect | frontend code, UX (security skipped by scope flags) | Both approved. Code: 4 low (duplicate `selectedDesk` reset, `select`/`deselect` duplication, stale docs, no e2e runner). UX: 1 medium (no plan hint for signed-in user without a day), 2 low (picked own desk colour-only, no live region on `No date selected`) |
| 650 desk numbering | code (incl. destructive migrations 006), UX (security skipped by flags) | Both approved. Code: 1 medium (no lock/operator note for migration run), 4 low. UX: 1 medium (block gap via margins shrinks col 3 / row 3 desks), 2 low |
| manual-terms-services-page | frontend code, UX (security skipped by flags) | Both approved. Code: 2 low (no component spec, no route `title`). UX: 1 low (no active-link cue in header) |

## Defects and lessons

- Angular 18.2.x advisories in every frontend security review (same root cause, tracked in the 601 handover).
- No rate limit on new routes; `req.ip` behind nginx shares one bucket.
- No CSP or security headers in `Frontend/nginx.conf`.
- Frontend race conditions around in-flight booking requests.
- Stale test counts in `docs/context/*.md` after a task (again in 649: 145 vs 247, "specs pending").
- Layout spacing done with margins on grid items instead of grid tracks/gaps (650).
- Static routes (`info`, `terms`) lack a `title`; header links lack an active-route cue.
- Colour-only state cues and missing hints for disabled/neutral states in the booking UI.

## Open items

- 649: the `review` skill ran (code + ux); scope selection from the flags worked. No e2e runner exists (decision for the human, see `docs/runs/649/e2e.md`).
- 649 follow-ups: plan hint when signed in without a day (UX medium); refresh the counts and "pending" wording in `frontend.md` and `project.md`.

- 650 follow-ups: block gap through grid tracks; migration 006 run with backend stopped and idempotency verified by the human; stale counts.

## Notes for the new skill

- One call can cover several scopes; the report is `review-<scope>.md`; the `Review selection` records why a scope ran or was skipped.
- `containers` checklist is runtime-aware (Docker or Podman); `pipelines` checklist requires CI order security -> build -> test -> containers and `audit-level=critical`.
