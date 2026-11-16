---
name: get-task
description: "Use when a task must be pulled from Azure DevOps (by ID, or listed with the project's tag filter) or created from manual text, and saved as docs/tasks/<task-id>.md. First stage of the standard workflow."
argument-hint: "<azure task id | list | manual task text | path to a task file>"
user-invocable: true
---

Agent: `Task Analyst`. If you are another agent, run this skill through a `Task Analyst` subagent.

# Get task
Resolve the source from the argument:
- a number -> Azure DevOps work item with that ID
- `list`, `next` or empty -> list candidate tasks
- a file path or free text -> manual task (`id: manual-<kebab-case-title>`, `source: manual`)

Read `.github/config.json` -> `azureDevOps` (organization, project, `taskFilter`, `doneState`) and the template and field mapping in `docs/task-ingestion.md`.

## Steps
1. If `docs/tasks/<task-id>.md` already exists with a `status` other than `new`, do not overwrite it: return its path and status so the workflow can resume.
2. **Azure, ID given**: fetch the full work item with the `ado` read tools.
3. **Azure, list**: if `project` is empty, list the projects and return them as an open question. Otherwise run the WIQL from `docs/task-ingestion.md` (project + tag filter, excluding closed states), return `id | title | state` and stop so the human can pick one.
4. **Manual**: use the text or file content as the description; extract an `Acceptance Criteria:` section if present.
5. Map the fields onto the task template (`id`, `title`, `description`, `acceptanceCriteria`, `tags`, `url`).
6. Write `docs/tasks/<task-id>.md` with `status: new`. Every field that could not be found goes under `Open Questions`; leave it empty, do not fill it in.
7. Return: task ID, file path, tags, open questions (or the candidate table in list mode).

## When it fails
- `ado` tools unavailable: report that the MCP server `ado` must be started (PAT prompt) and stop.
- Work item not found or no access: report the ID and the error, write nothing.
- No candidates match the filter: say so and show the filter used.
- No acceptance criteria anywhere: write the task with the field empty and an open question.

## Never
- Invent acceptance criteria, propose architecture, design UI or write code.
- Modify the work item (read-only) or print/log/write the Personal Access Token.
- Write anywhere except `docs/tasks/`.
