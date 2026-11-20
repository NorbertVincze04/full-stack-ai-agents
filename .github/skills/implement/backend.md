# Backend area (used by `implement backend`)

`Backend/`: Node.js, Express 5, TypeScript ESM; layers routes -> controllers -> services -> repositories. Current map: `docs/context/backend.md`.

- Implement routes, controllers, services, repositories, validation, middleware (auth, admin, rate limit) and error handling with correct HTTP status codes.
- Keep the response shape `{ success, payload?, message?, errors? }`.
- Config comes from `src/config` (environment); never hard-code secrets. Parameterised queries only. Schema changes belong to the `database` annex.
- Risk gate: auth, JWT, passwords, permissions, CORS and behaviour of existing endpoints only if in `approved-risks`.
- The API contract (method, path, auth, request, response, errors) goes into the implement report: the frontend and the Tester read it.
- `npm run build` in `Backend/`; tests are the Tester's.
