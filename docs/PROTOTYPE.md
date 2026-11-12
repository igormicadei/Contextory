# Prototype review guide

> Update: the first experimental live engine is now implemented. [IMPLEMENTATION.md](IMPLEMENTATION.md) describes its actual scope and limitations; preview-only statements below refer to demo mode or the earlier design baseline. [VALIDATION.md](VALIDATION.md) records current evidence.

## Scope

The sidebar is a real VS Code WebviewViewProvider and a browser-previewable UI. All application requests, check results, branch names, commit hashes, and progress events are fictional. The extension never runs an implementation workflow, Git mutation, real tests for those demo tasks, or model calls.

The actual runtime version check is separate. The optional command-line Codex inspection probe reads real configuration/discovery metadata without starting a thread. See COMPATIBILITY.md for what remains unverified.

## Suggested review

1. Open at 360 px. **Chat** is the default; the two progress bars occupy one compact strip. Ask **What happened to REQ-001?**, **How should we improve account settings?**, or **Tell me about this project**. Replies stay in the transcript and the work queue remains unchanged.
2. Click the agent/model summary under the message box to open settings. Choose Claude Code and a sample model/effort, then send **Create a billing dashboard**. Chat acknowledges the new request and links it to the queue; the view does not jump away from the conversation.
3. Open **Requests** or click a linked request card. Expand **Improve account settings → Profile & security** and inspect **Responsive states & overflow**. Collapsed request badges retain running/queued/paused/stopped/decision/done/planning state.
4. Click the current execution line above the bars to expand progress details. Pause/resume or use **Demo step**. SPEC-003 becomes committing, then pushing, then complete. Messages in Chat explain these simulated updates; the bars count completed specs.
5. Inspect **Checks** and **Commits**. Open a sample commit for an illustrative editor/browser diff. No workspace Git history is changed. Per-request Pause/Stop/Resume also produce chat updates.
6. Click **1 decision** in the compact strip or **Review decision** in Chat. Choose an option or write a custom answer. The answer is retained in the transcript and only the related blocker is released. Other messages can still be discussed while decisions or routing questions wait.
7. With Codex selected, send **SPEC-001: Cover long localized names.** Chat explains the revision and stale checks; old commits stay linked to revision 1. **REQ-001: Add avatar cropping** queues a request-level amendment for planning. These paths also reopen fully completed work.
8. Send **Update REQ-001 and REQ-003 with a UI review**. The deterministic preview asks where to route it. This demonstrates ambiguity handling, not production semantic splitting. Cross-agent targets ask before continuing with the existing request's owner.
9. Use **+** or paste a clipboard image. Type **@**, **$**, or **/** and use arrows/Enter/Escape for context. Sending **Review @src/** stays conversational; an attachment alone does not create a task. Inspect message details for retained metadata. No file contents reach a model.
10. Scroll to older messages, then advance the demo. Your reading position stays stable; **Latest messages** returns to the newest update. Reload to check transcript persistence. Draft text survives switching views during the page lifetime.
11. **History** under Requests opens the detailed event trail. **…** contains Provider compatibility, plan, report, history, and reset. Native version checks are real; browser native inspection is unavailable. All implementation evidence remains simulated.
12. Review 280, 320, 360 and 480 px; compact height; long text; dark/light/high contrast. See [conversation contracts](CONVERSATION.md) for the production design.

## Interaction and storage details

- Native semantic buttons/disclosures are used; hierarchy is nested lists rather than an incomplete ARIA tree widget.
- Browser and VS Code workspace storage key remains `relay.demo.v1`; payload schema is **3**. Schemas 1/2 migrate without losing requests, decisions, revisions, checks, or commits. Schema-2 submitted messages are imported into chat with linked acknowledgments; the known schema-1 indexing fixture gains its question. Webview restoration also uses VS Code's webview state.
- The prototype retains the latest 200 chronological chat messages, not just three routing receipts. Roles, message details, attachments/references, and linked requests persist. Production conversation pagination/archiving is specified in M01/M07.
- English imperative/polite change requests use the preview routing reducer. Questions, discussion, and unclear intent use local conversation replies and leave requests/decisions/submissions/activity unchanged. These rules are illustrative; real codebase-aware conversation and semantic intent detection require a provider adapter.
- Reset clears only preview data. No actual project files are deleted.
- Ctrl/Cmd+Enter submits. Text or an attachment is required. Draft and selected context survive UI rerenders during the page lifetime; unsent draft/attachments and pending routing questions do not survive a reload. Full durable intake/draft recovery belongs to M01/M07.
- Sample models/efforts demonstrate capability-aware controls. Runtime default and the Haiku sample disable effort. Switching provider/model preserves the text and rejects unsupported effort combinations; no actual account catalog is inspected.
- Attachments: 6 files, 4 MiB each, 12 MiB aggregate; PNG/JPEG/GIF/WebP image previews. Selection/paste is real, but no upload/model consumption occurs. Generic file bytes are not read. Local image bytes are bounded and ephemeral; sent persistence contains metadata only.
- Native @ lists up to 2,000 workspace file candidates plus derived folders. $ and / list conventional user/project skill/agent file metadata for the selected runtime; plugin/managed/custom-root discovery and actual native resolution remain deferred. The picker labels this limitation. Browser reference lists are explicitly samples.
- Exported reports remain explicitly simulated. The current export is an implementation-status demonstration, not a production changelog generator.
- Native VS Code theme variables are used, with standalone browser fallbacks. The browser workbench surrounding the iframe is illustrative; the iframe is the actual reusable sidebar.
- The fake stepper excludes paused/stopped requests, pending planning and unresolved decisions. It does not implement the complete dependency/gate/reconciliation model; M01/M06 specify the production scheduler.

## Known prototype limitations

No authenticated provider replies/streaming; codebase investigation; semantic intent/splitting/routing model; native model catalog; context consumption; Git/worktree manager; independent project check runner; production SQLite; native session resume; multi-writer coordination; production report/changelog; or native-extension companion. The conversation UI works with local, deterministic demo responses; it does not reason about the actual codebase. The limited inspection script and local metadata picker do not prove agent/skill/MCP invocation. The full extension-host interaction/security matrix and cross-platform native execution are future gates; the basic native smoke does not replace them.

A native smoke harness is included as `npm run test:host` for Windows. It now uses a pinned official VS Code 1.145.3 archive, separate from the installed VS Code's pending update. Activation, commands, view creation, and the F5 preview's continued execution pass. The nested F5 check copies the built assets into an owned fixture so VS Code cannot reload the parent test window.

Inspector attachment reproduced an extension-host abort (exit 134) before Relay activation in both the installed setup and clean runtime. The default `Relay Preview` launch therefore uses `noDebug: true`: the preview works, but breakpoints are not attached. The cached runtime/profile/extensions live under `.relay-local/`, excluded from search/watchers and Git. The harness captures its own startup logs there without changing the normal profile.

Current data is capped to keep preview storage bounded. Large-history pagination/virtualization, full screen-reader/announcement review, cross-restart scroll/draft restoration, actual workspace labels, runtime-derived model selection, durable binary context storage, and full multi-root support belong to production milestones.
