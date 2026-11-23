---
name: discover
description: "Use to scan a repository once and write docs/discovery.md: dependencies, languages, structure, what is implemented, interfaces, data, tests, CI and containers. Works for a new project (planned items only) and an existing one (whole repo read once); seeds missing context files. The spec stage uses discovery.md so agents do not invent facts. Run it when the agent architecture is added to a repo."
argument-hint: "[auto | new | existing] [refresh] [intent: <purpose and planned stack, for a new project>]"
user-invocable: true
---

Agent: `Discovery Analyst`. If you are another agent, run this skill through a `Discovery Analyst` subagent.

# Get task
Read `docs/agents/discovery-analyst.md` first (past scans, gaps), then `.github/config.json` -> `discovery` (`file`, default `docs/discovery.md`). Check whether the discovery file exists:
- It exists and the argument has no `refresh`: stop, return `Verdict: exists` with its `Scanned` line and tell the caller to use `discover-update` (small changes) or `/discover refresh` (new full scan). The whole repo is scanned once, not on every task.
- Otherwise run `node scripts/discovery-scan.mjs scan` once. It returns facts only (tree, languages, manifests with dependencies and scripts, containers, CI, env variable names, migrations, tests, entry-point candidates, `projectState`). Read the output instead of walking the folders yourself. Without `execute`, return `blocked`.
Mode: the argument, else `projectState` from the scan (`new` or `existing`). Template and rules: [template.md](./template.md); read it before writing.

## Steps
1. **Scan** as above. Keep the JSON in your head, do not paste it into the file.
2. **Read the code once** (mode `existing`): open `README`, the manifests the scan lists, entry points, route/controller/component/service files, migrations, config files, test folders, container and CI files. Read each file at most once, group the reads by area, skip generated, vendored and lock files. Everything you write needs an `Evidence` path from a file you saw or the scan.
3. **Mode `new`**: no code to read. Use `intent:`, `README`, `.github/docs/*` and any planning document; every row you take from them is `planned`. If the intent is missing and the caller cannot supply it, return `Verdict: needs-human` with the questions (purpose, language, framework, data store, deployment) instead of guessing.
4. **Write the file** `docs/discovery.md` exactly per the template headings. Header line: `> Scanned: <date> | Commit: <scan git.head or none> | Dirty: <scan git.dirty> | Mode: <mode> | Scan: full` (`Dirty` is the fingerprint of uncommitted files, `clean` if none; the stale check needs it). Fill `Not found` deliberately: absent auth, absent lint, absent e2e runner, no CI, and so on.
5. **Context files** (mode `existing`): for each area with source code that has no `docs/context/<area>.md`, and for `docs/context/project.md` if missing, create it from discovery (template in `docs/context/README.md`); list it in `Context files` as `seeded from discovery`. Never edit an existing context file. Area names: those in `docs/context/README.md` and `.github/config.json`; otherwise the top-level folder name in lower case plus a row in the README table.
6. **Verify** before returning: every dependency, command, route and variable named in the file appears in the scan output or in a file you read; contradictions between README and code are written as `unknown` or `partial` with both evidences, not resolved by guessing. Run `node scripts/discovery-scan.mjs stale`: it must answer `fresh` (the script ignores `docs/discovery.md`, `docs/context/`, `docs/agents/` and the agent setup files).
7. **Update context**: update `docs/agents/discovery-analyst.md` per `docs/context/README.md` (Agent context files): add this scan's row (date, mode, commit, size), lessons, refresh `Open items`.
8. Return: `Verdict: done | needs-human | exists | blocked`, mode, `docs/discovery.md` path, counts (files scanned, dependencies, features, interfaces), context files seeded, items under `Not found`, questions for the human (new project).

## When it fails
- No `execute` tool or no Node: return `blocked`; do not build the file from guesses.
- Not a git repository: write `Commit: none`; `discover-update` then rescans the sections that the caller names.
- Very large repository (the scan reports more than about 2000 files): scan the areas the caller names first, say in `Summary` which areas are not covered yet, and return that as an open item.
- README and code disagree: record both, mark `unknown`, add it to `Open items`.

## Never
- Edit source code, tests, `.github/` or any context file that already exists; run git write commands or any command other than `node scripts/discovery-scan.mjs`, read-only git and file reads.
- Write secrets: variable names only, never values from `.env` or code. Do not open `.env` (only `.env.example`).
- Record a fact without evidence, or a planned item as implemented.
- Rescan the whole repo when the file already exists and `refresh` was not requested.
