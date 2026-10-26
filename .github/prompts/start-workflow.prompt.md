---
description: "Start the AI workflow for a task: give an Azure DevOps task ID, 'list' to see tasks matching the tag filter, or paste a manual task."
argument-hint: "<azure task id | list | manual task text>"
agent: "Principle Orchestrator"
---
Start the workflow for: ${input:task:Azure task ID, list, or manual task description}

Optional flags I may add in the request: "run frontend tests", "run security check", "stop after spec".
