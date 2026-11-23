# Discovery: Desk Booking (agentic-desk-booking-app)

> Scanned: 2026-11-23 | Commit: c26b063220d68083e570ad0205f1410f31a5abe7 | Dirty: clean | Mode: existing | Scan: full
> Source of truth for facts (packages, routes, components, tables, commands, variables). Written by `Discovery Analyst`; read by `/spec`. Context files in `docs/context/` keep the per-area detail.

## Summary
| Item | Value | Evidence |
| --- | --- | --- |
| Purpose | Desk reservation web app: users register, log in, pick one of the next 4 bookable weekdays and a desk on an office plan, and book or withdraw. Admin features are target design only (`planned`) | docs/context/project.md, .github/docs/PROJECT_OVERVIEW.md |
| State | existing | scan (`projectState`) |
| Areas | Backend (`Backend/`, Express 5 API), Frontend (`Frontend/`, Angular 18 SPA), Database (SQL in `Backend/migrations`, `Backend/db/migrations`), Containers (`compose.yaml`), Pipelines (`.github/workflows`) | layout |
| README | Root `README.md` is a one-line title only (`# full-stack-ai-agents`, UTF-16); `Frontend/README.md` is the Angular CLI default. Purpose comes from the context files | README.md, Frontend/README.md |
| Target design | `.github/docs/PROJECT_OVERVIEW.md` describes more than exists (PrimeNG, admin, `query.ts`, security agent, Azure pipelines): not implemented here; context files win | .github/docs/PROJECT_OVERVIEW.md |

## Repository layout
| Path | Kind | Role | Files |
| --- | --- | --- | --- |
| Backend/src | source | Express API: routes, controllers, services, repositories, middleware, config | 24 |
| Backend/tests | tests | `node:test` suites | 16 |
| Backend/migrations | infra | SQL for schema `public` (applied by a human) | 5 |
| Backend/db/migrations | infra | SQL for schema `"ico-env"`, mounted into the `db` container | 6 |
| Frontend/src | source | Angular app (`app/core`, `app/features/{auth,booking,info,terms}`, `environments`, `testing`) | 67 |
| Frontend/nginx.conf, Frontend/Containerfile, Backend/Containerfile, compose.yaml | infra | container stack | 4 |
| .github/workflows | infra | GitHub Actions CI and CD | 4 |
| .github/agents, skills, docs, hooks, config.json | tooling | agent architecture | 37 |
| scripts | tooling | agent helper scripts (`.mjs`) | 5 |
| docs | docs | workflow docs, context, agents, tasks, specs, runs, handover | 182 |
| certs | config | proxy CA cert instructions (`*.crt` gitignored) | 1 |
| db-backups | data | local SQL dumps (gitignored) | 2 |

Totals: 382 files scanned, 90 code files (TypeScript 90 files / 9131 lines, JavaScript 6 / 569, CSS 8 / 568, SQL 11 / 336, HTML 9 / 336). Evidence: scan.

## Languages and tooling
| Language / tool | Version | Used for | Evidence |
| --- | --- | --- | --- |
| Node.js | >=22.18 (engines); images `node:22.18.0-alpine` | both areas, native TS execution in Backend | Backend/package.json, Frontend/package.json, Backend/Containerfile |
| TypeScript | Backend ^5.8.0, Frontend ~5.5.2 | source | Backend/package.json, Frontend/package.json |
| Backend TS config | `module nodenext`, `.ts` import extensions, `erasableSyntaxOnly`, `strict`, `rootDir src`, `outDir dist` | build with `tsc` | Backend/tsconfig.json |
| Angular | ^18.2.0, NgModule-based (`standalone: false`), builder `application` | SPA | Frontend/package.json, Frontend/angular.json |
| PostgreSQL | 16.9-alpine (container) | data store | compose.yaml |
| nginx | 1.28.0-alpine | serves SPA, proxies `/api/` | Frontend/Containerfile |
| Podman / Docker | runtime `podman` configured | containers | .github/config.json |

## Dependencies
### Backend/package.json
| Package | Version | Scope | Used for |
| --- | --- | --- | --- |
| bcryptjs | ^3.0.3 | runtime | password hashing |
| cors | ^2.8.5 | runtime | CORS |
| dotenv | ^16.4.5 | runtime | `.env` loading in `server.ts` |
| express | ^5.1.0 | runtime | HTTP server |
| express-rate-limit | ^8.7.2 | runtime | login and register limiters |
| jsonwebtoken | ^9.0.3 | runtime | JWT sign and verify |
| pg | ^8.23.1 | runtime | PostgreSQL pool |
| @types/cors, @types/express (^5.0.0), @types/jsonwebtoken, @types/node (^22.10.0), @types/pg | see manifest | dev | typings |
| tsx | ^4.19.0 | dev | `npm run dev` watch |
| typescript | ^5.8.0 | dev | `tsc` build |

### Frontend/package.json
| Package | Version | Scope | Used for |
| --- | --- | --- | --- |
| @angular/animations, common, compiler, core, forms, platform-browser, platform-browser-dynamic, router | ^18.2.0 | runtime | framework |
| rxjs | ~7.8.0 | runtime | streams |
| tslib | ^2.3.0 | runtime | TS helpers |
| zone.js | ~0.14.10 | runtime | change detection |
| @angular-devkit/build-angular | ^18.2.21 | dev | build and Karma builder |
| @angular/cli | ^18.2.21 | dev | `ng` |
| @angular/compiler-cli | ^18.2.0 | dev | compiler |
| @types/jasmine | ~5.1.0 | dev | typings |
| jasmine-core | ~5.2.0 | dev | tests |
| karma, karma-chrome-launcher, karma-coverage, karma-jasmine, karma-jasmine-html-reporter | ~6.4.0, ~3.2.0, ~2.2.0, ~5.1.0, ~2.1.0 | dev | test runner |
| typescript | ~5.5.2 | dev | compiler |

Lock files: Backend/package-lock.json, Frontend/package-lock.json.

## Commands
| Area | Command | Purpose | Evidence |
| --- | --- | --- | --- |
| Backend | `npm start` | `node src/server.ts` | Backend/package.json |
| Backend | `npm run dev` | `tsx watch src/server.ts` | Backend/package.json |
| Backend | `npm run build` | `tsc` | Backend/package.json |
| Backend | `npm test` | `node --test "tests/**/*.test.ts"` | Backend/package.json |
| Frontend | `npm start` / `npm run ng` | `ng serve` / `ng` | Frontend/package.json |
| Frontend | `npm run build` | `ng build` (output `dist/frontend`) | Frontend/package.json, Frontend/angular.json |
| Frontend | `npm run watch` | `ng build --watch --configuration development` | Frontend/package.json |
| Frontend | `npm test` | `ng test` (Karma, watch) | Frontend/package.json |
| Frontend | `npm run test:ci` | `ng test --watch=false --browsers=ChromeHeadless` | Frontend/package.json |
| Containers | `podman compose up -d --build` / `podman compose down` | start / stop stack (never `down -v`) | compose.yaml |
| Tooling | `node scripts/discovery-scan.mjs scan` / `stale` | discovery facts and freshness | scripts/discovery-scan.mjs |

## Implemented features
| Feature | Area | Status | Evidence |
| --- | --- | --- | --- |
| Login (email + password, JWT HS256, 8 h default expiry) | Backend, Frontend | implemented | Backend/src/services/authService.ts, Frontend/src/app/features/auth/login/login.component.ts |
| Registration (always creates type `user`, no auto sign-in in the UI) | Backend, Frontend | implemented | Backend/src/controllers/authController.ts, Frontend/src/app/core/auth.service.ts |
| Rate limiting (login 10 / 15 min failed only; register 10 / 1 h all) | Backend | implemented | Backend/src/middleware/loginRateLimit.ts, registerRateLimit.ts |
| Session handling (`sessionStorage` key `deskbooking.auth`, expiry timer, guest guard) | Frontend | implemented | Frontend/src/app/core/auth.service.ts, guest.guard.ts |
| Book / withdraw / list own bookings (one per user per date, 4 bookable weekdays) | Backend, Frontend | implemented | Backend/src/services/bookingService.ts, Frontend/src/app/features/booking/booking.component.ts |
| Desk list and per-date availability (booker name shown) | Backend, Frontend | implemented | Backend/src/services/deskService.ts, Frontend/src/app/features/booking/desk-plan/desk-plan.component.ts |
| Booking calendar (month grid, only bookable days enabled, select/deselect) | Frontend | implemented | Frontend/src/app/features/booking/calendar/calendar.component.ts |
| Health check with DB probe and timeout | Backend | implemented | Backend/src/controllers/healthController.ts |
| Header (app name, Help, Terms, Login or user name + logout) and footer | Frontend | implemented | Frontend/src/app/app.component.html |
| Info page (3-step how-it-works) and placeholder Terms page | Frontend | implemented | Frontend/src/app/features/info/info.component.html, terms/terms.component.html |
| Password visibility toggle on login and register | Frontend | implemented | Frontend/src/app/features/auth/login/login.component.ts (`showPassword`), login.password-toggle.spec.ts |
| Container stack (db, backend, frontend) | Containers | implemented | compose.yaml |
| CI per area, PR check, CD merge dev into main | Pipelines | implemented (run results not verified) | .github/workflows/*.yml |
| Admin management of bookings | Backend, Frontend | planned (user `type` column and `admin` value exist, no admin endpoint or UI) | .github/docs/PROJECT_OVERVIEW.md, Backend/migrations/001_create_users.sql |

## Interfaces
| Kind | Name | Auth | Evidence |
| --- | --- | --- | --- |
| API | `POST /api/auth/login` | public | Backend/src/routes/authRoutes.ts |
| API | `POST /api/auth/register` | public | Backend/src/routes/authRoutes.ts |
| API | `POST /api/bookings` (body `date`, `desk`) | Bearer JWT | Backend/src/routes/bookingRoutes.ts |
| API | `GET /api/bookings/mine` | Bearer JWT | Backend/src/routes/bookingRoutes.ts |
| API | `DELETE /api/bookings/:date` | Bearer JWT | Backend/src/routes/bookingRoutes.ts |
| API | `GET /api/desks` | public | Backend/src/routes/deskRoutes.ts |
| API | `GET /api/desks/availability?date=` | Bearer JWT | Backend/src/routes/deskRoutes.ts |
| API | `GET /api/health` | public | Backend/src/routes/healthRoutes.ts |
| UI route | `/` (booking page) | public view; booking needs login | Frontend/src/app/app-routing.module.ts |
| UI route | `/info` | public | Frontend/src/app/app-routing.module.ts |
| UI route | `/terms` | public | Frontend/src/app/app-routing.module.ts |
| UI route | `/login` | guest only (`guestGuard`) | Frontend/src/app/features/auth/auth-routing.module.ts |
| UI route | `/register` | guest only (`guestGuard`) | Frontend/src/app/features/auth/auth-routing.module.ts |

Response shape: `{ success, payload?, message?, errors? }` (`errors` entries `{ field, message }`). Status codes: login 200/400/401/429; register 201/400/409/429; book 201/400/401/409; withdraw 200/400/404; health 200/503. Evidence: Backend/src/controllers/*.ts, Backend/src/middleware/errorHandler.ts.
Bookable window: 4 weekdays starting today (or the next weekday), server-local date. Evidence: Backend/src/services/bookingDates.ts.

## Data
| Store | Object | Source | Evidence |
| --- | --- | --- | --- |
| PostgreSQL schema `public` | `users` (id uuid, full_name, email unique, password_hash, type admin/user, created_at) | Backend/migrations/001_create_users.sql | same |
| PostgreSQL schema `public` | `bookings` (id, user_id FK, booking_date, user_name, booking_desk FK, unique (booking_date, user_id), partial unique (booking_date, booking_desk)) | Backend/migrations/002, 003, 004 | same |
| PostgreSQL schema `public` | `desks` (id, label, grid_row, grid_col); 12 desks D01..D12 seeded by 004, replaced by 16 desks A1..D4 by 006 | Backend/migrations/004, 006_renumber_desks.sql | same |
| PostgreSQL schema `"ico-env"` | `schema_migrations`, `users`, `bookings` (reshaped to `user_id` by 004), `desks` (FK `NOT VALID`, A1..D4 after 006) | Backend/db/migrations/001..006_ico_env_*.sql | same |

Notes: numbering `005` is absent in `Backend/migrations` (jumps 004 to 006); `db/migrations` has 001..006. Migrations are applied by a human, never by the app; the `db` container runs `db/migrations` only on an empty data volume. Repositories pick `public.<table>` or `"<schema>".<table>` from `DB_SCHEMA` (Backend/src/repositories/*.ts). Whether the migrations are applied on any real database is `unknown`.

## Configuration
| Name | Where read | Default or required | Evidence |
| --- | --- | --- | --- |
| JWT_SECRET | authService, authenticate, server | required | Backend/src/server.ts |
| DATABASE_URL | server | required | Backend/src/server.ts |
| DB_SCHEMA | server (`parseDbSchema`) | default `public` | Backend/src/config/dbSchema.ts |
| PORT | server | default 3000 | Backend/src/server.ts |
| CORS_ORIGIN | app | default `http://localhost:4200`; `*` rejected when `NODE_ENV=production` | Backend/src/app.ts |
| NODE_ENV | app | optional | Backend/src/app.ts |
| JWT_EXPIRES_IN | authService | default `8h` | Backend/src/services/authService.ts |
| LOGIN_RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_WINDOW_MS | loginRateLimit | defaults 10, 900000 | Backend/src/middleware/loginRateLimit.ts |
| REGISTER_RATE_LIMIT_MAX, REGISTER_RATE_LIMIT_WINDOW_MS | registerRateLimit | defaults 10, 3600000 | Backend/src/middleware/registerRateLimit.ts |
| COMPOSE_PROJECT_NAME, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, FRONTEND_PORT, BUILD_HTTP_PROXY, BUILD_HTTPS_PROXY, BUILD_NO_PROXY | compose | POSTGRES_USER, POSTGRES_PASSWORD, JWT_SECRET required; POSTGRES_DB default `deskbooking`, FRONTEND_PORT default 4200, DB_SCHEMA default `ico-env` in compose | compose.yaml, .env.example |
| Frontend `environment.apiUrl` | build-time | dev `http://localhost:3000/api`; prod `/api` | Frontend/src/environments/environment.ts, environment.prod.ts |

Variable names only; `.env` was not opened.

## Tests
| Area | Framework | Location | Count | Command |
| --- | --- | --- | --- | --- |
| Backend | `node:test` (native TS) | Backend/tests | 16 files (app, auth, authenticate, bookingDates, bookingRepository, bookingService, bookings.api, deskRepository, desks.api, desksMigrations, desksRenumber, health.extra, health.schema, login.acceptance, register, server) | `npm test` |
| Frontend | Jasmine + Karma (ChromeHeadless in CI) | Frontend/src/**/*.spec.ts, helper `app/testing/auth-test-utils.ts` | 20 spec files | `npm run test:ci` |

Per-test-case counts were not collected. Evidence: scan (`tests.files`), Backend/package.json, Frontend/package.json.

## Build, CI/CD and containers
| Item | What it does | Evidence |
| --- | --- | --- |
| compose.yaml | project `deskbooking`; `db` (postgres 16.9-alpine, volume `db-data`, mounts `Backend/db/migrations`), `backend` (internal, healthcheck `/api/health`), `frontend` (published `127.0.0.1:${FRONTEND_PORT:-4200}` to 8080); `cap_drop ALL`, `no-new-privileges`; runtime proxy vars blanked, build proxy via args | compose.yaml |
| Backend/Containerfile | multi-stage node 22.18 alpine; `npm ci --omit=dev`; runs as `node` with `node src/server.ts`; port 3000 | Backend/Containerfile |
| Frontend/Containerfile, nginx.conf | node build then nginx 1.28 as `nginx` user on 8080; `/api/` proxied to `backend:3000`; SPA fallback; `X-Forwarded-For` cleared | Frontend/Containerfile, Frontend/nginx.conf |
| ci-backend.yml | on push to `dev` and PRs into `dev`/`main` (path-filtered): `npm ci`, `npm audit --omit=dev --audit-level=critical`, build, test, then `docker build` (no push) | .github/workflows/ci-backend.yml |
| ci-frontend.yml | same for Frontend with `npm run test:ci` | .github/workflows/ci-frontend.yml |
| ci-pr-check.yml | PR rules: into `main` only from `dev`; into `dev` only from `task/*`; title `<id>: <title>`; description >= 20 chars; blocks `.env`, key/cert files, `db-backups/` | .github/workflows/ci-pr-check.yml |
| cd.yml | after both area CIs succeed on `dev` (or manual dispatch from `dev`): merge the tested commit into `main`; merge only, no deployment | .github/workflows/cd.yml, .github/config.json |

## Conventions
- Backend layering routes -> controllers -> services -> repositories; factories `createX(deps)`; repositories injected through `createApp(options)` with `unconfigured*` fallbacks. Evidence: Backend/src/app.ts.
- Errors: domain error classes in services mapped to HTTP codes in controllers; body shape `{ success, ... }`. Evidence: Backend/src/services/bookingService.ts.
- SQL is parameterised; schema name validated by `parseDbSchema` before being quoted into table names. Evidence: Backend/src/repositories/userRepository.ts.
- Frontend: NgModule with lazy-loaded feature modules; `AuthService` and API services are `providedIn: 'root'`. Evidence: Frontend/src/app/app-routing.module.ts.
- Migrations are idempotent SQL, applied by a human only; destructive ones are guarded and need a `pg_dump` first. Evidence: Backend/migrations/006_renumber_desks.sql.
- Branches: `task/*` into `dev`, `dev` into `main`; `.env`, `db-backups/`, `*.crt` are gitignored. Evidence: .github/workflows/ci-pr-check.yml, .gitignore.

## Not found
- No linter or formatter config (ESLint, Prettier) in either area; no `lint` script.
- No end-to-end test runner (Playwright, Cypress); `ng e2e` is only the CLI default text.
- No HTTP test library such as supertest; API tests inject fake repositories into `createApp`.
- No admin endpoints or UI; `type='admin'` is stored but not used for authorization.
- No DB migration runner; migrations are applied by hand.
- No UI component library (PrimeNG is only in the target design document).
- No `Backend/query.ts`, `write-ca.ts`, `entrypoint.sh`, `azure-pipelines.yml` (named in `.github/docs/PROJECT_OVERVIEW.md`).
- No deployment workflow; CD only merges branches.
- No password reset, email verification or logout endpoint (logout is client-side).
- Test run and CI run results are not recorded in the repo.

## Context files
| File | Area | Status |
| --- | --- | --- |
| docs/context/project.md | project | present |
| docs/context/backend.md | Backend | present |
| docs/context/frontend.md | Frontend | present |
| docs/context/containers.md | containers | present |
| docs/context/pipelines.md | pipelines | present |

## Update log
| Date | Commit | Mode | Sections touched |
| --- | --- | --- | --- |
| 2026-11-23 | c26b063 | existing, full scan | all |
