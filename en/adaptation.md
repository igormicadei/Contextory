# Clients, CLI and integration

## Understand each client adapter

| Client | MCP configuration | Skills / hooks |
| --- | --- | --- |
| Codex | .codex/config.toml | .agents/skills; .codex/hooks.json |
| Claude Code | .mcp.json | .claude/skills; .claude/settings.local.json |
| IBM Bob | .bob/mcp.json | .bob/skills; .bob/settings.json |
| Generic MCP | .contextory/mcp.json | .contextory/skills export; no hooks |

Connect through the extension commands. Contextory writes owned workspace-local entries and preserves unrelated settings. Malformed, linked or unowned conflicts fail without replacement. Native clients retain authentication, model selection, editing, permissions and trust. Hooks supply lifecycle reminders, metadata and pending approval decisions.

Native hooks enforce pending approval decisions before implementation and Stop, in addition to lifecycle reminders and normalized metadata. Agents may auto-approve only implementation maintenance/conflicts; process/outcome conflicts wait for human Approvals. Enforcement requires the host to trust and invoke the updated hooks.

## Use another MCP client

1. Run Contextory: Export Generic MCP Connection in the selected project.
2. Import its server entry into your client and copy the exported codebase, workflow and migration skill folders into that client’s supported discovery location.
3. Approve/reload through that client and make a read-only workspace/context call. .contextory/skills is an export location, not universal automatic discovery.

![Contextory sidebar with request progress and native agent controls.](../assets/companion-sidebar.png)

Contextory sidebar captured from the application; records are examples.

## Run without an editor

Packaged standalone commands

```powershell
node dist/contextory.mjs help
node dist/contextory.mjs index --root C:/Projects/Checkout
node dist/contextory.mjs context "payment retries" --root C:/Projects/Checkout --budget 3000
node dist/contextory.mjs mcp --root C:/Projects/Checkout
```

Use Node.js 24+ with the packaged dist directory. For stdio MCP configure node with arguments ["/absolute/path/dist/contextory.mjs", "mcp", "--root", "/absolute/project"]. The server remains alive until EOF/signals. Source inspection parses project files and does not execute them; configured checks execute only when explicitly requested.

> Standalone records default to <root>/.contextory-local/service and form a separate ledger. To share editor records, use --descriptor with the generic descriptor exported by the running editor and the matching --root. Back up whichever ledger you actually use.

## Install optional documentation guidance

The generated .documentation/integrations/contextory bundle contains this bilingual documentation snapshot, use/develop guidance and a read-only query MCP. It is separate from Contextory’s operational MCP and its codebase/workflow/migration skills.

Preview explicit installation into a chosen consumer workspace

```powershell
python .documentation/integrations/contextory/install.py --workspace C:/Projects/Consumer --client codex --dry-run
```

Remove --dry-run only for the explicitly selected consumer project. Supported clients are codex, claude and bob. Installing the extension or importing a package does not silently activate this optional documentation integration. Its queries read the installed snapshot; they do not control Contextory.

## Sources

- src/providers/clients.ts
- src/cli.ts
- src/providers/registration.ts
- skills/contextory-codebase/SKILL.md
- skills/contextory-workflow/SKILL.md
- skills/contextory-migrate/SKILL.md
- tests/integration/headless.test.ts
- src/hooks/approval.ts
- src/hooks/launcher.ts
- src/knowledge/catalog.ts
- src/core/workflow.ts
- tests/integration/approval-policy.test.ts

