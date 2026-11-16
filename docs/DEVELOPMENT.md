# Develop and release Contextory

For 0.3.0 code intelligence, see the [implementation plan](CODEBASE-INTELLIGENCE-PLAN.md) and [runtime/configuration guide](CODEBASE-INTELLIGENCE.md). Build also emits `dist/codebase-worker.mjs`, `dist/python-index.py` and `dist/contextory.mjs`. Canonical portable resources live in `skills/`; `npm run skills:package` generates their TypeScript bundle and `npm run skills:check` rejects drift. `npm run check` includes that drift check. `npm run evaluate:codebase` produces a repeatable retrieval/relationship/freshness report in `artifacts/codebase-evaluation.json`. Preview now also serves `/architecture.html`.

Headless CLI/MCP uses `.contextory-local/service` by default or an explicit storage path; it can attach to the editor's generic descriptor to share its ledger. This is an intentional addition to the development-cache-only use of `.contextory-local` in older builds. Back up the standalone service directory when it contains authoritative work records.

## Maintain agent instructions

Edit portable behavior in `skills/` and shared runtime guidance in `src/agents/instructions.ts`. Native/headless MCP initialization and workspace briefs use the same full instructions; lifecycle hooks use shared compact retrieval/completion reminders. Per-tool descriptions in `src/contracts/tools.ts` explain selection and input/coverage semantics. Host discovery, paths and output formats belong in `src/providers/clients.ts`.

Run `npm run skills:sync` after editing canonical skills. It regenerates the runtime bundle and updates both skills plus their references in `.agents/skills`, `.claude/skills`, `.bob/skills` and `.contextory/skills`, leaving MCP/hook configuration untouched. All resources are preflighted together; unowned files and linked ancestors are preserved by refusing the sync. `npm run skills:workspace-check` detects missing or changed local copies. These copies are workspace-local; a fresh clone needs sync before this optional workspace check, whereas `npm run check` only requires canonical bundle consistency.

The repository's `AGENTS.md` links to canonical skills; `CLAUDE.md` imports it. These developer entry files are excluded from the distributable. Installed extensions provide the portable resources and shared MCP instructions for the target project. Do not impose this repository's development commands or source paths on other projects. Generic clients install the exported folders into their own supported discovery location; hooks are optional.

## Set up

Use Node.js 24+ and npm. Python 3.10+ is needed for the Python analysis tests. Windows is the currently qualified host.

```powershell
git clone https://github.com/igormicadei/Contextory.git
cd Contextory
npm ci
npx playwright install chromium
npm run check
```

`check` runs TypeScript checking, production bundles, core/analysis/integration tests, and Playwright UI tests. The optional real-model test is skipped unless its embedding profile has been prepared; all lexical/workflow tests work without it. Existing validation includes a successful run with the real model.

## Build and inspect

| Command                    | Purpose                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Build the extension, webview, service, MCP/hook launchers, analysis worker, and packaged Python parser. |
| `npm run watch`            | Watch the production bundle entry points.                                                               |
| `npm run preview`          | Serve fixture-backed UI at `http://127.0.0.1:4317`.                                                     |
| `npm run typecheck`        | Check TypeScript without emitting output.                                                               |
| `npm test`                 | Run the core, source-analysis, and integration suite.                                                   |
| `npm run test:ui`          | Run the browser UI suite.                                                                               |
| `npm run prepare:semantic` | Download the pinned optional local model/runtime into `.contextory-local/embeddings`.                   |
| `npm run benchmark`        | Run the bounded source/workflow/search fixture benchmark.                                               |
| `npm run icons:render`     | Render the committed vector artwork into the 256-pixel package icon and size preview.                   |
| `npm run package:vsix`     | Build, regenerate dependency notices, and package the VSIX into `artifacts/`.                           |

Preview surfaces are `/sidebar.html`, `/flow.html`, `/relationships.html`, and `/architecture.html`. Add `?theme=light`, `?theme=custom`, `?theme=high-contrast`, or `?theme=high-contrast-light`. The sample palettes and records are test fixtures, excluded from the VSIX; actual webviews receive live theme tokens from the editor.

The shared monochrome icon source is `media/contextory.svg`. Color extension artwork is `media/contextory-icon.svg`, and its generated `media/contextory-icon.png` is committed so package builds do not need a browser.

## Debug and test editor hosts

F5 uses the **Contextory Companion** launch configuration. Its prelaunch task builds and prepares an isolated, pinned VS Code runtime/profile under `.contextory-local`. It does not install native agent extensions or copy user authentication into that profile.

```powershell
npm run test:host
```

For an installed Bob editor, provide its executable:

```powershell
$taskBob = Join-Path $env:LOCALAPPDATA 'Programs\IBM Bob\IBM Bob.exe'
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/host-smoke.ps1 -HostName bob -Executable $taskBob
```

The host test uses a unique disposable workspace and user/extensions directories. It validates activation, commands, the external service, provider configuration, Python/TS flow, overlays, relationship panels, request reports, and persistent records. Inactive fixtures with the exact Codex and Claude extension IDs verify automatic discovery before opening Contextory, without activating a native agent. The Bob host must additionally prepare its own bridge. Pause/resume must persist without changing existing MCP bytes. Add `-StartPaused` to verify a fresh workspace creates no provider configuration until resumed.

It writes `artifacts/host-vscode.json` or `artifacts/host-bob.json`, or a filename matching a custom `-HostName`. To test a package, extract the VSIX ZIP into a fresh `.contextory-local` directory and pass the extracted `extension` directory through `-ExtensionPath`.

Host tests and protocol fixtures do not drive an authenticated model conversation. Qualify the actual native agent trust/reload and end-to-end chat workflow separately before claiming it in release notes. See the [validation record](VALIDATION.md).

## Package contents and storage

The VSIX includes runtime bundles, the Python parser, icons, styles, dependency notices, and documentation. It excludes tests, source maps, screenshots, models, development caches, and node_modules. Runtime dependencies are bundled by esbuild. End users need external Node 24+, and Python only for Python analysis.

Project records are stored in editor-managed global storage. Standalone CLI/MCP records live in `.contextory-local/service` by default; back up that directory if it contains authoritative records. Other `.contextory-local` directories contain development caches and fixtures. The directory is ignored by Git and excluded from packages. VSIX binaries are GitHub release assets, not committed repository files. Checksums and validation evidence are kept under `artifacts/`.

## Build and publish the documentation

The complete searchable documentation is published at [igormicadei.github.io/Contextory](https://igormicadei.github.io/Contextory/). The site includes every Markdown guide and release note in `docs/`, both canonical skills and their references, the README and changelog. VitePress supplies local full-text search, responsive navigation, dark mode and code highlighting; Mermaid renders the architecture diagrams.

Run `npm run docs:build` to stage canonical Markdown in `.contextory-local/docs-content`, build into `.contextory-local/docs-site` and check generated page/asset links. Run `npm run docs:preview` to inspect the built site locally; use the printed URL with the `/Contextory/` base path. The landing page and site navigation live in `docs-site/`; edit guides in their original locations, not the generated staging directory. Repository source links point to the matching release tag. The generated `documentation.json` lists all included pages.

`.github/workflows/documentation.yml` builds on relevant pushes to `main` or manual dispatch and publishes static files to `gh-pages`. The branch starts with an independent root commit and contains only the generated site; subsequent deployments preserve that branch's history. GitHub Pages is configured to deploy from the branch root. A `.nojekyll` file keeps generated assets intact. The GitHub Actions deployment token has repository contents write access only in the publication job. This workflow is excluded from the VSIX.

## Release process

1. Confirm that the intended source changes and documentation are complete. Update `package.json`, the root package entries in `package-lock.json`, and `src/contracts/model.ts` together when incrementing the version. Update the package script/output filename, versioned download links, changelog, and validation record.
2. Run the checks appropriate to the changes. Reuse already completed checks only when the tested code is unchanged. Record skipped tests and remaining qualification limits accurately.
3. Run `npm run package:vsix`. Inspect the ZIP manifest and assets, and run both editor-host checks against the extracted package when qualifying a release.
4. Calculate the SHA-256 checksum of the **final** package and write `artifacts/contextory-workspace-<version>.sha256` in `<hash>  <filename>` format. Rebuilds can change the ZIP bytes, so refresh the checksum after every final rebuild.
5. Commit the source/docs/evidence, push the release commit to the intended branch, and create an annotated `v<version>` tag at that commit. Never replace an existing published tag without a deliberate release correction.
6. Create the GitHub release with the matching VSIX and checksum attached. For example, after committing and pushing version 0.3.1:

   ```powershell
   gh release create v0.3.1 artifacts/contextory-workspace-0.3.1.vsix artifacts/contextory-workspace-0.3.1.sha256 --repo igormicadei/Contextory --verify-tag --title 'Contextory v0.3.1' --notes-file docs/releases/v0.3.1.md
   ```

7. Run `npm run release:verify` to verify the published tag, downloaded VSIX/checksum bytes, orphan `gh-pages` history, live Pages configuration and complete documentation manifest against this checkout. Keep the local final package available for comparison.

Use a notes file so Markdown/newlines survive shell quoting. Release notes should explain user-facing behavior, installation, qualification, and material upgrade limitations. Packaging does not publish to the VS Code Marketplace; that is a separate distribution process. The existing `UNLICENSED` designation is preserved until the owner chooses a license.
