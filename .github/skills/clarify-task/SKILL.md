---
name: clarify-task
description: "Use when the human must answer the open questions of a spec (mode spec), or decide how to continue after a test or review loop ran out of retries (mode decision). Asks the human, records the answer in the spec, and hands control back."
argument-hint: "<task-id> [spec | decision]"
user-invocable: true
---

Agent: `Orchestrator` (the only agent that talks to the human). If you are a subagent, return `needs-human` with the questions instead of asking.

# Get task
Read `docs/specs/<task-id>.md` (`Open Questions`, `Risk gate`) and, for mode `decision`, the report paths of the failed stage that the caller passed (`docs/runs/<task-id>/`). Default mode: `spec` while the spec has `Ready: no`, otherwise `decision`.

## Steps
**Mode spec**
1. Take the numbered questions returned by `/spec` (with their suggested options).
2. Ask the human, at most 4 questions per call, with the options (mark the recommended one) and free text allowed. Ask only what is still open.
3. Pass the answers to `Task Analyst` `/spec <task-id> answers: ...`.
4. If `Ready: no` again, repeat. Maximum 3 rounds, then ask how to proceed (accept the listed assumptions, edit the spec manually, stop).
5. When `Ready: yes`, show the spec path, `Area` and acceptance criteria, then ask for approval to implement (approve, stop here, edit the spec first). For every `Risk gate` item ask separately: approve as described, use the safer alternative, skip it. Keep the approved ones as `approved-risks`.

**Mode decision**
1. Show what failed: stage, root cause, what was tried, retries used, report paths.
2. Ask one question with 2-4 options plus free text: accept with the open findings, change the spec or acceptance criteria, try a different approach, the human fixes it manually, stop.
3. Record it through `Task Analyst` `/spec <task-id> decision: ...`.
4. Return the decision to the caller; the retry counters of the items concerned restart. Maximum 3 decision rounds per task, then stop and report.

## When it fails
- The human gives no usable answer: ask once more with narrower options, then stop and report what is still open.
- An answer contradicts the risk gate or widens the area: treat it as a new risky item and ask it separately.
- `Task Analyst` returns questions that were already answered: pass the earlier answers again instead of asking twice.

## Never
- Decide for the human, approve a risk on their behalf, or pick the recommended option silently.
- Ask the same question twice or more than 4 questions in one call.
- Edit the spec yourself; it is changed only through `/spec`.
- Continue to implementation while a blocking question or an unapproved risk is open.
