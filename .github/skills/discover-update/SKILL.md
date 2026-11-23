---
name: discover-update
description: "Use to keep docs/discovery.md current without rescanning the repo: checks what changed since the scanned commit and rewrites only the affected sections. Called by the Orchestrator before the spec stage and after changes made outside the workflow. Inner skill, not a slash command."
argument-hint: "[check | sections: <names> | paths: <files>]"
user-invocable: false
---

Agent: `Discovery Analyst`. If you are another agent, run this skill through a `Discovery Analyst` subagent.

# Get task
Run `node scripts/discovery-scan.mjs stale`. It answers `missing`, `no-git`, `fresh` or `stale` with `changed` (path and git status) and `sections` (the headings of `docs/discovery.md` to refresh) and `fullRescanRecommended`. Template and heading rules: `.github/skills/discover/template.md`. Read `docs/agents/discovery-analyst.md` first. Without `execute`, return `blocked`.

## Steps
1. `missing`: return `Verdict: missing` (the caller runs `/discover`; do not create the file here). `fresh`: return `Verdict: fresh`, nothing is written.
2. `stale` with `fullRescanRecommended: true`: return `Verdict: needs-full-scan` with the reason and the changed count; the human decides on `/discover refresh`.
3. `stale` or `no-git`: refresh only the listed `sections`, or the ones in the argument (`sections:`, or `paths:` mapped by the same rules). Open only the changed files and what they reference; for removed files delete their rows, for added files add rows, for changed files re-verify the rows that cite them. Do not touch other sections.
4. Re-run the verification of `discover` step 6 for the rows you touched (evidence path for each, `Not found` kept accurate: remove an entry when the thing now exists).
5. Update the header (`Scanned` date, `Commit` = `head` and `Dirty` = `dirty` from the stale output, `Scan: update`) and add one row to `Update log` (keep at most 10 rows; merge the oldest into one `Earlier` row). Check the `Context files` table: a missing context file of a touched area is only reported, not edited.
6. **Update context**: update `docs/agents/discovery-analyst.md` per `docs/context/README.md` (Agent context files): one row for this update, lessons, `Open items`. Skip it for `fresh`.
7. Return: `Verdict: fresh | updated | missing | needs-full-scan | blocked`, sections refreshed, files read, rows added/removed/changed, context files that look outdated (names only).

## When it fails
- The scanned commit is unknown to git (history rewritten, shallow clone): return `needs-full-scan`.
- The changed files cannot be mapped to a section: refresh `Repository layout` and `Summary`, and say so.

## Never
- Rewrite the whole file, rescan the repo, or edit anything except `docs/discovery.md` and `docs/agents/discovery-analyst.md`.
- Write a fact without evidence, or touch source code, tests, `.github/` or context files.
