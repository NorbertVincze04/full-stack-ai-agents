---
id: manual-backend-login-endpoint
source: manual
url:
title: Backend login endpoint
tags: []
status: specified
---

## Description
Add POST /api/auth/login to the backend. Users live in the PostgreSQL table "ico-env".users (id, full_name, email unique, password_hash bcrypt, type 'admin' or 'user', created_at). Recreate the users table (drop it first if it already exists). Return a JWT signed with JWT_SECRET. Allow CORS from any origin to simplify local testing.

## Acceptance Criteria
1. Valid email and password returns 200 with { success: true, payload: { token } }.
2. Wrong credentials return 401 with { success: false, message }.
3. Missing email or password returns 400 with errors[].
4. JWT_SECRET is read from the environment with no hard-coded default.
5. Unit tests cover all of the above without a real database.

## Open Questions
- "ico-env".users: it is unclear whether "ico-env" is a schema or the database name, and how the database connection (host, port, credentials) is configured.
- Dropping and recreating the users table is destructive: it is not specified in which environments this may run, or whether it is a one-off migration/script or runs at every backend start.
- The content of the 400 `errors[]` items (strings or objects with field and message) and whether the 400 response also contains `success: false` are not specified.
- JWT claims (e.g. id, email, type), expiry and signing algorithm are not specified.
- CORS from any origin is requested for local testing; it is not specified whether this must be restricted outside local environments.
- No seed data is specified for the recreated users table (e.g. an initial admin user), so there is no user to log in with.
- No tags were provided.
