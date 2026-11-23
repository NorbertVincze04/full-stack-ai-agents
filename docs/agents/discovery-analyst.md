# Discovery Analyst - context

Agent: `.github/agents/discovery-analyst.agent.md` | Skills: `discover`, `discover-update` | Script: `scripts/discovery-scan.mjs`.

Builds `docs/discovery.md` (the verified fact base read by `/spec`) with one full scan, then keeps it current by sections. Template: `.github/skills/discover/template.md`. Settings: `.github/config.json` -> `discovery`.

> Read this file first instead of re-reading old reports. Update it at the end of every scan or update (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (first full scan)

## Tasks

| Date | Mode | Commit | Result |
| --- | --- | --- | --- |
| 2026-11-23 | existing, full | c26b063 | `docs/discovery.md` created (~190 lines): 382 files, 36 dependencies, 14 feature rows (13 implemented, 1 planned), 13 interfaces; `stale` = fresh; no context files seeded (all 5 present) |

## Defects and lessons

| What | Resolution |
| --- | --- |
| Root `README.md` is UTF-16 and unreadable with the file reader | Read with `Get-Content -Encoding Unicode`; it holds only a title, so purpose comes from `docs/context/project.md` |
| `.github/docs/PROJECT_OVERVIEW.md` is target design, not current state | Used only for `planned` rows and `Not found` items; context files and code win |
| `Backend/migrations` has no `005` (004 then 006) while `db/migrations` has 001..006 | Recorded as a note under `Data`, not treated as an error |

## Open items

- Migration state on the real databases (`public`, Cloud Foundry) is `unknown`; only a human can confirm.
- Per-test-case counts and CI run results are not recorded; only test file counts.
- Next updates: use `discover-update` (by section); `/discover refresh` only after more than 50 changed files.
