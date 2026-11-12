# SPEC-<id>: <concrete behavior>

<!-- A fresh session must be able to implement this document without the original chat. Replace every placeholder. Links supplement this document; they do not replace its acceptance contract. -->

Status: draft | ready | implementing | verifying | blocked | completed | superseded

Request: <stable ID and relative link>  
Milestone: <stable ID and relative link>  
Contract revision: <number and hash>  
Provider: <Codex or Claude Code>  
Dependencies: <specific IDs, required revisions/results, or none>  
Baseline: <repository instance, branch, full commit, relevant dirty snapshot if any>

## User intent and expected behavior

<Explain the user problem, concrete trigger, observable result, and boundary cases. Include the relevant original request and decisions so this remains understandable independently.>

## Context to load

- Repository/worktree root and execution host.
- Architecture/convention files and applicable native instructions.
- Relevant source files, interfaces, call paths, and existing tests, with explanations.
- Required native skills/agents/MCP capabilities, their scope, and a discovery check.
- Linked decisions, prior milestone outputs, and migration constraints.

## Scope and constraints

Owned paths: <paths/patterns and shared-path coordination requirements>.

<Public interfaces, compatibility requirements, permission boundaries, performance/accessibility constraints, intentional non-changes, and known uncertainties. State assumptions explicitly.>

## Implementation procedure

1. Establish the baseline and inspect <specific files/interfaces>.
2. Implement <specific behavior and integration points> using <chosen approach and why>.
3. Handle <failure/cancellation/empty/long-content/compatibility cases>.
4. Update <tests, docs, migrations, and callers>.
5. Run the verification recipes below against the final source.
6. Inspect the owned diff; commit with association trailers; push according to workspace policy.

The procedure is actionable guidance. If investigation disproves it, record a revised contract/decision rather than silently changing acceptance criteria.

## Acceptance criteria

- [ ] <Observable success behavior, including a concrete example.>
- [ ] <Negative/failure behavior and recovery.>
- [ ] <Accessibility, layout, or performance boundary where applicable.>
- [ ] <Required evidence is current for this spec revision and source.>
- [ ] <Required Git actions and documentation updates are recorded.>

## Verification recipes

| ID | Command / argv | Cwd and environment reference | Assertion and artifact | Required? |
| --- | --- | --- | --- | --- |
| <check-id> | <exact command, without secrets> | <worktree-relative path / named profile> | <meaningful outcome, report path> | yes/no with reason |

For browser work, name routes, fixtures, functional journeys, viewports, intended scroll containers, overflow/overlap checks, keyboard cases, visual baselines, and trace/screenshot retention. State how data and ports are isolated. “Tests pass” without a reproducible recipe is insufficient.

## Commit and integration contract

Milestone branch: <branch>. Integration target/base: <branch/full SHA>.

Use `Request-ID`, `Milestone-ID`, and `Spec-ID` trailers. Record full SHAs in the database; support multiple commits and corrective/revert roles. Do not stage unrelated changes or create an empty commit solely to satisfy a count. Explain documentation-only or no-change results explicitly.

## Checkpoint for a fresh session

Last verified source/contract: <hashes>. Completed work: <concrete state>. Remaining work: <ordered steps>. Failing checks: <run IDs and reason>. Current branch/worktree: <identity>. Associated commits: <IDs>. Outstanding question/blocker: <specific fact needed>. External side effects already performed: <pushes/services/etc.>.

## Completion record

<Behavior delivered; accepted criteria; verification-run IDs; artifacts; commits; pushed/integrated state; limitations; report/changelog notes. The runner fills evidence fields; model prose alone cannot complete the spec.>
