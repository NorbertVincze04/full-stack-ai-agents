# Implement frontend - manual-terms-services-page

Verdict: done

## Acceptance criteria
- AC1/AC2: lazy `TermsModule` -> `TermsComponent` at `/terms`: `<h1>Terms of Service</h1>` and a paragraph saying it is placeholder text and not legal text.
- AC3: `<a routerLink="/terms">Terms</a>` in `.header-actions` after Help, before Login/user name.
- AC4: real anchor with `routerLink` (client-side navigation); existing `.header-actions a` and `header a:focus-visible` styles apply.
- AC5: no change to existing header/footer code beyond the added link.
- AC6: specs are the Tester's; `terms-route.spec.ts` passes unchanged.

## Files changed
- Frontend/src/app/features/terms/ (new: component ts/html/css, module, routing module)
- Frontend/src/app/app-routing.module.ts (route `terms`)
- Frontend/src/app/app.component.html (link)
- docs/context/frontend.md, docs/context/project.md, docs/agents/implementer.md

## Dependencies
None. API contract: none.

## Commands
- `npm run build` (Frontend): pass
- `npm run test:ci` (Frontend): 269/269 pass

## Known gaps
None.
