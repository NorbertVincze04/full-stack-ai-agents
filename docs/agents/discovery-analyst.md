# Discovery Analyst - context

Agent: `.github/agents/discovery-analyst.agent.md` | Skills: `discover`, `discover-update` | Script: `scripts/discovery-scan.mjs`.

Builds `docs/discovery.md` (the verified fact base read by `/spec`) with one full scan, then keeps it current by sections. Template: `.github/skills/discover/template.md`. Settings: `.github/config.json` -> `discovery`.

> Read this file first instead of re-reading old reports. Update it at the end of every scan or update (rules: `docs/context/README.md`, Agent context files). Keep it under ~80 lines.
> Updated: 2026-11-23 (agent created, no scan run yet)

## Tasks

| Date | Mode | Commit | Result |
| --- | --- | --- | --- |
| - | - | - | No scan has run yet: run `/discover` to create `docs/discovery.md` |

## Defects and lessons

| What | Resolution |
| --- | --- |
| - | - |

## Open items

- Run `/discover` once for this repository (existing project) to create `docs/discovery.md`.
