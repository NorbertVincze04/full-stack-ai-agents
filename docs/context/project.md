# Project context

Desk reservation web app: employees pick a date and a desk and book it; admins manage bookings. Full target design: `.github/docs/PROJECT_OVERVIEW.md` (not yet implemented). Read it only for the part a task touches.

## Current state

| Area | State |
| --- | --- |
| Backend | Express 5: CORS + JSON, `POST /api/auth/login` (bcrypt + JWT, rate limited), `pg` access to `public.users`. See `backend.md`. |
| Frontend | Angular 18 NgModule shell: header (app name link + placeholder Login button), empty router outlet, footer. No pages, services or API calls. See `frontend.md`. |
| Database | PostgreSQL database `ico-env` (schema `public`), reachable only through a Cloud Foundry tunnel. `users` migration written (`Backend/migrations/001_create_users.sql`), applied by a human; `bookings` not started. |

## Cross-cutting conventions

- Node >= 22.18, npm, one `package.json` per area (`Backend/`, `Frontend/`).
- API response shape (target): `{ success: boolean, payload?, message?, errors? }`.
- Backend dev port 3000, frontend dev port 4200; backend CORS allows `http://localhost:4200` by default.
- Workflow artifacts live in `docs/` (`tasks`, `specs`, `runs`, `handover`); see `docs/workflow.md`.

