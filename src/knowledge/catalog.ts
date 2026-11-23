import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
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
        .filter((e) => e.state === "pending").length,
      note: "Page contextory_catalog_get by path/category and inventory. Observations need review; test links are not execution evidence. Behavioral completeness requires source/UI review, including dynamic behavior and untested gaps.",
    };
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
    if (
      this.ledger
        .all("knowledge_change")
        .some((e) => e.parentId === specId && e.state === "pending")
    )
      throw new ContextoryError(
        "CATALOG_APPROVAL_PENDING",
        "Resolve this spec's pending catalog proposals in the human review UI before completion.",
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
          e.state === "pending" &&
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
    const page = filtered.slice(p.offset, p.offset + p.limit);
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
      sequence,
      ...this.summary(),
      records: await Promise.all(
        page.map(async (e) => ({ ...e, freshness: await this.freshness(e) })),
      ),
      total: filtered.length,
      nextOffset:
        p.offset + page.length < filtered.length
          ? p.offset + page.length
          : null,
      proposals: await Promise.all(
        proposals.slice(p.offset, p.offset + p.limit).map(async (e) => ({
          ...e,
          freshness: await this.freshness(e),
          reviewBlocker:
            this.kind(String(e.data.targetId), "knowledge").revision !==
            e.data.targetRevision
              ? "The definition changed after this proposal. Reject this proposal and ask your agent for a replacement against the current revision."
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
        const old = this.kind(p.id ?? "", "knowledge");
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
        const proposal = this.ledger.create(
          "knowledge_change",
          `${p.action}: ${old.title}`,
          {
            targetId: old.id,
            targetRevision: old.revision,
            before: old.data.content,
            content: p.action === "retire" ? old.data.content : p.content,
            fingerprints,
            action: p.action,
            reason: p.reason,
            provenance: "agent-authored proposal",
          },
          p.specId,
          "pending",
        );
        this.ledger.edge(proposal.id, old.id, "proposes_change", p.reason);
        this.links(proposal, proposal.data.content as Content);
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
        (record.kind === "knowledge_change" && record.state !== "pending")
      )
        throw new ContextoryError(
          "INVALID_STATE",
          "This item has already been reviewed.",
        );
      if (record.kind === "knowledge_change" && p.action !== "reject") {
        const target = this.kind(String(record.data.targetId), "knowledge");
        if (target.revision !== record.data.targetRevision)
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
    )
      throw new ContextoryError(
        "STALE_CATALOG",
        "Sources changed since this item was prepared. Review the changed files, refresh its source snapshot, then approve the refreshed revision.",
      );
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
          reason: p.reason,
          time: new Date().toISOString(),
        };
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
            data: { ...current.data, review },
          });
          this.ledger.audit(
            `catalog.${p.action === "approve" ? "approved" : "rejected"}`,
            current.id,
            actor,
            { revision: result.revision, review },
          );
          return result;
        }
        if (current.state !== "pending")
          throw new ContextoryError(
            "INVALID_STATE",
            "This proposal has already been reviewed.",
          );
        let target: Entity | undefined;
        if (p.action === "approve") {
          const old = this.kind(String(current.data.targetId), "knowledge");
          if (old.revision !== current.data.targetRevision)
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
