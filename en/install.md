# Installation and upgrades

## Check your environment

| Requirement | Purpose |
| --- | --- |
| Windows; trusted local project folders | Qualified editor environment, including up to 16 non-nested folders |
| VS Code 1.96+ or IBM Bob | Extension host; published checks used VS Code 1.145.3 and Bob API 1.126.0 |
| Node.js 24+ | Runs the isolated service with node:sqlite |
| A separately installed native agent | Codex, Claude Code or IBM Bob chat and authentication |
| Python 3.10+ (optional) | Parses Python source and source flow |

Check installed runtimes

```powershell
node --version
python --version
```

## Install the VSIX

1. Download contextory-workspace-0.7.0.vsix and its .sha256 file from the v0.7.0 release.
2. Compare the downloaded package checksum with the release checksum.
3. In Extensions, open the … menu, select Install from VSIX… and choose the downloaded file. Reload if prompted.
4. Open a trusted local project and choose Contextory in the activity bar. The initial workspace has no requests.

[Download version 0.7.0](https://github.com/igormicadei/Contextory/releases/tag/v0.7.0)

Verify and install the release package

```powershell
(Get-FileHash -Algorithm SHA256 .\contextory-workspace-0.7.0.vsix).Hash.ToLowerInvariant()
Get-Content .\contextory-workspace-0.7.0.sha256
code --install-extension .\contextory-workspace-0.7.0.vsix
```

End users do not need npm, Rust, a database server or an embedding model. Install and sign in to the native agent through its own interface. Restart the editor after installing Node if its PATH has not refreshed.

## Upgrade, disconnect or uninstall

- To upgrade the same extension identity, install the newer VSIX, reload the editor and reload the native MCP session. Existing project records stay in editor-managed storage.
- To remove a bridge, click its green footer control or run Contextory: Disconnect an Agent. Only owned entries are removed. Use the command for a configured bridge whose light is gray.
- Before uninstalling, disconnect agents and back up the project ledger. Uninstall through Extensions; remove storage only after retaining the records you need.
- Older builds under the previous product identity keep records in their original storage; automatic import is unavailable. Disconnect the old build before replacing it.

[Storage and configuration reference](reference.md)

## Sources

- package.json
- src/extension.ts
- src/providers/registration.ts
- src/providers/clients.ts

