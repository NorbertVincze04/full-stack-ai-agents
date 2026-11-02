---
id: manual-containerize-the-app-with-podman
source: manual
url:
title: Containerize the app with Podman
tags: []
status: specified
---

## Description
Create containers for frontend, backend and PostgreSQL, started together from one compose file with `podman compose up -d --build`. Credentials live in a gitignored .env. The backend connects to the db container, and the tables users and bookings (schema "ico-env") are created in it automatically. Add GET /api/health on the backend that checks the DB connection. I am behind the Bosch proxy.

## Acceptance Criteria
1. One command starts frontend, backend and db.
2. http://localhost:4200 loads the app and /api reaches the backend.
3. GET /api/health returns 200 only when the database answers.
4. Tables users and bookings exist in the db container, created by the agents.
5. .env holds all credentials and is not tracked by git.

## Open Questions
- The Bosch proxy requirement is not specified (proxy URL, whether it applies to image pulls, build-time npm install, or both, and whether credentials are needed).
- The columns of the `bookings` table are not specified (the existing `users` table is in migrations/001_create_users.sql).
- Whether the `ico-env` schema applies to `users` as well, given the existing migration, is not stated.
- The response body of GET /api/health (and status code when the DB is down, e.g. 503) is not specified.
- No tags were provided.
