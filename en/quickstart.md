# Your first tracked change

## Connect your native agent

1. Open the trusted project. Contextory prepares every detected supported native agent when Auto-connect is on.
2. For manual setup, click the agent footer control or run Contextory: Connect Native Codex, Contextory: Connect Native Claude Code or Contextory: Connect Native IBM Bob.
3. Review the generated workspace configuration and approve MCP/hooks through the native client. Reload or reopen that session when requested.
4. Ask the agent to call contextory_workspace_get and contextory_context_get. A green footer light records observed MCP traffic in the current service.

![Contextory sidebar with request progress and native agent controls.](../assets/companion-sidebar.png)

Contextory sidebar captured from the application; records are examples.

> A configured bridge or an Extension Host restart does not grant native hook trust. The light reports traffic, not agent sign-in or successful execution of every hook.

## Configure one meaningful check

Open Preferences: Open Workspace Settings (JSON). Add a recipe for an existing project command. The example suits a project that uses Node’s built-in test runner; adapt its executable, arguments and timeout to your project.

Workspace check recipe

```json
{
  "contextory.checks": [{
    "id": "unit", "name": "Unit tests",
    "executable": "node", "args": ["--test"], "timeoutMs": 120000
  }]
}
```

Recipes execute trusted workspace code with an executable and argument array. MCP calls select the recipe by ID and do not supply arbitrary shell commands.

## Implement and complete a specification

Example request for native chat

```text
Use Contextory to track this change: add retry handling to checkout. Recover earlier decisions, create milestones and specs with acceptance criteria, inspect the affected source, record findings and decisions, run our configured checks and explicitly complete each verified spec.
```

1. Review the request and acceptance criteria in Requests. The agent attaches its session and claims a specification lease before recording implementation work.
2. Inspect the changes, findings, decisions and check results under the selected specification.
3. The agent submits an outcome with evidence for every criterion, then calls contextory_spec_change with action=complete and the returned revision.
4. Confirm completed status. A submission alone leaves work open. Export the request report to review the durable record.

![Request list beside the selected specification.](../assets/panel-requests.png)

Requests in a horizontal editor Panel.

[Resolve an open or submitted spec](troubleshooting.md)

## Sources

- src/core/workflow.ts
- src/providers/registration.ts
- src/agents/instructions.ts
- package.json
- tests/core/workflow.test.ts

