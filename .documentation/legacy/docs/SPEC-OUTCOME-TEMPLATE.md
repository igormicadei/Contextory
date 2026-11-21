# Durable spec outcome template

2026-11-12 · Implemented native-agent outcome contract

Used by [the native-agent architecture](NATIVE-AGENT-ARCHITECTURE.md). MCP validates the required outcome fields and criterion mappings. Optional references below are guidance for useful explanations; the exact schema is in `src/contracts/tools.ts`.

Persist these fields through MCP while work proceeds, then submit a linked outcome. The database holds structured records; this Markdown is their readable projection. Explanations should help a future developer evaluate the change without reopening the native conversation. Record concise conclusions, evidence and tradeoffs, not an internal reasoning transcript.

## Identity and requirement

- Project / workspace instance: `<IDs and execution host>`
- Request / milestone / spec: `<IDs>`
- Spec revision / contract hash: `<revision and hash>`
- Attempt / native provider / session reference: `<IDs; no credentials>`
- Source snapshot: `<repository/worktree + content fingerprint; unsaved overlays identified>`
- Original intent: `<requirement or reference to immutable request>`
- Steering since the original request: `<revision links, or none>`

## What changed

`<Short user-facing explanation of resulting behavior. State the trigger and outcome; link important paths/symbols and commits when available.>`

## Issues found and how they were resolved

| Finding        | Observation and impact                       | Resolution and why it fits        | Source / criterion / evidence    | State                          |
| -------------- | -------------------------------------------- | --------------------------------- | -------------------------------- | ------------------------------ |
| `<finding ID>` | `<reproducible issue and affected behavior>` | `<fix and concise justification>` | `<current versioned references>` | `<resolved / open / deferred>` |

If no issue was discovered, record that explicitly. A deferred issue needs a reason, impact, follow-up link and whether it prevents this spec's acceptance. Do not silently omit failed approaches or unresolved criteria that materially affect the result.

## Decisions made

| Decision        | Chosen approach  | Alternatives and tradeoff        | Consequences / affected scope          | Provenance                                        |
| --------------- | ---------------- | -------------------------------- | -------------------------------------- | ------------------------------------------------- |
| `<decision ID>` | `<what and why>` | `<only meaningful alternatives>` | `<interfaces, performance, follow-up>` | `<agent-authored / developer decision reference>` |

Use “No new design decision” when appropriate. Superseded decisions remain linked to their replacements. A record attributed to the developer must link an observed developer answer/action; an agent's interpretation is labeled as such.

## Acceptance and validation

| Criterion        | Evidence / run      | Result and relevant assertion                   | Origin                                                       | Source / contract freshness                      |
| ---------------- | ------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| `<criterion ID>` | `<run/artifact ID>` | `<passed / failed / not run; what was checked>` | `<Contextory runner / external report / manual observation>` | `<eligible / stale / superseded, with snapshot>` |

Store exact recipe identity/revision, argv/cwd, exit status and bounded output artifacts with the run. Agent statements do not become independent check results. If a check was not run, record why and whether policy permits completion. A later failure, changed source, revised contract or new attempt may invalidate earlier eligibility while preserving this history.

## Code and relationship references

- Changed paths/symbols: `<stable references plus snapshot/ranges>`
- Related requests/milestones/specs: `<relationship kind and reason>`
- Supporting earlier findings/decisions: `<links>`
- Flow diagram: `<optional graph artifact and snapshot; limits/gaps visible>`
- Commits: `<full SHAs and relationship, or unavailable/not applicable>`

A call graph or similar search result is supporting navigation, not proof that every runtime path was checked.

## Deviations, limits and follow-up

`<Material deviation from the spec, authorized change reference, remaining failure/uncertainty and next action. Use none when appropriate.>`

## Report and changelog text

- Report explanation: `<problem, fix, significant decision and verification in a short paragraph>`
- Changelog entry: `<user-visible change; omit from release output until eligible>`
- Eligibility: `<submitted / completed; completion eligibility calculated by the service>`

Submitting this outcome requests validation. It does not let the agent overwrite evidence provenance, approve its own scope expansion, or mark stale evidence current. Optional external summaries can be regenerated from these records; the records remain authoritative.

After `contextory_outcome_submit`, use its returned revision to call `contextory_spec_change` with `action: "complete"`, the spec ID and a new operation ID. Confirm the returned state is `completed`. If rejected, resolve or report the verification blocker. Submission alone does not close a spec. Successful completion updates its milestone and request; export the full report with `contextory_report_export` and that request's ID.
