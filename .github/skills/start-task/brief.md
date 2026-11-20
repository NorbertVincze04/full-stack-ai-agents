# Task brief (`docs/runs/<task-id>/brief.md`)

Written by the Orchestrator after the approval gate and kept current; read first by `implement`, `tdd`, `test`, `review`, `create-pr`, `containerize` and `ci-cd`. It replaces re-reading the whole spec. Keep it under ~40 lines, one line per item, no code, no copied paragraphs.

```markdown
# Brief - <task-id> <title>
Spec: docs/specs/<task-id>.md (open only the sections you need that are not here) | Source: azure|manual | Status: <status>
Area: <frontend, backend, ...> | Pipeline scope: <ci|cd|both|n/a>
Scope flags (yes only): ui-changes, logic-changes, ...
Limits: maxTestFixLoops <n>, maxFixIterations <n>, tdd <v>, tddFirst <v>, e2e <v>, security <v>, reviewers <v>
Approved risks: R1 <one line, exactly as approved> | none
Decisions: D1 <one line> | none

## Acceptance criteria
AC1: <one line>
...

## Read first
- docs/agents/<agent>.md, docs/context/project.md, docs/context/<area>.md
- API contract: <path of the implement report or spec section> | none

## Reports so far
| Stage | Report | Verdict |
| --- | --- | --- |
```

Update the `Reports so far` table and `Status` after every stage. Regenerate the acceptance criteria if the spec changes.
