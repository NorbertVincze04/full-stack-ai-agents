# discovery.md template

Fixed headings, in this order. Do not rename or reorder them: `scripts/discovery-scan.mjs stale` maps changed files to these headings and `discover-update` rewrites them one by one. Keep the file under about 250 lines: tables and one-line entries, no code listings, no history, no secrets (variable names only, never values).

## Rules for every row

- Every fact has an `Evidence` path (file, optionally `:line`). A fact without evidence does not go into the file.
- Status words: `implemented` (code exists and is reachable), `partial` (exists but incomplete, say what is missing), `planned` (only in docs or intent, no code), `unknown` (could not be verified).
- What was not found is stated under `## Not found`, so a later agent does not guess it.
- Versions come from manifests, not from memory.

## Skeleton

```markdown
# Discovery: <project name>

> Scanned: <YYYY-MM-DD> | Commit: <scan git.head or none> | Dirty: <scan git.dirty> | Mode: new | existing | Scan: full | update
> Source of truth for facts (packages, routes, components, tables, commands, variables). Written by `Discovery Analyst`; read by `/spec`. Context files in `docs/context/` keep the per-area detail.

## Summary
| Item | Value | Evidence |
| --- | --- | --- |
| Purpose | one line | README.md |
| State | new (nothing implemented) / existing | scan |
| Areas | list of areas and their folders | layout |

## Repository layout
| Path | Kind (source, tests, config, docs, infra, tooling) | Role | Files |
| --- | --- | --- | --- |

## Languages and tooling
| Language / tool | Version | Used for | Evidence |
| --- | --- | --- | --- |

## Dependencies
One table per manifest (`### <path>`).
| Package | Version | Scope (runtime / dev) | Used for |
| --- | --- | --- | --- |

## Commands
| Area | Command | Purpose | Evidence |
| --- | --- | --- | --- |

## Implemented features
| Feature | Area | Status | Evidence |
| --- | --- | --- | --- |

## Interfaces
API endpoints, UI routes, CLI commands, events: whatever the project exposes.
| Kind | Name (method + path, route, command) | Auth | Evidence |
| --- | --- | --- | --- |

## Data
| Store | Object (table, collection) | Source (migration, schema file) | Evidence |
| --- | --- | --- | --- |

## Configuration
Variable names only.
| Name | Where read | Default or required | Evidence |
| --- | --- | --- | --- |

## Tests
| Area | Framework | Location | Count | Command |
| --- | --- | --- | --- | --- |

## Build, CI/CD and containers
| Item | What it does | Evidence |
| --- | --- | --- |

## Conventions
One line each: layering, naming, error shape, formatting, branch rules found in the repo.

## Not found
One line each: what an agent could assume but the repo does not have (no auth, no lint config, no e2e runner, no CI, ...).

## Context files
| File | Area | Status (present / seeded from discovery / missing) |
| --- | --- | --- |

## Update log
| Date | Commit | Mode | Sections touched |
| --- | --- | --- | --- |
```

## Mode `new` (no code yet)

Fill `Summary`, `Languages and tooling`, `Dependencies`, `Implemented features`, `Interfaces` only with what the human or the docs declare and mark every row `planned` with the document or the human answer as evidence. `Implemented features` stays empty ("none: nothing implemented"). `Not found` lists everything that does not exist yet. Never present planned items as present.

## Context files seeding (mode `existing`, only when a file is missing)

Create `docs/context/project.md` and `docs/context/<area>.md` with the template of `docs/context/README.md` (Template), filled from discovery. Never overwrite or edit an existing context file: its owner skill keeps it current.
