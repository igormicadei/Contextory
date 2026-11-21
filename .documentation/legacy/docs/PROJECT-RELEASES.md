# Project versions, changelog and Git tags

Contextory manages versions for the whole connected Git repository. Release records have no request parent or specification lease. A version can include commits and decisions from several requests, manual work and other tools.

## Automatic observation

While the editor or headless service runs, a debounced watcher observes Git HEAD/index/refs and version metadata. A 30-second poll covers packed refs, linked worktrees and custom version files; queries also refresh Git state. Observation imports locally present stable SemVer tags across branches and their exact commit membership, tracks unreleased commits on the current branch and retains immutable ledger revisions. Work done while Contextory was closed is reconciled on the next observation. It never installs Git hooks or changes Git configuration. Fetch remote tags using the project's normal Git workflow when they are not available locally.

The current version comes from configured version files (npm package and lock metadata by default), then the latest reachable stable tag, then `initialVersion`. Unreleased commits are those reachable from HEAD and absent from the highest stable version tag's history. Each imported version uses the highest lower stable version tag that is its ancestor as its base. A release's own generated version commit is included in its final membership. Tags are local observations until a managed publication is verified; a moved or missing historical tag raises a coverage warning while the original mapping stays retained.

Conventional Commit `feat` recommends minor, `!` or `BREAKING CHANGE` recommends major, and other commits recommend patch. This is a heuristic for review. This first implementation supports stable `major.minor.patch`, not prereleases/build metadata or independent monorepo package releases. History is bounded at 1000 tags and 10000 commits per interval with explicit errors; shallow history blocks release preparation.

## Prepare, apply and publish

Open **Versions** in the Contextory sidebar or panel. Choose an automatic/explicit bump or an exact version, then **Prepare release plan**. Preparation requires a clean worktree/index, a branch and the repository root; it records HEAD, branch, configuration, remote identity, exact commits, ledger cutoff and complete before/after version/changelog edits without changing project files.

Review the plan, then select **Create version commit and tag**. Contextory validates the saved inputs, writes/stages only the planned files, honors native Git hooks/signing, creates one dedicated version commit and an annotated immutable tag. It verifies commit parent, changed paths and contents before accepting/tagging it. Unexpected hook changes are reported for inspection; Contextory never resets or deletes that work. Prepare a new plan when inputs change; an untouched failed plan can be cancelled.

**Publish tag to origin** is a separate explicit action. It uses the configured Git push destination and existing Git authentication, checks remote tag identity, pushes only that tag (and required commit objects), then verifies it. Branch refs are not pushed. GitHub works as an ordinary authenticated Git remote; this creates the GitHub tag, not a GitHub Release object, uploaded assets or a Pages deployment. Existing CI workflows triggered by tag pushes still run according to the repository's configuration.

The controller serializes operations and takes a repository lock. Intent and results are journaled in SQLite before/after external effects. Retrying the same operation ID and input returns/reconciles the original operation. After a crash or hook/network failure, inspect the record and use **Recover interrupted release** at its current revision. Recovery accepts only the plan's exact partial files/index, owned release commit and tag. Publish recovery accepts an already matching remote tag and rejects conflicts or destination changes. It never force-pushes, overwrites tags, stages the whole repository, rewrites history or erases unrelated edits.

## Global changelog and documentation

The generated changelog preserves existing content and adds exact commit hashes/subjects plus decisions, definitions, features/rules, findings, requests/specifications and outcomes recorded since the preceding managed release cutoff. The first managed release includes the earlier ledger history. Every semantic entry retains its record ID, revision and state; later changes do not rewrite prior release snapshots. Page `contextory_entity_get` for full immutable definitions or export them for documentation.

Ledger interval association is labeled separately from Git inclusion: a decision recorded in that interval is not proof its behavior shipped in those commits. Previously unmanaged tags supply Git membership without fabricated semantic history. The generated version commit is recorded as a member after creation; its own hash cannot be embedded in its changelog contents.

`contextory_version_get` exposes current status/history and paginated commits/semantic entries for a selected `releaseId`. `contextory_project_export` overview includes cached version status; records/revisions/history expose all retained plans, membership, changelogs and operation events. Native agents can use these datasets to generate version notes, decision histories or application documentation without a new implementation request.

## Configuration

Optional tracked `contextory.release.json`:

```json
{
  "schemaVersion": 1,
  "initialVersion": "0.0.0",
  "tagPrefix": "v",
  "remote": "origin",
  "branch": "main",
  "changelogPath": "CHANGELOG.md",
  "versionFiles": [
    { "path": "package.json", "format": "json", "keys": [["version"]] },
    {
      "path": "src/version.ts",
      "format": "text",
      "prefix": "export const version = \"",
      "suffix": "\";"
    }
  ]
}
```

Omit `versionFiles` for automatic `package.json` / optional `package-lock.json` root and root-package version updates. Projects without npm metadata default to a tracked `contextory.version.json`. Explicit adapters must list every version field that should change, including lock metadata where relevant. JSON edits preserve surrounding formatting; text adapters require one exact current-version marker. Version files must agree before release. Files/config/changelog must be distinct ordinary files inside the repository; symlinks, traversals and private Git/storage paths are rejected. New files need an existing parent directory.

Configure the intended remote before preparing a plan when publication is needed: its push identity is bound to the plan. A local-only plan can be applied without a remote; adding/changing a destination later does not authorize publication of that plan. Commit bodies stored with membership are bounded at 8000 characters and flag truncation; breaking-change detection reads the complete available Git message.

## CLI and MCP automation

```powershell
node dist/contextory.mjs versions
node dist/contextory.mjs release-prepare minor --operation prepare-unique-id
node dist/contextory.mjs release-apply REL-example 1 --operation apply-unique-id
# Inspect the returned current revision before the next action:
node dist/contextory.mjs release-publish REL-example 4 --operation publish-unique-id
node dist/contextory.mjs versions REL-example --offset 0 --limit 20
```

Use actual returned IDs/revisions. `release-recover` and `release-cancel` take the same ID/revision arguments. Use `--descriptor` to attach to the editor service so CLI, UI and agents share the same ledger; otherwise the CLI uses its standard workspace-local headless storage. Reuse the operation ID and exact input after an uncertain result. An existing service can be attached by automation/CI; these commands do not require an agent, request or lease. A CLI service exits after its command; keep `mcp` or an editor service running for continuous observation. Ignore `.contextory-local/` in Git if using workspace-local storage.

MCP offers `contextory_version_get`, `contextory_release_prepare` and `contextory_release_change` with identical behavior. Hook credentials cannot execute them. Native release permissions still apply; implementing a release feature does not itself authorize releasing the current repository.
