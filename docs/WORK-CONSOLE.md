# Work console and connection recovery

The work console starts with the current specification and a compact request queue. Open a request to see one plan at a time. Its brief and export/history actions expand on demand; choose a specification and use **Specification details** for its plan, issues, decisions, evidence, outcome, usage or history. **Tools** opens project knowledge, versions, history, source flow and architecture.

The same view stacks in a narrow sidebar and splits work and details in a wide, shallow panel. Moving the view keeps the project, specification, drafts, expanded details and scroll positions. Native editor themes and keyboard controls remain active.

## Understand progress

The current-work card and specification plan show criteria with recorded passing independent checks, reported evidence, missing evidence, running checks, blockers and the latest meaningful work record. When available, the attempt start time comes from the actual lease-claim audit event.

These are recorded facts, not a percentage of implementation time or a finish estimate. A long implementation can have no check evidence yet. Agents should retain meaningful findings and decisions as work advances and split large deliverables into independently verifiable specifications. Evidence is matched to the current contract and attempt; its source freshness is rechecked at completion. Only a completed specification is complete.

## Review knowledge

A persistent review alert counts observed definitions and pending replacements or retirements. Click it to see concrete definitions, before/after changes, source/test gaps and the required review reason. Definition search and file coverage expand separately from the review queue.

The editor also shows a view badge and offers **Review now** when the pending set changes. Notifications are deduplicated per project and exact record revisions, including across extension restarts. Dismissing a notification leaves the review alert available. Agents cannot approve their own definitions.

## Recover connections

Service startup and native bridge preparation run during extension activation, independently of whether the Contextory sidebar is visible. Explorer or another sidebar can stay open. Trust, workspace changes, installed-agent discovery and repaired startup configuration share the same automatic retry path. Explicitly paused agent setup remains paused. The editor smoke test waits for real automatic activation; it never calls `extension.activate()` to manufacture startup.

The editor probes its service every 20 seconds, with a five-second heartbeat timeout. Lost event streams, including a cleanly closed stream, cause the client to close and reconnect automatically. Connection establishment retries after 1, 2, 4, 8, 16 and then at most 30 seconds between attempts. Retries stop after a successful refresh or extension disposal. Closing every project stops scheduled retries.

During an outage, the view identifies the retained dashboard as the last received data and offers **Retry now**. Recovery does not replay failed user/tool mutations. If a mutation lost its response, recover it using its exact original operation ID and input. The native MCP bridge already re-reads the current descriptor and retries read-only discovery; a foreground readiness attempt has a 15-second budget while background discovery can continue for five minutes. A later request can start another window.

A request timeout is reported as `REQUEST_TIMEOUT`, separately from an unreachable service. Ordinary tool RPC calls use a 120-second budget, matching the native bridge; release operations retain their separate five-minute budget. A source query that exceeds its budget does not itself establish that the service is down. An independent regression reproduced a cold source query exceeding the previous 30-second default under concurrent load.

`contextory.checks` supports up to 256 recipes. Invalid changes preserve the connection and the service's last valid recipe list, and show **Fix check settings**. A fresh service has no valid recipes until configuration succeeds. Increasing this list does not execute any checks.

Local logs behind this change included the 33-versus-30 recipe error and Windows `EPERM` while replacing private service descriptors. Descriptor replacement already retries transient Windows locks without deleting the previous file; automatic recovery now also covers a failed startup.

## Codex hooks and reloads

Contextory writes repaired hook files immediately. A native hook observation appears only after Codex loads the relevant trusted configuration and emits a supported lifecycle event. MCP and hook observations in **Tools** are separate from the editor's live service health; a historical observation is not a live probe of the native agent.

**Rebuild hooks** repairs only managed project hooks and their launcher. A changed repair now feeds the existing `contextory.restartAfterSetup` policy: prompt, automatic, or never. **Restart agent extensions** uses VS Code's Extension Host restart and interrupts active extension tasks. Unchanged repairs do not trigger another restart offer. Repeated rebuilding cannot approve hooks.

The installed Codex extension inspected on November 23, 2026 (`openai.chatgpt-26.51117.41037-win32-x64`) exposes no public hook-refresh or restart command. Contextory cannot force native trust or promise a running session immediately reloads its hook configuration. Review `/hooks` in the affected session, use the same workspace path casing, and resume the chat after restarting extensions when required. No private Codex commands or approval records are modified.

References: [OpenAI Hooks](https://learn.chatgpt.com/docs/hooks), [OpenAI developer commands](https://learn.chatgpt.com/docs/developer-commands), and the installed extension's contributed command manifest.

## Validation scope

Backend and browser regressions cover recipe limits, retry timing/disposal, evidence classification, persistent review alerts, stale-data recovery, project isolation and layout/theme/keyboard behavior. The isolated editor smoke test configures 33 checks, rejects duplicate IDs without disconnecting, stops its own disposable service process, waits for automatic descriptor rotation without a manual refresh, and verifies the original request survived. Native Codex trust interaction and notification dismissal remain human UI checks.
