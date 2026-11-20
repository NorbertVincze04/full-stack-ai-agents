# Run metrics (`docs/runs/<task-id>/metrics.md`)

Written by the Orchestrator, one row after every stage, so optimizations rest on data instead of guesses. Keep it under ~40 lines.

```markdown
# Metrics - <task-id>
| Stage | Agent | Verdict | Rounds | Note |
| --- | --- | --- | --- | --- |
| spec | Task Analyst | ready | 2 | 1 clarification round |
| tdd red | Tester | red-ready | 1 | 3 deferred-to-green |
| test | Tester | pass | 2 | 1 fix round: <failing test, cause> |
| review | Reviewer | approved | 1 | code, ux; security skipped |

Totals: stages <n> | subagent calls <n> | human questions <n> | test-fix rounds <n> | review retries <n> | blocked/needs-human <n>
Context size: `node scripts/context-size.mjs <task-id>` (estimated tokens per file)
```

`Rounds` counts how often the stage ran (fix rounds and retries included). `Note` names what failed and why, or the shortcut used (skipped scopes, cached result). Time is not recorded here (the agent has no clock): read it from the chat debug logs when needed.
