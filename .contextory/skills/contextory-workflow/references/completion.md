<!-- contextory-managed-resource -->

# Completion and evidence

Multi-project work is a coordinated group of project-owned requests, not a shared ledger or lease. Carry the same projectId (and workspaceId when needed) through each branch's session, spec lease, findings, catalog, checks, evidence, outcome, completion and report export. Evidence and record IDs from another project cannot complete a branch. After every local request completes, query contextory_workspace_get with groupId; offline, detached or missing branches remain explicitly incomplete. Recover partial creation with its exact original operationId/input; each branch retains that input. Native hook/model/usage observations are not reassigned across projects by inference.

Recover earlier work with focused search and read its current request/spec state before creating records. Read cited historical revisions for rationale, then check whether later decisions supersede them. Keep observations, generated source relationships and approved criteria distinct. Hooks can restore reminders after compaction but do not carry the full current contract; reread `contextory_context_get` for it.

Attach a Contextory session with `contextory_session_attach`; never guess a native session ID. Claim/renew with `contextory_spec_lease`. Mutations require fresh revisions and unique operation IDs. Read the record after a conflict rather than replaying a changed mutation with an old idempotency key.

Record issues through `contextory_finding_record`, explaining impact, resolution and relevant sources. Blocking findings must be resolved before completion. Record concise choices and tradeoffs through `contextory_decision_record`. These explanations are project records, not chat transcripts.

Use `contextory_check_run` recipes and poll with `contextory_entity_get`. With no recipes, configure the project's existing meaningful check command in workspace `contextory.checks`, then reread context. If no meaningful check is available, report verification as pending. Agent-reported external results remain reported evidence and cannot substitute for an independent runner's passing result.

An outcome maps every acceptance criterion exactly once to current evidence. Finish source/configuration edits before final independent checks: evidence is bound to the source fingerprint, contract and attempt, so later changes may require new checks. A static test-reference edge is not test execution evidence. Explain changes, issues/fixes, decisions, validation and remaining limits, including when there were no findings or new decisions. Submit the outcome, explicitly complete the spec with the returned revision, and confirm its state. Export the full request using `contextory_report_export`.

Use only advertised workflow mutations. If a required workflow tool or connection is unavailable, preserve the work and explicitly report which tracking or verification step remains pending; native source inspection can continue within the authorized scope. Never pretend an unavailable call succeeded or that a hook completed a spec.

When a project catalog exists, include `catalog:{recordIds,explanation}` in the outcome. Explain additions, approved changes/retirements or why behavior is unchanged. Pending proposals under this spec and stale affected approved source/test references block submission/completion. A definition revision after submission invalidates its accounted outcome. Review via the human Approvals tab; never borrow UI credentials to approve agent proposals. The complete stored base and immutable revisions are available through paginated `contextory_project_export` for documentation.
