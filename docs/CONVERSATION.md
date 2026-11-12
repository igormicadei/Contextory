# Conversation, intake, and context contracts

> Update: the first experimental live engine is now implemented. [IMPLEMENTATION.md](IMPLEMENTATION.md) describes its actual scope and limitations; preview-only statements below refer to demo mode or the earlier design baseline. [VALIDATION.md](VALIDATION.md) records current evidence.

Revision 3 · 2026-11-10. This extends the existing implementation plan; it does not add an agent engine to the prototype. See SPEC-0101/0102, SPEC-0201–0203, SPEC-0301/0302, SPEC-0602, and SPEC-0701–0703 in [PLAN.md](PLAN.md).

## Conversation first, work when requested

The default view is a chronological project conversation. User questions, brainstorming, explanations, task intake, decisions, and meaningful implementation updates all have a place in the transcript. A message is not inherently a request. Mentioning a request ID or discussing an improvement is not authorization to reopen or revise it.

Production intake records a `Conversation`, immutable `Message`, and `ChatTurn` with correlation, provider/session identity, selected/effective settings, typed context, optional request links, and intent (`question`, `discussion`, `change`, or `unclear`). Question/discussion turns may search/read the queue and investigate the codebase under native permissions, but cannot invoke task-mutating APIs or start implementation. The coordinator enforces the intent scope when applying a proposal. Clear change instructions already authorize intake; clarify only material ambiguity, without a routine confirmation for every message.

Keep the conversation turn separate from an execution session. A question about ongoing work must not become an amendment or be injected into the coding session as new implementation instructions. Read the versioned request, latest event projection, worktree/check/commit evidence, and relevant repository context to answer it. Starting a conversation with another provider does not transfer ownership of existing requests. Preserve native customization and permission policy on the corresponding chat runtime too. Side-effecting code/MCP operations require an authorized change scope rather than being triggered by an ordinary question.

Intake acknowledgment states what was created, amended, or reopened, why it was grouped that way, and what will happen next. It links to the request/spec and relevant revision. Questions produce an answer without queue mutation. Decisions and blocked/finished milestones produce concise, correlated chat updates. Coalesce routine execution noise; detailed tool/check events remain in Activity. Updates are idempotent by originating event ID and do not replace earlier conversation text. Linked cards may show the current request projection separately from the historical message.

Production persists all messages before processing, supports paginated history, streaming/reconnect cursors, retryable failed turns, native session reconciliation, and draft recovery. Preserve reading position when updates arrive; follow new messages only when the user is at the end or chooses Latest messages. Keep request inspection independent of conversation navigation.

**Prototype:** Chat is the default tab beside Requests. Local English intent rules distinguish explicit changes from questions/discussion; unclear intent stays conversational. Replies summarize demo queue data or explain the planned extension. They do not inspect the actual repository or call a model. User messages, replies, task acknowledgments, decision answers and simulated execution updates persist in schema 3 (latest 200 messages). Schemas 1/2 migrate without erasing work history; prior submitted messages are imported into the transcript. Pending routing choices remain page-local, while their original user message is now persisted. Unsent drafts/attachments are page-local. A routing question does not prevent ordinary chat.

## One interface, separate native runtimes

Relay owns the shared conversation and request list. Each request retains its agent and native session; there is no automatic Codex-to-Claude session transfer. Selecting an agent/model/effort describes the next new request. An amendment to existing work uses its owning runtime; incompatible selection produces a clear decision instead of switching that session silently. Model changes to an existing request are versioned execution settings applied at a supported checkpoint, with the effective selection shown separately from the requested selection.

This is an independent client built on native runtimes. It cannot assume access to the private conversation state or UI of either vendor's VS Code extension. The optional companion mode uses explicit shared tools/hooks and must describe its narrower control over native sessions.

## Chat, Requests, and Activity

**Requests** is the current projection: what work exists, its hierarchy, required decisions, execution state, and associated evidence/commits. **Activity** is the audit timeline: how that state changed, including routing, answers, revisions, checks, commits, pauses, and failures. Both use the same event-backed entities in production; neither is a second task queue.

**Chat** is the conversation, with concise linked outcomes and answers. Only Chat and Requests are primary tabs. History is opened from Requests or the utility menu. Agent/model/effort settings open from the composer summary. Compatibility, plan, export and reset are in the utility menu. The two progress bars share a compact strip; milestone details and execution controls expand on demand. Do not place raw logs, full progress panels and the task hierarchy in the default conversation view.

Collapsed request headers retain a dot plus text. Visible states include queued, needs planning, running, paused, stopped, needs decision, blocked, and done. Production also distinguishes cancelled, failed, and interrupted/reconciling states. Waiting for user input is separate from a technical blocker. A parent with several conditions exposes the primary state plus secondary reasons in its details. A completed request with a new amendment returns to investigation/planning; old completed revisions remain history.

Overall progress counts completed current leaf specs. The second bar follows the executing milestone, regardless of the selected inspector. Unplanned/newly reopened scope remains explicitly pending outside the known denominator. Neither percentage nor old successful evidence proves that an amended request is complete.

## Agent tools for automatic routing

Persist the incoming message, attachment handles, context references, selected execution settings, and correlation ID **before** classification. For a change intent, search the entire project queue, including completed work. Resolve explicit IDs, investigate relevant code, retrieve candidate contracts, then split/group the message into independent intents or amendments. Current UI selection is never an implicit routing target. Discussion/question turns can use read-only search/get without producing an intake proposal.

| Tool | Input | Result / enforcement |
| --- | --- | --- |
| `requests.search` | Query, project ID, optional provider/status/path/tag filters, cursor, bounded limit | IDs, status, provider, revision, short intent summary, ranking reasons; completed work included by default |
| `requests.get` | Request ID and requested revision/detail | Versioned intent, milestones/specs, decisions, dependencies, linked commits/evidence, recent amendments |
| `requests.propose_intake` | Message ID; one or more new/amend intents, targets, expected revisions, code references, rationale and ambiguity | Schema-validated proposal, affected work, potential reopening, questions if material ambiguity remains |
| `requests.apply_intake` | Proposal ID, idempotency key, expected queue/entity versions | Atomic create/amend/reopen operations and audit events; optimistic conflict response if targets changed |
| `decisions.ask` | Correlation ID, request/spec revision, question, options/tradeoffs, custom-answer support, blocking scope | Durable question ID and `needs-input` state for only the affected scope |

Expose these through the adapter's tool bridge or the shared MCP task service. Production tools run in the coordinator, with project boundaries and transition policy enforced outside model prose. A model cannot complete a request, mark evidence green, or force a Git operation through these intake tools.

On amendment, checkpoint/interrupt affected active execution, increment cancellation generation and contract revisions, identify invalidated evidence, reconcile dependencies and commit provenance, and resume only eligible work. Reopening completed work keeps prior commits/checks attached to their original spec revisions and obtains a valid execution branch/worktree baseline. Reuse a still-owned clean worktree only after reconciliation. Never reopen by erasing completion history or rewriting an already integrated branch.

If intent remains ambiguous, ask using the question component. The normal composer contains no New/Append toggle. A single multi-intent message can create several requests and amend another. Its intake receipt links every resulting operation back to the immutable original message.

**Prototype:** `src/shared/routing.ts` performs deterministic ID/keyword search and emits a labeled receipt. It can create, amend, reopen, and ask about ambiguous/cross-agent targets. It does not do semantic decomposition, code investigation, or expose real agent tools. A request-level amendment waits for planning; an explicit SPEC ID revises that spec and stales its checks. Pending routing questions are page-local until resolved; durable intake is an M01/M03 requirement.

## Durable question protocol

A decision records stable ID, question/options with tradeoffs, recommended option when justified, custom-answer support, request/spec and contract revision, execution generation, native correlation ID if applicable, blocking scope, and pending/answered/obsolete state. Native tool permission approvals stay a distinct event type with the provider's actual reason and permission semantics.

The UI permits keyboard selection of an option or a free-text answer. A recommended option is never submitted automatically. Changing to a custom answer clears the radio selection. Persist the response once, then acknowledge it to the matching provider/coordinator wait. Duplicate responses are idempotent. Reject stale revision/generation responses and replace obsolete questions with a current question. Reconnect redisplays unresolved decisions; unrelated requests remain eligible to run.

**Prototype:** the search-indexing question is interactive, revision-bound, persisted, and only releases SPEC-007. Answering never marks tests passed. Per-request pause/stop controls and unresolved decisions exclude that request from the fake stepper. Full dependency scheduling and native approval round-trips remain deferred.

## Model and reasoning discovery

| Runtime | Production discovery | Normalization |
| --- | --- | --- |
| Codex App Server | Paginated `model/list`; display name, model ID, default and supported reasoning efforts, input modalities and visibility | Render available account/runtime entries; send only supported reasoning levels; show the effective model when available |
| Claude Agent SDK | `supportedModels()` / initialization metadata; `ModelInfo.supportsEffort`, `supportedEffortLevels`; `supportedAgents()` and `supportedCommands()` for native context | Preserve native model aliases/default behavior; disable effort when unsupported; keep native effort names without pretending they equal Codex reasoning levels |

Catalogs are versioned capability snapshots for the installed runtime, authentication route, account, host, cwd, and relevant configuration. Handle pagination, updates, managed restrictions, missing fields and expired catalogs. Do not infer that a documented model is available to this account. Preserve the draft during selector changes. Keep requested settings separate from confirmed effective settings and show rejection/fallback explicitly.

**Prototype:** the catalog is illustrative, including runtime-default placeholders. Default/Haiku examples disable the effort control; changing to an unsupported combination resets to Default. Nothing verifies account model availability or invokes a model. Sample levels are UI examples, not a promise of exact native capabilities.

Sources reviewed 2026-11-10: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Claude model configuration](https://code.claude.com/docs/en/model-config), [Claude TypeScript SDK / ModelInfo](https://code.claude.com/docs/en/agent-sdk/typescript).

## Files, images, and native references

The message contract contains typed text blocks, attachment handles, and reference tokens, rather than flattening everything into an untrusted shell command or prompt string. Attachments record ID/name/MIME/size/hash/retention and a host-owned content handle. Filesystem references record stable workspace-root identity, relative path, kind and resolution revision. Skill/agent references additionally record provider, native ID, scope, source, availability, and intended invocation semantics.

- **+ / paste:** use the native file picker or clipboard file objects; validate size/type and show removable chips/image previews. Resolve bytes in the host, enforce aggregate limits and cleanup/retention, then translate into each provider's supported image/file input. Generic files may become safe worktree-local context or bounded text extraction; images become native image blocks when supported. Show unsupported modalities before sending and keep the draft.
- **@ files/folders:** search workspace roots with cancellation, bounded results, exclusions and multi-root disambiguation. Resolve selected references in the host, preserve snapshot provenance, respect trust and native file permissions, and bound directory expansion. Do not recursively attach an entire folder implicitly. Support quoted paths and keyboard insertion.
- **$ agents/skills / / skills:** discover from the selected native runtime with native scope/precedence and plugin/managed sources. Render kind/provider/scope so same-name references remain distinguishable. Referencing a skill and invoking a subagent are different operations and require provider-specific translation. Unavailable references are visible, not silently dropped. Native `/` commands are parsed separately from ordinary skill references; a global Claude command is not automatically a Codex command.

Native discovery must keep the user's global and project settings, instructions, skills, agents, hooks, MCPs and plugin configuration. A picker is not permission to invoke every discovered capability, and discovering a file is not proof the runtime enabled it. Cross-provider references require a deliberate correction rather than aliasing unrelated capabilities.

**Prototype boundaries:**

- Actual browser files and clipboard images can be selected. VS Code uses a native file dialog. Limits: six files, 4 MiB each, 12 MiB total. Image preview types are PNG/JPEG/GIF/WebP. Generic file contents are not read; local image reads are bounded. No upload or model consumption occurs. Sending retains metadata only; image bytes/thumbnails do not enter saved state, reports, or an execution worktree. Unsaved attachments disappear on reload.
- Browser references are explicitly samples. VS Code @ uses a bounded workspace file listing (up to 2,000 candidates), with folders derived from those files. Empty folders, large-workspace completeness, dynamic indexing and full multi-root resolution are production work.
- VS Code $ and / list only metadata from conventional `.agents/skills`, `.codex/skills`, `.codex/agents`, `.claude/skills`, and `.claude/agents` locations for the chosen provider and workspace/user scope. They do not read or execute skill instructions. Alternate native config roots, plugin/managed catalogs, include paths and central agent definitions are not resolved by this preview. The picker explicitly says local file discovery is not runtime-verified.
- The bridge accepts a bounded search query or a picker command, never a webview-supplied path to read. Filesystem capability/permission enforcement and end-to-end native modality/invocation checks remain required before enabling an engine.

## Implementation and verification order

1. M01: versioned incoming messages, decisions, attachment/reference handles, effective execution settings, intake operations and durable audit transactions. Migrate stored data without erasing prior revision/commit history.
2. M02: runtime-derived models/effort/modalities and native reference catalogs; tested text/image/file and decision/approval adapters. Verify global/project customization in the worktree, including same-name precedence and missing capabilities.
3. M03/M06: search/get/propose/apply tools, semantic splitting, reopened-work planning, optimistic concurrency and controlled active-work interruption. Test explicit IDs, completed requests, duplicate delivery, ambiguity, conflicting concurrent edits, unavailable references and cross-agent routing.
4. M07: conversation-first UI, separate tree/inspection view, compact expandable progress, on-demand utilities/settings, durable transcript, intent-aware intake, question cards, attachment chips and keyboard pickers. Test chat-only queue invariants, linked acknowledgments, question-while-running/awaiting-input, idempotent updates, reader scroll position, 280–480 px, compact heights, Unicode paths, answers/images/modalities, host reload and screen readers. Keep native tool permissions distinct from product questions.
5. M08/M10: include decision/intake/revision/commit links in factual reports; verify retained-content cleanup, untrusted path rejection, CSP, trust and native-host behavior. Report actual provider/version/platform coverage.
