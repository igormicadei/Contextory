import { randomUUID } from "node:crypto";
import { Ledger, digest } from "../storage/ledger";
import {
  ContextoryError,
  requireValue,
  type Actor,
  type Entity,
  type SourceSnapshot,
  type WorkspaceRequest,
} from "../contracts/model";
import type { Input } from "../contracts/tools";
import { linkSessionModel } from "./usage";
type Lease = {
  id: string;
  sessionId: string;
  actor: string;
  expiresAt: number;
  generation: number;
};
export class Workflow {
  constructor(readonly ledger: Ledger) {}
  private dependencies(id: string, dependencies: string[]) {
    const visit = (current: string, seen: Set<string>) => {
      if (current === id)
        throw new ContextoryError(
          "DEPENDENCY_CYCLE",
          "Spec dependencies must not form a cycle.",
        );
      if (seen.has(current)) return;
      seen.add(current);
      for (const next of this.kind(current, "spec").data
        .dependencies as string[])
        visit(next, seen);
    };
    for (const dependency of dependencies) visit(dependency, new Set());
    this.ledger.db
      .prepare("DELETE FROM edges WHERE source=? AND kind='depends_on'")
      .run(id);
    for (const dependency of dependencies)
      this.ledger.edge(
        id,
        dependency,
        "depends_on",
        "Declared spec dependency",
      );
  }
  private kind(id: string, kind: Entity["kind"]) {
    const e = this.ledger.get(id);
    if (e.kind !== kind)
      throw new ContextoryError("WRONG_KIND", `Expected a ${kind} record.`);
    return e;
  }
  private save(
    e: Entity,
    patch: Partial<Pick<Entity, "state" | "data" | "title">>,
    actor: Actor,
    type: string,
    expected = e.revision,
  ) {
    const result = this.ledger.update(e, expected, patch);
    this.ledger.audit(type, e.id, actor, {
      revision: result.revision,
      title: result.title,
    });
    if (result.kind === "spec") this.rollup(result.parentId, actor);
    return result;
  }
  private rollup(id: string | undefined, actor: Actor) {
    if (!id) return;
    const parent = this.ledger.get(id);
    const children = this.ledger
      .list(id, Number.MAX_SAFE_INTEGER)
      .filter((e) => ["spec", "milestone"].includes(e.kind));
    const state =
      children.length &&
      children.every((e) => ["completed", "cancelled"].includes(e.state))
        ? "completed"
        : "active";
    if (parent.state !== state) {
      const updated = this.ledger.update(parent, parent.revision, { state });
      this.ledger.audit(`${parent.kind}.${state}`, parent.id, actor, {
        title: parent.title,
        revision: updated.revision,
      });
    }
    this.rollup(parent.parentId, actor);
  }
  private create(
    kind: Entity["kind"],
    title: string,
    data: Record<string, unknown>,
    actor: Actor,
    parentId?: string,
    state?: string,
  ) {
    const e = this.ledger.create(kind, title, data, parentId, state);
    this.ledger.audit(`${kind}.created`, e.id, actor, { title: e.title });
    if (["spec", "milestone"].includes(kind)) this.rollup(parentId, actor);
    return e;
  }
  request(
    a: Input<"contextory_request_change">,
    actor: Actor,
    workspaceRequest?: WorkspaceRequest,
  ) {
    return this.ledger.transaction(
      a.operationId,
      actor,
      "request",
      workspaceRequest ? { ...a, workspaceRequest } : a,
      () => {
        if (a.action === "create")
          return this.create(
            "request",
            a.title,
            {
              original: a.description,
              description: a.description,
              provenance: actor.human
                ? "developer"
                : "agent-reported user intent",
              amendments: [],
              ...(workspaceRequest ? { workspaceRequest } : {}),
            },
            actor,
          );
        const e = this.kind(
          requireValue(a.id, "Revision needs an id."),
          "request",
        );
        requireValue(a.reason, "Revision needs a reason.");
        return this.save(
          e,
          {
            title: a.title,
            data: {
              ...e.data,
              description: a.description,
              amendments: [
                ...(e.data.amendments as unknown[]),
                {
                  description: a.description,
                  reason: a.reason,
                  actor: actor.id,
                  time: new Date().toISOString(),
                },
              ],
            },
          },
          actor,
          "request.revised",
          requireValue(
            a.expectedRevision,
            "Request revision needs expectedRevision.",
          ),
        );
      },
    );
  }
  spec(
    a: Input<"contextory_spec_change">,
    actor: Actor,
    snapshot?: SourceSnapshot,
  ) {
    return this.ledger.transaction(a.operationId, actor, "spec", a, () => {
      if (a.action === "milestone" || a.action === "create") {
        const parent = this.kind(
          requireValue(a.parentId, "Creation needs parentId."),
          a.action === "milestone" ? "request" : "milestone",
        );
        const title = requireValue(a.title, "Creation needs a title.");
        if (a.action === "milestone")
          return this.create(
            "milestone",
            title,
            { description: a.description ?? "" },
            actor,
            parent.id,
          );
        const criteria = requireValue(
          a.criteria,
          "A spec needs acceptance criteria.",
        ).map((text, i) => ({ id: `AC-${i + 1}`, text }));
        for (const id of a.dependencies ?? []) this.kind(id, "spec");
        const data = {
          description: a.description ?? "",
          criteria,
          paths: a.paths ?? [],
          dependencies: a.dependencies ?? [],
          contract: digest({
            title,
            description: a.description,
            criteria,
            paths: a.paths,
            dependencies: a.dependencies,
          }),
          generation: 0,
        };
        const spec = this.create(
          "spec",
          title,
          data,
          actor,
          parent.id,
          "ready",
        );
        this.dependencies(spec.id, a.dependencies ?? []);
        return spec;
      }
      const e = this.kind(requireValue(a.id, "Action needs an id."), "spec");
      if (e.revision !== a.expectedRevision)
        throw new ContextoryError(
          "REVISION_CONFLICT",
          `Read ${e.id} again before changing it.`,
        );
      if (a.action === "complete") {
        if (e.state !== "submitted")
          throw new ContextoryError(
            "INVALID_STATE",
            "Submit a current outcome before requesting completion.",
          );
        for (const id of e.data.dependencies as string[])
          if (this.kind(id, "spec").state !== "completed")
            throw new ContextoryError(
              "DEPENDENCY_OPEN",
              `Dependency ${id} is no longer completed.`,
            );
        this.assertEligible(
          e,
          requireValue(snapshot, "Completion needs a current source snapshot."),
        );
        return this.save(
          e,
          {
            state: "completed",
            data: {
              ...e.data,
              lease: null,
              completedAt: new Date().toISOString(),
            },
          },
          actor,
          "spec.completed",
        );
      }
      requireValue(a.reason, "Explain the reason for this change.");
      if (a.action === "revise" || a.action === "reopen") {
        if (e.state === "implementing" && !actor.human)
          throw new ContextoryError(
            "ACTIVE_ATTEMPT",
            "Release the active lease before revising its contract.",
          );
        if (a.action === "revise" && e.state === "completed")
          throw new ContextoryError(
            "REOPEN_REQUIRED",
            "Reopen completed work before revising it.",
          );
        const criteria =
          a.criteria?.map((text, i) => ({ id: `AC-${i + 1}`, text })) ??
          e.data.criteria;
        const data: Record<string, unknown> = {
          ...e.data,
          description: a.description ?? e.data.description,
          criteria,
          paths: a.paths ?? e.data.paths,
          dependencies: a.dependencies ?? e.data.dependencies,
          lease: null,
          generation: Number(e.data.generation) + 1,
          latestOutcome: null,
          reason: a.reason,
        };
        this.dependencies(e.id, data.dependencies as string[]);
        data.contract = digest({
          title: a.title ?? e.title,
          description: data.description,
          criteria,
          paths: data.paths,
          dependencies: data.dependencies,
          generation: data.generation,
        });
        return this.save(
          e,
          { title: a.title ?? e.title, state: "ready", data },
          actor,
          `spec.${a.action}`,
        );
      }
      return this.save(
        e,
        {
          state: a.action === "cancel" ? "cancelled" : "blocked",
          data: { ...e.data, reason: a.reason, lease: null },
        },
        actor,
        `spec.${a.action}`,
      );
    });
  }
  session(a: Input<"contextory_session_attach">, actor: Actor) {
    return this.ledger.transaction(a.operationId, actor, "session", a, () =>
      this.create(
        "session",
        `${actor.provider ?? "developer"} session`,
        {
          provider: actor.provider ?? "developer",
          nativeSessionId: a.nativeSessionId,
          actor: actor.id,
        },
        actor,
      ),
    );
  }
  lease(a: Input<"contextory_spec_lease">, actor: Actor) {
    return this.ledger.transaction(a.operationId, actor, "lease", a, () => {
      const spec = this.kind(a.specId, "spec");
      const session = this.kind(a.sessionId, "session");
      if (session.data.actor !== actor.id)
        throw new ContextoryError(
          "WRONG_OWNER",
          "This session belongs to another connection/provider.",
        );
      const previous = spec.data.lease as Lease | undefined;
      if (a.action === "claim") {
        if (spec.revision !== a.expectedRevision)
          throw new ContextoryError(
            "REVISION_CONFLICT",
            "Read the latest spec before claiming it.",
          );
        if (["completed", "cancelled"].includes(spec.state))
          throw new ContextoryError(
            "REOPEN_REQUIRED",
            "Reopen this spec before starting another attempt.",
          );
        if (previous && previous.expiresAt > Date.now())
          throw new ContextoryError(
            "LEASE_CONFLICT",
            "This spec already has an active implementation lease.",
          );
        for (const id of spec.data.dependencies as string[])
          if (this.kind(id, "spec").state !== "completed")
            throw new ContextoryError(
              "DEPENDENCY_OPEN",
              `Dependency ${id} is not completed.`,
            );
        const generation = Number(spec.data.generation) + 1;
        const lease: Lease = {
          id: randomUUID(),
          sessionId: session.id,
          actor: actor.id,
          expiresAt: Date.now() + 30 * 60 * 1000,
          generation,
        };
        const claimed = this.save(
          spec,
          {
            state: "implementing",
            data: {
              ...spec.data,
              generation,
              lease,
              latestOutcome: null,
              conversation: {
                projectId: this.ledger.projectId,
                provider: session.data.provider,
                sessionId: session.id,
                nativeSessionId: session.data.nativeSessionId,
                specId: spec.id,
              },
            },
          },
          actor,
          "spec.claimed",
        );
        linkSessionModel(this.ledger, claimed, session);
        return claimed;
      }
      this.assertLease(
        spec.id,
        requireValue(a.leaseId, "Use the current leaseId."),
        actor,
      );
      if (previous!.sessionId !== a.sessionId)
        throw new ContextoryError(
          "WRONG_OWNER",
          "This lease belongs to another session.",
        );
      return this.save(
        spec,
        {
          state: a.action === "release" ? "ready" : spec.state,
          data: {
            ...spec.data,
            lease:
              a.action === "release"
                ? null
                : { ...previous, expiresAt: Date.now() + 30 * 60 * 1000 },
          },
        },
        actor,
        `lease.${a.action}`,
      );
    });
  }
  assertLease(specId: string, leaseId: string, actor: Actor): Entity {
    const e = this.kind(specId, "spec");
    const lease = e.data.lease as Lease | undefined;
    if (
      !lease ||
      lease.id !== leaseId ||
      lease.actor !== actor.id ||
      lease.expiresAt <= Date.now()
    )
      throw new ContextoryError(
        "STALE_LEASE",
        "Claim or renew this spec with your own current session before recording work.",
      );
    if (!["implementing", "submitted"].includes(e.state))
      throw new ContextoryError(
        "INVALID_STATE",
        "This spec is not accepting implementation records.",
      );
    return e;
  }
  finding(a: Input<"contextory_finding_record">, actor: Actor) {
    return this.ledger.transaction(a.operationId, actor, "finding", a, () => {
      const spec = this.assertLease(a.specId, a.leaseId, actor);
      if (a.status === "resolved")
        requireValue(a.resolution, "Explain how the issue was resolved.");
      const data = {
        observation: a.observation,
        impact: a.impact,
        resolution: a.resolution,
        blocking: a.blocking,
        sources: a.sources,
        generation: spec.data.generation,
      };
      if (!a.id)
        return this.create("finding", a.title, data, actor, spec.id, a.status);
      const old = this.kind(a.id, "finding");
      if (old.parentId !== spec.id)
        throw new ContextoryError(
          "WRONG_SPEC",
          "Finding belongs to a different spec.",
        );
      return this.save(
        old,
        { title: a.title, state: a.status, data },
        actor,
        "finding.updated",
        requireValue(
          a.expectedRevision,
          "Finding updates need expectedRevision.",
        ),
      );
    });
  }
  decision(a: Input<"contextory_decision_record">, actor: Actor) {
    return this.ledger.transaction(a.operationId, actor, "decision", a, () => {
      this.assertLease(a.specId, a.leaseId, actor);
      const previous = a.supersedes
        ? this.kind(a.supersedes, "decision")
        : undefined;
      const auto =
        previous &&
        a.impact === "implementation" &&
        previous.data.impact === "implementation" &&
        previous.data.provenance !== "developer";
      if (previous && !auto && !actor.human) {
        const approval = a.approvalId
          ? this.kind(a.approvalId, "knowledge_change")
          : undefined;
        const target = approval
          ? this.kind(String(approval.data.targetId), "knowledge")
          : undefined;
        if (
          !approval ||
          approval.state !== "approved" ||
          approval.parentId !== a.specId ||
          !(approval.data.decisionIds as string[] | undefined)?.includes(
            previous.id,
          ) ||
          (approval.data.content as { description?: string })?.description !==
            a.choice ||
          approval.data.action === "retire" ||
          target?.state !== "approved" ||
          (target.data.content as { description?: string })?.description !==
            a.choice
        )
          throw new ContextoryError(
            "DECISION_APPROVAL_REQUIRED",
            "Propose this process/outcome or unclassified decision conflict in the catalog before implementation. Wait for human approval, then pass its approvalId; decisionIds must name the old decision and the approved description must equal the new choice.",
          );
      }
      const e = this.create(
        "decision",
        a.title,
        {
          choice: a.choice,
          rationale: a.rationale,
          alternatives: a.alternatives,
          consequences: a.consequences,
          sources: a.sources,
          provenance: actor.human ? "developer" : "agent-authored",
          impact: a.impact,
          approvalId: a.approvalId,
          conflictReview: previous
            ? {
                mode: actor.human
                  ? "human"
                  : auto
                    ? "agent-auto"
                    : "human-approved-proposal",
                actor: actor.id,
                supersedes: previous.id,
                reason: a.rationale,
              }
            : undefined,
        },
        actor,
        a.specId,
      );
      if (a.supersedes)
        this.ledger.edge(e.id, a.supersedes, "supersedes", a.rationale);
      return e;
    });
  }
  evidence(
    a: Input<"contextory_evidence_record">,
    actor: Actor,
    snapshot: SourceSnapshot,
  ) {
    return this.ledger.transaction(a.operationId, actor, "evidence", a, () => {
      const spec = this.assertLease(a.specId, a.leaseId, actor);
      this.criteria(spec, a.criteria);
      return this.create(
        "evidence",
        a.title,
        {
          detail: a.detail,
          criteria: a.criteria,
          result: a.result,
          command: a.command,
          origin: "agent-reported",
          contract: spec.data.contract,
          generation: spec.data.generation,
          snapshot,
        },
        actor,
        spec.id,
        a.result,
      );
    });
  }
  criteria(spec: Entity, ids: string[]) {
    const known = (spec.data.criteria as { id: string }[]).map((c) => c.id);
    if (ids.some((id) => !known.includes(id)))
      throw new ContextoryError(
        "UNKNOWN_CRITERION",
        "Evidence references an unknown acceptance criterion.",
      );
  }
  outcome(
    a: Input<"contextory_outcome_submit">,
    actor: Actor,
    snapshot: SourceSnapshot,
  ) {
    return this.ledger.transaction(a.operationId, actor, "outcome", a, () => {
      const spec = this.assertLease(a.specId, a.leaseId, actor);
      if (a.expectedRevision !== spec.revision)
        throw new ContextoryError(
          "REVISION_CONFLICT",
          "Read the latest spec before submitting.",
        );
      this.criteria(
        spec,
        a.criteria.map((c) => c.criterionId),
      );
      if (
        (spec.data.criteria as unknown[]).length !== a.criteria.length ||
        a.criteria.length !== new Set(a.criteria.map((c) => c.criterionId)).size
      )
        throw new ContextoryError(
          "MISSING_CRITERIA",
          "Map evidence for every current acceptance criterion exactly once.",
        );
      for (const item of a.criteria)
        for (const id of item.evidenceIds) {
          const e = this.kind(id, "evidence");
          if (
            e.parentId !== spec.id ||
            !(e.data.criteria as string[]).includes(item.criterionId)
          )
            throw new ContextoryError(
              "WRONG_EVIDENCE",
              "Evidence does not support this spec/criterion.",
            );
        }
      const outcome = this.create(
        "outcome",
        a.summary.slice(0, 200),
        {
          ...a,
          operationId: undefined,
          leaseId: undefined,
          snapshot,
          contract: spec.data.contract,
          generation: spec.data.generation,
          catalogRevisions: a.catalog?.recordIds.map((id) => ({
            id,
            revision: this.ledger.get(id).revision,
          })),
        },
        actor,
        spec.id,
        "submitted",
      );
      return this.save(
        spec,
        {
          state: "submitted",
          data: { ...spec.data, latestOutcome: outcome.id },
        },
        actor,
        "outcome.submitted",
      );
    });
  }
  assertEligible(spec: Entity, snapshot: SourceSnapshot) {
    if (!spec.data.latestOutcome)
      throw new ContextoryError(
        "MISSING_OUTCOME",
        "Submit an outcome with issue/fix/decision explanations first.",
      );
    const outcome = this.kind(String(spec.data.latestOutcome), "outcome");
    for (const entry of (outcome.data.catalogRevisions ?? []) as {
      id: string;
      revision: number;
    }[])
      if (this.ledger.get(entry.id).revision !== entry.revision)
        throw new ContextoryError(
          "STALE_OUTCOME",
          "Catalog definitions changed after submission; review them and submit a fresh outcome.",
        );
    if (
      outcome.data.contract !== spec.data.contract ||
      outcome.data.generation !== spec.data.generation ||
      (outcome.data.snapshot as SourceSnapshot).hash !== snapshot.hash
    )
      throw new ContextoryError(
        "STALE_OUTCOME",
        "The source or spec changed. Submit fresh evidence and an outcome.",
      );
    const pending = this.ledger.db
      .prepare("SELECT data FROM jobs WHERE state IN ('queued','running')")
      .all();
    if (
      pending.some((row) => {
        const job = JSON.parse(String(row.data));
        return (
          job.specId === spec.id && job.generation === spec.data.generation
        );
      })
    )
      throw new ContextoryError(
        "CHECKS_PENDING",
        "Wait for current checks to finish before completing.",
      );
    if (
      this.ledger.db
        .prepare(
          "SELECT id FROM entities WHERE parent_id=? AND kind='finding' AND state!='resolved' AND json_extract(data,'$.blocking')=1 LIMIT 1",
        )
        .get(spec.id)
    )
      throw new ContextoryError(
        "OPEN_FINDINGS",
        "Resolve blocking findings before completing the spec.",
      );
    for (const item of outcome.data.criteria as {
      criterionId: string;
      evidenceIds: string[];
    }[]) {
      const eligible = item.evidenceIds
        .map((id) => this.ledger.get(id))
        .some(
          (e) =>
            e.data.origin === "contextory-runner" &&
            e.state === "passed" &&
            e.data.contract === spec.data.contract &&
            e.data.generation === spec.data.generation &&
            (e.data.snapshot as SourceSnapshot | undefined)?.hash ===
              snapshot.hash &&
            !this.ledger.db
              .prepare(
                "SELECT data FROM entities WHERE kind='evidence' AND parent_id=? AND rowid>(SELECT rowid FROM entities WHERE id=?) AND state!='passed'",
              )
              .all(spec.id, e.id)
              .some((row) => {
                const newer = JSON.parse(String(row.data));
                return (
                  newer.recipeId === e.data.recipeId &&
                  newer.generation === e.data.generation
                );
              }),
        );
      if (!eligible)
        throw new ContextoryError(
          "INELIGIBLE_EVIDENCE",
          `${item.criterionId} needs current independently executed passing evidence. Agent reports remain available for review.`,
        );
    }
  }
}
