import { readFile, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import {
  conversation,
  reviewDelivery,
  type ReviewMessage,
} from "../core/conversations";
import type { Actor, Entity, SourceRef } from "../contracts/model";
import { ContextoryError } from "../contracts/model";
import type { Input } from "../contracts/tools";
import type { Workflow } from "../core/workflow";
import { digest, type Ledger } from "../storage/ledger";
import { workspaceFiles, workspacePath } from "../verification/workspace";

type Content = NonNullable<Input<"contextory_catalog_change">["content"]>;
type Fingerprint = { path: string; hash: string };
const sourceId = (s: SourceRef) =>
  `source:${s.path}${s.symbol ? `#${s.symbol}` : ""}`;
const normalized = (path: string) =>
  path.replaceAll("\\", "/").replace(/^\.\//, "");

// The ledger stores authoritative revisions; this catalog never rewrites graph facts
// into approved requirements. All native/transport callers share these boundaries.
export class Catalog {
  constructor(
    readonly ledger: Ledger,
    readonly workflow: Workflow,
  ) {}

  private kind(id: string, kind: Entity["kind"]) {
    const record = this.ledger.get(id);
    if (record.kind !== kind)
      throw new ContextoryError("WRONG_KIND", `Expected ${kind}.`);
    return record;
  }
  private async fingerprint(path: string): Promise<Fingerprint> {
    const absolute = await workspacePath(this.ledger.root, path);
    if (!(await stat(absolute)).isFile())
      throw new ContextoryError(
        "INVALID_PATH",
        "Catalog references must identify files.",
      );
    if ((await stat(absolute)).size > 20 * 1024 * 1024)
      throw new ContextoryError(
        "SOURCE_LIMIT",
        "Catalog source exceeds 20 MiB.",
      );
    return {
      path: normalized(path),
      hash: createHash("sha256")
        .update(await readFile(absolute))
        .digest("hex"),
    };
  }
  private async capture(content: Content) {
    return Promise.all(
      [
        ...new Set(
          [...content.sources, ...content.tests].map((s) => normalized(s.path)),
        ),
      ].map((path) => this.fingerprint(path)),
    );
  }
  async freshness(
    record: Entity,
  ): Promise<{ state: string; changed: string[] }> {
    const fingerprints = record.data.fingerprints as Fingerprint[] | undefined;
    if (!fingerprints?.length) return { state: "unknown", changed: [] };
    const changed: string[] = [];
    for (const old of fingerprints) {
      try {
        if ((await this.fingerprint(old.path)).hash !== old.hash)
          changed.push(old.path);
      } catch {
        changed.push(old.path);
      }
    }
    return { state: changed.length ? "stale" : "current", changed };
  }
  summary() {
    const records = this.ledger.all("knowledge");
    return {
      entries: records.length,
      approved: records.filter((e) => e.state === "approved").length,
      observed: records.filter((e) => e.state === "observed").length,
      retired: records.filter((e) => e.state === "retired").length,
      pendingChanges: this.ledger
        .all("knowledge_change")
        .filter((e) => ["pending", "changes_requested"].includes(e.state))
        .length,
      note: "Observations have optional baseline review. Compatible maintenance and implementation conflicts may be agent auto-approved with an explicit rationale; process/outcome conflicts and changed approved behavior require human review before implementation. Page catalog/history for provenance and coverage; auto-approval and test links are not execution evidence.",
    };
  }
  pending() {
    return this.ledger
      .all("knowledge_change")
      .filter((e) => ["pending", "changes_requested"].includes(e.state));
  }
  private targetMatches(proposal: Entity) {
    const target = this.kind(String(proposal.data.targetId), "knowledge");
    if (target.revision === proposal.data.targetRevision) return true;
    if (
      (target.data.sourceRefresh as { mode?: string } | undefined)?.mode !==
      "automatic"
    )
      return false;
    const before = this.ledger.get(
      target.id,
      Number(proposal.data.targetRevision),
    );
    const definition = (record: Entity) => {
      const {
        fingerprints: _fingerprints,
        sourceRefresh: _sourceRefresh,
        ...data
      } = record.data;
      return { title: record.title, state: record.state, data };
    };
    return digest(definition(before)) === digest(definition(target));
  }
  private async currentSnapshot(record: Entity) {
    if (
      !(
        (record.kind === "knowledge" && record.state === "observed") ||
        (record.kind === "knowledge_change" &&
          ["pending", "changes_requested"].includes(record.state))
      ) ||
      record.data.action === "retire"
    )
      return record;
    try {
      const fingerprints = await this.capture(record.data.content as Content);
      if (digest(fingerprints) === digest(record.data.fingerprints))
        return record;
      return this.ledger.transaction(
        randomUUID(),
        { id: "source-observer", human: false },
        "catalog.snapshot",
        { id: record.id, fingerprints },
        () => {
          const latest = this.ledger.get(record.id);
          if (latest.revision !== record.revision) return latest;
          const updated = this.ledger.update(latest, latest.revision, {
            data: {
              ...latest.data,
              fingerprints,
              sourceRefresh: {
                mode: "automatic",
                time: new Date().toISOString(),
              },
            },
          });
          this.ledger.audit(
            "catalog.sources_refreshed",
            latest.id,
            { id: "source-observer", human: false },
            {
              beforeRevision: latest.revision,
              revision: updated.revision,
              mode: "automatic",
            },
          );
          return updated;
        },
      );
    } catch {
      return record;
    } // Missing/unreadable files remain explicit blockers.
  }
  async verify(
    specId: string,
    review?: { recordIds: string[]; explanation: string },
  ) {
    const entries = this.ledger.all("knowledge");
    if (!entries.length) return;
    if (!review)
      throw new ContextoryError(
        "CATALOG_REVIEW_REQUIRED",
        "Record catalog.recordIds and an explanation of additions, changes, retirements or why behavior is unchanged in the outcome.",
      );
    for (const id of review.recordIds) this.kind(id, "knowledge");
    if (this.pending().length)
      throw new ContextoryError(
        "CATALOG_APPROVAL_PENDING",
        "Wait for this project's pending catalog proposals in Approvals before implementation or completion.",
      );
    const paths = ((this.ledger.get(specId).data.paths as string[]) ?? []).map(
      normalized,
    );
    for (const e of entries.filter((e) => e.state === "approved")) {
      const content = e.data.content as Content;
      const affected =
        review.recordIds.includes(e.id) ||
        [...content.sources, ...content.tests].some((s) =>
          paths.some(
            (path) =>
              path === "." ||
              normalized(s.path) === path ||
              normalized(s.path).startsWith(path.replace(/\/$/, "") + "/"),
          ),
        );
      if (affected && (await this.freshness(e)).state !== "current")
        throw new ContextoryError(
          "STALE_CATALOG",
          `Approved definition ${e.id} has changed or missing sources; propose and review its replacement or retirement.`,
        );
    }
  }
  async get(p: Input<"contextory_catalog_get">) {
    const sequence = this.ledger.sequence();
    const matches = (e: Entity) => {
      const c = e.data.content as Content;
      return (
        (!p.category || c.category === p.category) &&
        (!p.path ||
          p.path === "." ||
          [...c.sources, ...c.tests].some(
            (s) =>
              normalized(s.path) === normalized(p.path!) ||
              normalized(s.path).startsWith(
                normalized(p.path!).replace(/\/$/, "") + "/",
              ),
          )) &&
        (!p.query ||
          JSON.stringify(c).toLowerCase().includes(p.query.toLowerCase()))
      );
    };
    const all = this.ledger.all("knowledge");
    const matching = all.filter(matches);
    const proposals = this.ledger
      .all("knowledge_change")
      .filter(
        (e) =>
          ["pending", "changes_requested"].includes(e.state) &&
          matching.some((k) => k.id === e.data.targetId),
      );
    const filtered = p.pendingOnly
      ? matching.filter((e) => e.state === "observed")
      : matching;
    const pendingTargets = new Set(proposals.map((e) => e.data.targetId));
    const priority = (e: Entity) =>
      e.state === "observed" || pendingTargets.has(e.id)
        ? 0
        : e.state === "retired"
          ? 2
          : 1;
    // Sort the complete matching set before paging; stable ties retain ledger order.
    filtered.sort((a, b) => priority(a) - priority(b));
    const page = await Promise.all(
      filtered
        .slice(p.offset, p.offset + p.limit)
        .map((e) => this.currentSnapshot(e)),
    );
    const files = p.inventory
      ? (await workspaceFiles(this.ledger.root)).filter(
          (path) =>
            !p.path ||
            p.path === "." ||
            normalized(path) === normalized(p.path) ||
            normalized(path).startsWith(
              normalized(p.path).replace(/\/$/, "") + "/",
            ),
        )
      : [];
    const described = new Set(
      all
        .filter(
          (e) =>
            e.state !== "retired" &&
            (e.data.content as Content).category === "file",
        )
        .flatMap((e) =>
          (e.data.content as Content).sources.map((s) => normalized(s.path)),
        ),
    );
    return {
      sequence: Math.max(sequence, this.ledger.sequence()),
      ...this.summary(),
      records: await Promise.all(
        page.map(async (e) => ({
          ...e,
          delivery: reviewDelivery(this.ledger, e.id),
          freshness: await this.freshness(e),
        })),
      ),
      total: filtered.length,
      nextOffset:
        p.offset + page.length < filtered.length
          ? p.offset + page.length
          : null,
      proposals: await Promise.all(
        (
          await Promise.all(
            proposals
              .slice(p.offset, p.offset + p.limit)
              .map((e) => this.currentSnapshot(e)),
          )
        ).map(async (e) => ({
          ...e,
          freshness: await this.freshness(e),
          delivery: reviewDelivery(this.ledger, e.id),
          reviewBlocker: !this.targetMatches(e)
            ? "The definition changed after this proposal. Request an update against the current revision or reject this proposal."
            : undefined,
        })),
      ),
      proposalsTotal: proposals.length,
      proposalsNextOffset:
        p.offset + p.limit < proposals.length ? p.offset + p.limit : null,
      inventory: p.inventory
        ? {
            total: files.length,
            described: files.filter((f) => described.has(normalized(f))).length,
            files: files.slice(p.offset, p.offset + p.limit).map((path) => ({
              path,
              described: described.has(normalized(path)),
            })),
            nextOffset:
              p.offset + p.limit < files.length ? p.offset + p.limit : null,
          }
        : undefined,
    };
  }
  private links(record: Entity, content: Content) {
    this.ledger.db
      .prepare(
        "DELETE FROM edges WHERE source=? AND kind IN ('documents','specified_test')",
      )
      .run(record.id);
    for (const source of content.sources)
      this.ledger.edge(
        record.id,
        sourceId(source),
        "documents",
        "Catalog definition source",
      );
    for (const test of content.tests)
      this.ledger.edge(
        record.id,
        sourceId(test),
        "specified_test",
        "Declared test reference; execution not implied",
      );
  }
  async change(p: Input<"contextory_catalog_change">, actor: Actor) {
    this.workflow.assertLease(p.specId, p.leaseId, actor);
    // Recover an exact retry before inspecting sources that may since have changed.
    if (
      this.ledger.db
        .prepare("SELECT id FROM operations WHERE id=?")
        .get(p.operationId)
    )
      return this.ledger.transaction(
        p.operationId,
        actor,
        "catalog.change",
        p,
        () => null,
      );
    if (p.action !== "retire" && !p.content)
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        "Supply the complete replacement content.",
      );
    if (p.action === "create" && (p.id || p.expectedRevision))
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        "Create cannot target an existing record.",
      );
    const fingerprints = p.content ? await this.capture(p.content) : [];
    return this.ledger.transaction(
      p.operationId,
      actor,
      "catalog.change",
      p,
      () => {
        this.workflow.assertLease(p.specId, p.leaseId, actor);
        if (
          p.migrationId &&
          this.kind(p.migrationId, "migration").parentId !== p.specId
        )
          throw new ContextoryError(
            "WRONG_SPEC",
            "Migration lineage belongs to another spec.",
          );
        if (p.action === "create")
          return this.create(
            p.content!,
            fingerprints,
            p.specId,
            p.reason,
            actor,
            p.migrationId,
          );
        const existing = this.ledger.get(p.id ?? "");
        if (existing.kind === "knowledge_change") {
          if (
            !["revise", "retire"].includes(p.action) ||
            existing.parentId !== p.specId ||
            existing.revision !== p.expectedRevision ||
            existing.state !== "changes_requested"
          )
            throw new ContextoryError(
              "REVISION_CONFLICT",
              "Revise the requested proposal under its original spec at its current revision.",
            );
          const target = this.kind(String(existing.data.targetId), "knowledge");
          const content = p.content ?? (target.data.content as Content);
          if (content.category !== (target.data.content as Content).category)
            throw new ContextoryError(
              "INVALID_ARGUMENT",
              "Preserve the entry category.",
            );
          const updated = this.ledger.update(existing, existing.revision, {
            state: "pending",
            title: `${existing.data.action}: ${target.title}`,
            data: {
              ...existing.data,
              content,
              fingerprints,
              reason: p.reason,
              explanation: p.explanation,
              targetRevision: target.revision,
              before: target.data.content,
              beforeFingerprints: target.data.fingerprints,
              action: p.action === "retire" ? "retire" : existing.data.action,
              impact: p.impact,
              compatibility: p.compatibility,
              origin: conversation(this.ledger, this.ledger.get(p.specId)),
              approvalRequired: true,
              review: undefined,
            },
          });
          this.links(updated, content);
          this.ledger.audit("catalog.proposal_updated", updated.id, actor, {
            beforeRevision: existing.revision,
            revision: updated.revision,
            reason: p.reason,
          });
          return updated;
        }
        const old = this.kind(existing.id, "knowledge");
        if (old.revision !== p.expectedRevision)
          throw new ContextoryError(
            "REVISION_CONFLICT",
            "Read the current catalog entry before proposing changes.",
          );
        if (old.state === "retired")
          throw new ContextoryError(
            "INVALID_STATE",
            "Retired entries remain historical; create a new entry and link its predecessor.",
          );
        if (
          p.content &&
          p.content.category !== (old.data.content as Content).category
        )
          throw new ContextoryError(
            "INVALID_ARGUMENT",
            "Preserve the entry category.",
          );
        const decisions = p.decisionIds.map((id) => this.kind(id, "decision"));
        if (
          p.autoApprove &&
          this.pending().some((e) => e.data.targetId === old.id)
        )
          throw new ContextoryError(
            "CATALOG_APPROVAL_PENDING",
            "This definition already has a pending proposal. Wait for its review before creating another change.",
          );
        const before = old.data.content as Content;
        // References/fingerprints are implementation details; approved behavior
        // remains exact. Semantic equivalence of rewritten prose is not inferred.
        const behavior = (c: Content) => ({
          category: c.category,
          description: c.description,
          ui: c.ui,
        });
        const implementationConflict =
          p.compatibility === "conflicting" &&
          p.impact === "implementation" &&
          before.category !== "rule" &&
          decisions.every(
            (d) =>
              d.data.impact === "implementation" &&
              d.data.provenance !== "developer",
          );
        const auto =
          p.autoApprove &&
          p.action === "revise" &&
          p.impact === "implementation" &&
          (p.compatibility === "preserved" || implementationConflict) &&
          (before.category === "file" ||
            digest(behavior(before)) === digest(behavior(p.content!)));
        const review = auto
          ? {
              actor: actor.id,
              mode: "agent-auto",
              reason: p.reason,
              time: new Date().toISOString(),
              compatibility: p.compatibility,
              impact: p.impact,
            }
          : undefined;
        const proposal = this.ledger.create(
          "knowledge_change",
          `${p.action}: ${old.title}`,
          {
            targetId: old.id,
            targetRevision: old.revision,
            before: old.data.content,
            beforeFingerprints: old.data.fingerprints,
            content: p.action === "retire" ? old.data.content : p.content,
            fingerprints,
            action: p.action,
            reason: p.reason,
            explanation: p.explanation,
            origin: conversation(this.ledger, this.ledger.get(p.specId)),
            provenance: "agent-authored proposal",
            compatibility: p.compatibility,
            impact: p.impact,
            autoApproveRequested: p.autoApprove,
            decisionIds: p.decisionIds,
            review,
            approvalRequired: !auto,
          },
          p.specId,
          auto ? "auto_approved" : "pending",
        );
        this.ledger.edge(proposal.id, old.id, "proposes_change", p.reason);
        this.links(proposal, proposal.data.content as Content);
        for (const id of p.decisionIds)
          this.ledger.edge(proposal.id, id, "considers_decision", p.reason);
        if (auto) {
          this.uniqueFile(p.content!, old.id);
          const target = this.ledger.update(old, old.revision, {
            title: p.content!.title,
            state:
              old.state === "approved" &&
              digest(behavior(before)) !== digest(behavior(p.content!))
                ? "observed"
                : old.state,
            data: {
              ...old.data,
              content: p.content,
              fingerprints,
              lastChangeId: proposal.id,
              maintenanceReview: review,
              approvalBaselineRevision:
                old.data.approvalBaselineRevision ??
                (old.state === "approved" ? old.revision : undefined),
              // Preserve the human review on an approved contract, and keep
              // unapproved observations unapproved.
            },
          });
          this.links(target, p.content!);
          const applied = this.ledger.update(proposal, proposal.revision, {
            data: { ...proposal.data, appliedRevision: target.revision },
          });
          this.ledger.audit("catalog.auto_approved", proposal.id, actor, {
            targetId: old.id,
            beforeRevision: old.revision,
            revision: target.revision,
            specId: p.specId,
            review,
          });
          this.ledger.audit("catalog.maintained", old.id, actor, {
            proposalId: proposal.id,
            beforeRevision: old.revision,
            revision: target.revision,
            specId: p.specId,
            review,
          });
          return applied;
        }
        this.ledger.audit("catalog.proposed", proposal.id, actor, {
          targetId: old.id,
          targetRevision: old.revision,
          reason: p.reason,
        });
        return proposal;
      },
    );
  }
  private create(
    content: Content,
    fingerprints: Fingerprint[],
    specId: string,
    reason: string,
    actor: Actor,
    migrationId?: string,
  ) {
    this.uniqueFile(content);
    const record = this.ledger.create(
      "knowledge",
      content.title,
      {
        content,
        fingerprints,
        reason,
        migrationId,
        provenance: "observed; not user-approved",
        origin: conversation(this.ledger, this.ledger.get(specId)),
      },
      specId,
      "observed",
    );
    this.links(record, content);
    this.ledger.audit("catalog.observed", record.id, actor, {
      category: content.category,
      reason,
    });
    return record;
  }
  private uniqueFile(content: Content, exceptId?: string) {
    if (
      content.category === "file" &&
      this.ledger
        .all("knowledge")
        .some(
          (e) =>
            e.id !== exceptId &&
            e.state !== "retired" &&
            (e.data.content as Content).category === "file" &&
            (e.data.content as Content).sources.some(
              (s) => normalized(s.path) === normalized(content.sources[0].path),
            ),
        )
    )
      throw new ContextoryError(
        "DUPLICATE_FILE",
        "Revise the existing file description instead of hiding it behind a duplicate.",
      );
  }
  async review(p: Input<"contextory_catalog_review">, actor: Actor) {
    if (!actor.human)
      throw new ContextoryError(
        "FORBIDDEN",
        "Only the authenticated human review UI can review or refresh catalog definitions.",
      );
    // Exact retries must return their recorded result even after a later source edit.
    if (
      this.ledger.db
        .prepare("SELECT id FROM operations WHERE id=?")
        .get(p.operationId)
    )
      return this.ledger.transaction(
        p.operationId,
        actor,
        "catalog.review",
        p,
        () => null,
      );
    const candidate = this.ledger.get(p.id);
    if (!["knowledge", "knowledge_change"].includes(candidate.kind))
      throw new ContextoryError(
        "WRONG_KIND",
        "Review a catalog baseline or change.",
      );
    const assertReviewable = (record: Entity) => {
      if (record.revision !== p.expectedRevision)
        throw new ContextoryError(
          "REVISION_CONFLICT",
          "This item changed. Reload its latest revision before reviewing it.",
        );
      if (
        (record.kind === "knowledge" && record.state !== "observed") ||
        (record.kind === "knowledge_change" &&
          !["pending", "changes_requested"].includes(record.state))
      )
        throw new ContextoryError(
          "INVALID_STATE",
          "This item has already been reviewed.",
        );
      if (record.state === "changes_requested" && p.action === "approve")
        throw new ContextoryError(
          "INVALID_STATE",
          "Wait for the agent to update this proposal before approving it.",
        );
      if (
        record.kind === "knowledge_change" &&
        !["reject", "feedback"].includes(p.action)
      ) {
        if (!this.targetMatches(record))
          throw new ContextoryError(
            "REVISION_CONFLICT",
            "The definition changed after this proposal. Reject this proposal and ask your agent for a replacement against the current revision.",
          );
      }
    };
    assertReviewable(candidate);
    if (p.action === "refresh" && candidate.data.action === "retire")
      throw new ContextoryError(
        "INVALID_STATE",
        "Retirement proposals can be approved or rejected without refreshing removed sources.",
      );
    const fingerprints =
      p.action === "refresh"
        ? await this.capture(candidate.data.content as Content)
        : undefined;
    if (
      p.action === "approve" &&
      candidate.data.action !== "retire" &&
      (await this.freshness(candidate)).state !== "current"
    ) {
      await this.currentSnapshot(candidate);
      throw new ContextoryError(
        "STALE_CATALOG",
        "Sources changed during review and were refreshed automatically. Check the latest item and try again. Missing files must be restored or removed by the agent.",
      );
    }
    return this.ledger.transaction(
      p.operationId,
      actor,
      "catalog.review",
      p,
      () => {
        const current = this.ledger.get(p.id);
        assertReviewable(current);
        const review = {
          actor: actor.id,
          mode: "human",
          reason: p.reason,
          time: new Date().toISOString(),
        };
        if (p.action !== "refresh") {
          const response: ReviewMessage = {
            id: p.operationId,
            recordId: current.id,
            action: p.action,
            instruction: p.reason,
            origin: current.data.origin as ReviewMessage["origin"],
          };
          this.ledger.audit("catalog.response", current.id, actor, {
            ...response,
          });
        }
        if (p.action === "feedback") {
          const updated = this.ledger.update(current, current.revision, {
            state:
              current.kind === "knowledge_change"
                ? "changes_requested"
                : current.state,
            data: { ...current.data, feedback: review },
          });
          this.ledger.audit("catalog.changes_requested", updated.id, actor, {
            review,
            revision: updated.revision,
          });
          return updated;
        }
        if (p.action === "refresh") {
          const refreshed = this.ledger.update(current, current.revision, {
            data: { ...current.data, fingerprints, sourceRefresh: review },
          });
          this.ledger.audit("catalog.sources_refreshed", current.id, actor, {
            beforeRevision: current.revision,
            revision: refreshed.revision,
            review,
          });
          return refreshed;
        }
        if (current.kind === "knowledge") {
          if (current.state !== "observed")
            throw new ContextoryError(
              "INVALID_STATE",
              "Only an observed baseline can be reviewed directly.",
            );
          const result = this.ledger.update(current, p.expectedRevision, {
            state: p.action === "approve" ? "approved" : "retired",
            data: {
              ...current.data,
              review,
              maintenanceReview: undefined,
              approvalBaselineRevision:
                p.action === "approve"
                  ? current.revision + 1
                  : current.data.approvalBaselineRevision,
            },
          });
          this.ledger.audit(
            `catalog.${p.action === "approve" ? "approved" : "rejected"}`,
            current.id,
            actor,
            { revision: result.revision, review },
          );
          return result;
        }
        if (!["pending", "changes_requested"].includes(current.state))
          throw new ContextoryError(
            "INVALID_STATE",
            "This proposal has already been reviewed.",
          );
        let target: Entity | undefined;
        if (p.action === "approve") {
          const old = this.kind(String(current.data.targetId), "knowledge");
          if (!this.targetMatches(current))
            throw new ContextoryError(
              "REVISION_CONFLICT",
              "The target changed after this proposal. Reject it and propose against the current revision.",
            );
          const content = current.data.content as Content;
          if (current.data.action !== "retire")
            this.uniqueFile(content, old.id);
          target = this.ledger.update(old, old.revision, {
            title: content.title,
            state: current.data.action === "retire" ? "retired" : "approved",
            data: {
              ...old.data,
              content,
              fingerprints: current.data.fingerprints,
              review,
              lastChangeId: current.id,
              maintenanceReview: undefined,
              approvalBaselineRevision:
                current.data.action === "retire"
                  ? old.data.approvalBaselineRevision
                  : old.revision + 1,
            },
          });
          this.links(target, content);
          this.ledger.audit(
            current.data.action === "retire"
              ? "catalog.retired"
              : "catalog.revised",
            target.id,
            actor,
            {
              proposalId: current.id,
              beforeRevision: old.revision,
              revision: target.revision,
              reason: current.data.reason,
              review,
            },
          );
        }
        const proposal = this.ledger.update(current, current.revision, {
          state: p.action === "approve" ? "approved" : "rejected",
          data: { ...current.data, review, appliedRevision: target?.revision },
        });
        this.ledger.audit(
          `catalog.change_${proposal.state}`,
          proposal.id,
          actor,
          { review },
        );
        return { proposal, target };
      },
    );
  }
  async migrate(p: Input<"contextory_catalog_migrate">, actor: Actor) {
    this.workflow.assertLease(p.specId, p.leaseId, actor);
    const previous = p.migrationId
      ? this.kind(p.migrationId, "migration")
      : undefined;
    if (previous && previous.parentId !== p.specId)
      throw new ContextoryError(
        "WRONG_SPEC",
        "Resume this migration under its original spec.",
      );
    const files = previous
      ? (previous.data.files as string[])
      : await workspaceFiles(this.ledger.root);
    const cursor = Number(previous?.data.cursor ?? 0);
    const batch: { content: Content; fingerprints: Fingerprint[] }[] = [];
    const gaps: { path: string; detail: string }[] = [];
    for (const path of files.slice(cursor, cursor + p.limit)) {
      try {
        const symbols = this.ledger.db
          .prepare(
            "SELECT label FROM code_nodes WHERE path=? AND kind NOT IN ('file','module') LIMIT 8",
          )
          .all(path)
          .map((r) => String(r.label));
        batch.push({
          content: {
            category: "file",
            title: path,
            description: symbols.length
              ? `Contains ${symbols.join(", ")}. Generated from static symbols; inspect callers and source to explain its responsibility.`
              : `File ${path}. Responsibility requires source review; no supported symbols were available.`,
            sources: [{ path }],
            tests: [],
          },
          fingerprints: [await this.fingerprint(path)],
        });
      } catch (error) {
        gaps.push({ path, detail: (error as Error).message });
      }
    }
    return this.ledger.transaction(
      p.operationId,
      actor,
      "catalog.migrate",
      p,
      () => {
        this.workflow.assertLease(p.specId, p.leaseId, actor);
        const run = previous
          ? this.kind(previous.id, "migration")
          : this.ledger.create(
              "migration",
              "Existing-project catalog migration",
              { files, cursor: 0, manifestHash: digest(files), gaps: [] },
              p.specId,
              "running",
            );
        if (Number(run.data.cursor) !== cursor)
          throw new ContextoryError(
            "REVISION_CONFLICT",
            "Migration advanced; read the current run before resuming.",
          );
        const created: string[] = [];
        for (const item of batch) {
          const path = item.content.sources[0].path;
          const exists = this.ledger
            .all("knowledge")
            .some(
              (e) =>
                e.state !== "retired" &&
                (e.data.content as Content).category === "file" &&
                (e.data.content as Content).sources.some(
                  (s) => normalized(s.path) === normalized(path),
                ),
            );
          if (!exists)
            created.push(
              this.create(
                item.content,
                item.fingerprints,
                p.specId,
                "Migration bootstrap; requires semantic review",
                actor,
                run.id,
              ).id,
            );
        }
        const next = Math.min(files.length, cursor + p.limit);
        const result = this.ledger.update(run, run.revision, {
          state: next === files.length ? "scanned" : "running",
          data: {
            ...run.data,
            cursor: next,
            gaps: [...(run.data.gaps as unknown[]), ...gaps],
            note: "File scan only. Use the migration agent to inspect source and tests and create rule/feature/UI candidates. Review missing/new/stale files via inventory; no behavioral completeness or approval inferred.",
          },
        });
        this.ledger.audit("catalog.migrated", run.id, actor, {
          cursor: next,
          total: files.length,
          created: created.length,
          gaps: gaps.length,
        });
        return {
          migration: result,
          createdIds: created,
          next: next < files.length ? { migrationId: run.id } : null,
          total: files.length,
          scanned: next,
        };
      },
    );
  }
}
