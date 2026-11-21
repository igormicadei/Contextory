# Contextory

## Project memory for native agents

Contextory connects requests, specifications, source code, decisions and verification evidence in a local project ledger. Work in the native Codex, Claude Code or IBM Bob chat, then use Contextory to recover what was requested, what changed and why.

This guide describes Contextory 0.7.0, a preview qualified on Windows with trusted local folders in VS Code and IBM Bob. The extension needs Node.js 24+. Python 3.10+ is optional for Python analysis. Your agent supplies its own account, model and conversation.

[Install Contextory](install.md)

[Complete your first tracked change](quickstart.md)

## Find your next step

| Goal | Guide |
| --- | --- |
| Connect an agent and configure checks | Quickstart and installation |
| Understand the daily interface | User guide and walkthroughs |
| Inspect code or compare repositories | Code intelligence and advanced usage |
| Integrate another client | Adaptation, CLI and MCP API |
| Build or improve Contextory | Contributing and architecture |

[Explore the interface](walkthroughs.md)

[Read MCP contracts](api.md)

## From request to verified result

1. Describe an authorized change in native chat. Recover earlier decisions and inspect current source.
2. Review a request split into milestones and specifications with clear acceptance criteria.
3. Keep findings, decisions and independent check results attached to each specification.
4. Confirm explicit completion and export a report that explains the final result.

[Write a useful implementation outcome](outcomes.md)

## Sources

- package.json
- src/extension.ts
- src/service/server.ts
- src/providers/clients.ts

