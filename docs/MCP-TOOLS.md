# Contextory MCP tools

Contextory exposes project workflow, retrieval, source tracing, and reporting through a standard stdio MCP server. Agents use these tools from their native conversation; Contextory does not host a second chat or handle model routing.

Connect through the extension's provider command rather than assembling private descriptor paths by hand. The project-specific server name is `contextory_companion_<project hash>`. The authoritative input schemas and descriptions are in [src/contracts/tools.ts](https://github.com/igormicadei/Contextory/blob/v0.2.3/src/contracts/tools.ts); the running server advertises them through MCP `tools/list`.

## Available tools

| Tool                             | Purpose                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contextory_context_get`         | Read the workspace brief, active specs, failures, configured checks, and optional focused spec. Start tracked implementation here.                      |
| `contextory_entity_get`          | Read a record, immutable historical revision, children, check-job result, or a page of an artifact.                                                     |
| `contextory_history_get`         | Page audit history with readable titles and hierarchy links; optionally scope to a record and its descendants.                                          |
| `contextory_request_change`      | Create an authorized request or revise it with a reason while preserving original intent.                                                               |
| `contextory_spec_change`         | Create milestones/specs, revise or reopen a spec, block/cancel it, or request verified completion.                                                      |
| `contextory_session_attach`      | Register a native session for correlation; return the Contextory session ID.                                                                            |
| `contextory_spec_lease`          | Claim, renew, or release the active implementation lease for a spec/session.                                                                            |
| `contextory_finding_record`      | Record/update an issue, its impact, resolution, blocking status, and source references.                                                                 |
| `contextory_decision_record`     | Retain a choice, rationale, alternatives, consequences, sources, and optional superseded decision.                                                      |
| `contextory_evidence_record`     | Record external/manual evidence and criterion links, with its reported origin preserved.                                                                |
| `contextory_check_run`           | Run a named configured recipe independently; return an asynchronous check job.                                                                          |
| `contextory_outcome_submit`      | Persist changes, issue/decision summaries, validation mappings, limits, report/changelog text, and optional commits. Return the next completion action. |
| `contextory_search`              | Retrieve current project records and indexed source through lexical, semantic, or hybrid search.                                                        |
| `contextory_relationship_change` | Link records, or associate a record with a workspace file/symbol, with a relationship kind and rationale.                                               |
| `contextory_impact_get`          | Traverse relationships forward, reverse, or both, returning readable summaries and explicit limits.                                                     |
| `contextory_flow_trace`          | Trace supported source calls/control flow from a symbol or position, with bounded depth, fanout, size, and time.                                        |
| `contextory_flow_expand`         | Read a stored graph page or expand a frontier while checking the source snapshot.                                                                       |
| `contextory_report_export`       | Export one request's full report, completed-work changelog, or JSON records.                                                                            |

## Mutation and session rules

- Read existing records before editing them. Operations on existing versioned records require their current `expectedRevision`; resolve conflicts by rereading.
- Each mutation takes an `operationId` of 8–160 characters. Use a new ID for a new operation and reuse the same ID for a retry of that operation.
- Create milestones under requests and specs under milestones. Specs require acceptance criteria. Do not create requests for ordinary questions or expand user scope silently.
- Attach the native session, then claim a spec with that returned Contextory session ID. Findings, decisions, evidence, checks, and outcomes require the returned lease ID. Leases last 30 minutes; renew them during long work.
- Record concise explanations that a developer can evaluate later. Preserve uncertainty and distinguish agent-authored choices from observed developer decisions.
- Contextory tools do not grant native permissions or authorize extra work. Check recipes are configured through trusted editor settings rather than arbitrary MCP command execution.

## Complete a spec correctly

1. Read `contextory_context_get` and inspect the current spec/criteria.
2. Register the native session and claim its spec lease.
3. Retrieve prior decisions and inspect relevant relationships/source flow. Implement with native editing tools and record findings and decisions as work proceeds.
4. Use `contextory_check_run` with a configured `recipeId`, criterion IDs, spec ID, and lease ID. Poll the returned job through `contextory_entity_get` until it finishes. Keep the actual result/evidence IDs.
5. Submit `contextory_outcome_submit` with the current revision and exactly one evidence mapping for every current criterion. Include changes, issue/fix and decision summaries, validation, limitations, report text, and changelog text. Explicitly state when there were no findings or new decisions.
6. Use the outcome response's next action: `contextory_spec_change` with `action: "complete"`, the spec ID, returned revision, and a new operation ID. Confirm `state: "completed"` in the result.

Outcome submission alone leaves the spec open. Completion rejects stale source/contract/attempt evidence, later failures, pending checks, unresolved blocking findings, or incomplete dependencies. Resolve the blocker or explain it to the user. Verified completion rolls up milestone/request state; new planned work and reopen operations reopen the affected parents.

An outcome is a durable explanation, not permission to overwrite evidence provenance or a shortcut around check requirements. See the [outcome template](SPEC-OUTCOME-TEMPLATE.md) and [check configuration](USER-GUIDE.md#configure-checks).

## Read-only examples

These are MCP tool argument objects. Replace illustrative paths and record IDs with values returned by the current workspace.

Search earlier decisions and changes:

```json
{
  "query": "checkout retry idempotency",
  "mode": "hybrid",
  "limit": 5
}
```

Call `contextory_search` with that object. Hybrid mode explicitly falls back to lexical retrieval if the optional model is unavailable; semantic-only mode reports its unavailability. Record results cite current revisions. To read a historical version, use `contextory_entity_get` with `id` and `revision`.

Trace Python source with `contextory_flow_trace`:

```json
{
  "root": {
    "path": "src/checkout.py",
    "symbol": "checkout",
    "start": "function"
  },
  "view": "flow",
  "direction": "outgoing",
  "limits": { "callDepth": 5, "nodes": 150, "edges": 300, "timeoutMs": 2000 }
}
```

Positions and source references use zero-based lines/characters. Python tracing works through the agent service without an editor language provider. Other languages may rely on the installed editor call-hierarchy provider. Static results expose unresolved targets and traversal boundaries; they are not runtime evidence.

Explore a request's relationships using `contextory_impact_get`:

```json
{
  "id": "REQ-example",
  "direction": "both",
  "depth": 5,
  "limit": 50
}
```

## History, graphs, artifacts, and reports

`contextory_history_get` defaults to 40 events. Pass the response's `nextBefore` as `before` to retrieve older events. `entityId` scopes history to that request/milestone/spec and its descendants.

Large responses can return `ART-` artifact handles instead of the full result. Use `contextory_entity_get` with the handle and `offset`/`limit` to retrieve more; artifact offsets count 400-character pages, while entity-child offsets count records. Graph paging uses `contextory_flow_expand`, `graphId`, and `snapshotId`. Source changes invalidate expansion handles rather than combining different source snapshots.

Export one request with `contextory_report_export`:

```json
{
  "requestId": "REQ-example",
  "format": "report"
}
```

Use `"changelog"` for completed-spec changelog entries or `"json"` for the scoped records. Reports include the request and descendants rather than unrelated workspace activity. Follow the returned artifact handle for the full content.

## Qualification

Automated coverage exercises the actual stdio MCP bridge, all tool definitions, role isolation, descriptor rotation, and a full create/claim/check/outcome/complete/read workflow. Actual editor-host tests generate all three provider configurations. Authenticated model-driven conversations, provider-native trust/reload behavior, and a model following the workflow remain separate qualification steps. See [VALIDATION.md](VALIDATION.md).
