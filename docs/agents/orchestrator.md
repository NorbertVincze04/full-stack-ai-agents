# Orchestrator - context

Agent: `.github/agents/orchestrator.agent.md` | Skills: `start-task`, `clarify-task` | Replaces: Principle, Frontend, Backend, Container and Pipeline orchestrators.

Runs the three workflows, owns the retry loops and every human gate. History below is from the handovers in `docs/handover/` and reports in `docs/runs/`; everything before `manual-create-a-mockup-office-for-booking` ran under the legacy orchestrators.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (initial history from handovers)

## Tasks

| Task | Type | Source | Area | Outcome |
| --- | --- | --- | --- | --- |
| 601 initialize frontend and backend | feature (setup) | Azure | frontend, backend | `done` ([handover](../handover/601.md)) |
| 602 footer with copyright | feature | Azure | frontend | `done`, Azure state `Done` ([handover](../handover/602.md)) |
| header with app name and login button | feature | manual | frontend | `done` ([handover](../handover/manual-header-with-app-name-and-login-button.md)) |
| info page | feature | manual | frontend | `done` ([handover](../handover/manual-info-page.md)) |
| backend login endpoint | feature | manual | backend (+ migration) | `done` ([handover](../handover/manual-backend-login-endpoint.md)) |
| login and register pages | feature | manual | frontend, backend | `done` ([handover](../handover/manual-login-and-register-pages.md)) |
| 648 booking_calendar | feature | Azure | frontend, backend, database | `done`, Azure state `Done` ([handover](../handover/648.md)) |
| create a mockup office for booking | feature | manual | frontend, backend, database | handover written, not committed ([handover](../handover/manual-create-a-mockup-office-for-booking.md)); first task run on the 8-agent architecture |
| containerize the app with Podman | containers | manual | containers (+ backend, database prerequisites) | last test round 7: pass; no handover ([report](../runs/manual-containerize-the-app-with-podman/container-tests.md)) |
| add CI and CD pipelines | pipelines | manual | pipelines | `done` ([handover](../handover/manual-add-ci-and-cd-pipelines-with-github-actions.md)) |
| CI on dev push, then CD after CI success | pipelines (verification, docs) | manual | pipelines | `implemented`, AC5 needs a real Actions run ([handover](../handover/manual-ci-on-dev-push-then-cd-after-ci-success.md)) |
| 649 select/deselect | feature | Azure | frontend | tests 247/247, review code+ux approved (0 blocker/high, 1 medium); PR proposal pending ([reports](../runs/649/)) |
| 650 desk numbering | feature | Azure | frontend, backend, database | tests backend 306/308 (2 skipped), frontend 263/263; review code+ux approved (0 blocker/high, 2 medium); PR proposal pending ([reports](../runs/650/)) |
| manual-terms-services-page | feature | manual | frontend | tests 270/270, review code+ux approved (0 blocker/high/medium, 3 low); AC4 human-verified; e2e skipped (no runner); PR proposal pending ([reports](../runs/manual-terms-services-page/)) |
| manual-visible-password | feature | manual | frontend | tests 288/288, review code+ux approved (0 blocker/high, 1 medium, 5 low); AC7 and 320 px human-verified; e2e skipped (no runner); PR proposal pending ([reports](../runs/manual-visible-password/)) |
| manual-div-for-hero-section | feature | manual | frontend | tests 295/295, review ux approved (0 blocker/high/medium, 4 low); AC1/AC3 human-verified; e2e skipped (no runner); PR proposal pending ([reports](../runs/manual-div-for-hero-section/)) |
| manual-desk-labeling | defect (006 not applied locally) | manual | containers | local volume recreated, 16 desks A1-D4, AC4 human-verified ([report](../runs/manual-desk-labeling/containerize.md)); no code change |
| manual-shadow-borders | feature (CSS) | manual | frontend | tests 310/310, review ux+code approved (0 blocker/high, 2 medium, 7 low); AC4/AC5/AC8/AC9 human-verified; e2e skipped (no runner); PR proposal pending ([reports](../runs/manual-shadow-borders/)) |

## Defects and lessons

| Task | Decision |
| --- | --- |
| 601 | Accepted the open `high` Angular 18 advisories (H1) for the no-feature baseline; condition: no feature work on Angular 18 before the upgrade |
| backend login endpoint | Approved deviations: no `DROP` of `users` (D1), CORS `*` only outside production (D2), login rate limit (D3), new dependencies (R7) |
| login and register pages | Font Awesome replaced by an inline SVG (R5); skipped both commits |
| 648 | R1 JWT middleware and endpoints approved; R2 migrations human-applied; R3 personal data: safer alternative (store `user_id`, never the e-mail); skipped both commits |
| containerize | Approved environment fixes (compose provider, proxy path); D8 build-only host networking; D9 classic builder only; reran after a host `ng serve` held port 4200 |
| pipelines | R1 (first green CI auto-merges into `main`) and R2 (human changes repository settings) approved as documentation only; commit skipped for the CI-on-dev task |
| 649 | Q1 no-date state (desks neutral, Book Now disabled), Q2 no day on load, Q3 own day and own desk toggle selection only (no request); R1-R3 approved as described; e2e skipped (no runner), journeys listed in `e2e.md`; Azure tag missing, not changed |
| 650 | D1 delete and recreate all desks (human chose knowingly over the safer relabel; existing bookings lose their desk); R1/R2 approved as described (human applies migration 006 after pg_dump); D2 2x2 blocks, D3 labels only; Azure tag missing, ignored; e2e skipped (no runner) |
| manual-desk-labeling | Labels D01-D12 came from a db-data volume older than migration 006; R1/R2 approved (pg_dump first, `compose down -v`), agent applied locally; Cloud Foundry stays human-applied |
| manual-terms-services-page | D1 link in app header next to Help; D2 route /terms, label "Terms"; D3 h1 "Terms of Service"; D4 placeholder text marked not legal; no risks; no fix loops |
| manual-visible-password | D1 eye on login Password and both register fields, independent toggles; no risks; no fix loops; medium (identical accessible name on two register toggles) carried to PR |
| manual-div-for-hero-section | Hero = `.booking-layout`, 50/50, stack below 768px (container query on host, not viewport media query); no risks; no fix loops; first attempt discarded by the human and task reworded ("placeholder" removed) |
| manual-shadow-borders | Q1/Q2 conflict resolved as booking page plus shared header/footer; tokens in styles.css; no risks; no fix loops; mediums (header shadow under top bar, no padding in calendar/desk plan) carried to PR |
| header, info, 602 | Acceptance check passed (`human-accepted`); 602 needed fix iteration 1 first |

## Loops

- Review-fix loop: 602 (1 iteration), login and register pages (1 re-review round), CI-on-dev pipelines (1 round).
- 649: no test-fix or review-fix loop needed (specs were adapted by the Tester in the first test round).
- 650: no test-fix or review-fix loop needed; tdd red was red only in the backend (frontend already rendered the new ids).
- Test-fix loop: not needed in any handover. Containerization ran test rounds 0-7 (see [container-engineer.md](container-engineer.md)).
- Rules fixed 2026-11-16: the approval gate now always runs once (before, it was skipped when the spec was `Ready: yes` at first); agents may edit their own `docs/agents` file; red tests run before implementing (`workflow.tddFirst`).\n- Added 2026-11-20: `brief.md` (compact task summary read first by later stages) and `metrics.md` (one row per stage) under `docs/runs/<id>/`; neither has been used on a real task yet, so the token saving is an estimate (spec 649 is ~85 lines, a brief ~30).
- No handover records a task that exhausted `maxFixIterations`; `/clarify-task decision` is new and has not been used yet.

## Open items

- `/start-task`, `/clarify-task` and the other skills have not been run end to end except for the mockup task; expect adjustments.
- Several tasks ended with commits skipped by the human; their changes sit uncommitted on `main` or on feature branches (see [release-manager.md](release-manager.md)).
