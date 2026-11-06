---
id: manual-login-and-register-pages
source: manual
url:
title: Login and register pages
tags: []
status: done
---

## Description
Setup login and register pages so users can create an account.

## Acceptance Criteria
1. User can login.
2. User can register if he doesn't have an account yet.
3. The user's name will appear instead of the login button (in the header).
4. An open door icon will appear on the right side of the user's name and work as a log out button.

## Open Questions
- The fields required to register (e.g. name, email, password) and their validation rules are not specified.
- Whether a backend register endpoint is in scope is not specified (only a login endpoint task exists: manual-backend-login-endpoint).
- The routes/URLs of the login and register pages are not specified.
- The behaviour after a successful login/register (redirect target) and after log out is not specified.
- Whether the logged-in state must persist across page reloads is not specified.
- No tags were provided.
