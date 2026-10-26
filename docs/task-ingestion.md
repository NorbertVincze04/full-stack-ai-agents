# Task ingestion

Rules used by the `Task Ingestion` agent to turn a work item (Azure DevOps or manual) into `docs/tasks/<task-id>.md`.

## Task template

```markdown
---
id: <task-id>
source: azure | manual
url: <work item url or empty>
title: <title>
tags: [<tag>, ...]
status: new
---

## Description
<text>

## Acceptance Criteria
<text or empty>

## Open Questions
- <field that could not be found>
```

`status` lifecycle: `new` -> `specified` -> `in-progress` -> `implemented` -> `done` (set by `Handover`).

## Azure DevOps field mapping

| Template field | Source |
| --- | --- |
| `id` | `System.Id` |
| `title` | `System.Title` |
| `description` | `System.Description` (HTML converted to Markdown) |
| `acceptanceCriteria` | `Microsoft.VSTS.Common.AcceptanceCriteria`, otherwise an "Acceptance Criteria:" section inside the description |
| `tags` | `System.Tags` (split on `;`) |
| `url` | `_links.html.href` |

## Listing candidates

Configuration lives in `.github/config.json` -> `azureDevOps`. Candidates are selected with WIQL:

```sql
SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = '<project>'
  AND [System.Tags] CONTAINS '<taskFilter.value>'
  AND [System.State] <> 'Closed' AND [System.State] <> 'Done' AND [System.State] <> 'Removed'
ORDER BY [System.ChangedDate] DESC
```

If `project` is empty, list projects and ask the human which one to use.

## Manual tasks

When the human supplies the task text directly (or a path to a file), the agent uses `id: manual-<kebab-case-title>` and `source: manual`.

## Secure access

The `ado` MCP server is defined in `.vscode/mcp.json`. The Personal Access Token is requested through a password input (stored encrypted by VS Code), passed to `scripts/ado-mcp.mjs` as an environment variable and never written to disk. Required PAT scope: **Work Items (Read & Write)** (write is only used by `Handover` to mark the task done).
