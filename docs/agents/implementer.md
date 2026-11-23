# Implementer - context

Agent: `.github/agents/implementer.agent.md` | Skill: `implement` (+ `database.md`) | Replaces: Frontend Builder, Backend Builder, Database Builder, Database Migrator.

Stack: Angular 18 NgModule + RxJS (`Frontend/`), Express 5 + TypeScript ESM (`Backend/`), PostgreSQL schema `"ico-env"`. Current state of each area: `docs/context/frontend.md`, `backend.md`.

> Read this file first instead of re-reading old reports. Update it at the end of every task (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-16 (task 649 added)

## Tasks

| Task | Area | Delivered |
| --- | --- | --- |
| 601 | frontend, backend | Angular 18 workspace (NgModule, routing, CSS); Express 5 backend (`createApp()`, `server.ts` printing `hello world`, `dotenv`, `cors`); scripts and `.env.example` |
| 602 | frontend | `<footer>` with runtime year in `AppComponent`, sticky layout (flex column, `100dvh`), `html, body { margin: 0 }` |
| header with app name and login button | frontend | Static `<header>` before `<main>`: `<h1><a routerLink="/">` and a placeholder `Login` button, same palette as the footer |
| info page | frontend | Lazy `InfoModule` on `/info` ("How it works", three steps) and a `Help` link in the header |
| backend login endpoint | backend, database | `POST /api/auth/login` (bcrypt, HS256 JWT, rate limit, fail-fast config, error handler); migration `001_create_users.sql`; no `DROP`, no seed |
| login and register pages | frontend, backend | Lazy `AuthModule` (`/login`, `/register`), `AuthService` with `sessionStorage`, `guestGuard`, header user name and SVG logout, `environment*.ts`; `POST /api/auth/register`, `registerRateLimit`, `payload.user` on login |
| 648 booking_calendar | frontend, backend, database | Lazy `BookingModule` (calendar, top bar, `BookingService`); `authenticate` middleware and `/api/bookings` (POST, DELETE, GET `/mine`); migrations `002` (public) and `004` (`"ico-env"`) |
| containerize (prerequisites) | backend, database | `/api/health` backed by `SELECT 1`; init migrations `001_ico_env_schema`, `002_ico_env_users`, `003_ico_env_bookings`; `DB_SCHEMA` support |
| create a mockup office for booking | frontend, backend, database | `DeskPlanComponent` (12 desks, 4 x 3), `GET /api/desks`, `GET /api/desks/availability`, `desk` required on `POST /api/bookings`; local migration `005_ico_env_desks.sql` (applied to the local container after a `pg_dump` backup) and Cloud Foundry `004_create_desks_and_booking_desk.sql` (human applies) |
| 649 select/deselect | frontend | Toggle on calendar days and desks (`dateDeselected`/`deskDeselected` outputs), no day selected on load, `No date selected` state with disabled `Book Now` and neutral desks, own desk (`yours`) selectable with `pressed` flag; no API change |
| 650 desk numbering | backend, database, frontend | Migrations `006` (public and `"ico-env"`): guarded NULL-out of `booking_desk`, delete desks, insert A1..D4; no source change, not applied. Frontend: `block-left-edge`/`block-top-edge` spacing classes in `DeskPlanComponent` separate the 2 x 2 blocks (CSS only, labels only) |
| manual-terms-services-page | frontend | Lazy `TermsModule` on `/terms` (h1 "Terms of Service", placeholder text) and a `Terms` header link after Help; reused header styles; 269 specs and build green |

## Defects and lessons

| Task | Defect (found by) | Fix |
| --- | --- | --- |
| 602 | Default 8 px body margin caused overflow and an inset footer (UX review, 2 high) | `html, body { margin: 0 }`; plus 1 medium code finding fixed in the same round |
| login and register pages | Header did not wrap on narrow screens (UX H1) | Header wraps on narrow screens |
| login and register pages | Auth chunk loaded outside `/login` and `/register` (code review) | Matcher route loads `AuthModule` only on those paths |
| ci-on-dev (docs) | False "dev pushed" claim and missing enablement order in `pipelines.md` (pipeline review, 1 high) | Corrected by the pipeline builder, see [pipeline-engineer.md](pipeline-engineer.md) |

## Open items

- Angular 18.2.x `npm audit` advisories (4 high, 4 moderate, 0 critical); upgrade task not created yet ([601 handover](../handover/601.md)).
- Backend: `server.ts` logs `hello world` even if `listen` fails; `PORT` not validated; body-parser advisory GHSA-27r3-jxmh-p828; no rate limit on `/api/bookings` and `/api/desks`.
- Booking: date race in `toggleBooking()`, malformed-JSON 400 before 401, server-local timezone for the window.
- Rate-limit buckets use `req.ip`; behind nginx all clients share one bucket (needs forwarded IP and `trust proxy`).
- `public.bookings` / `desks` migrations for Cloud Foundry are applied by the human, never by an agent.

## Notes for the new skill

- `implement` does not write tests; the Tester owns them. Under the legacy builders the same rule applied.
- Applying migrations to the local `db` container is now part of `implement database` (was Database Migrator).
