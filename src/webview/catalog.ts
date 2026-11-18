import type { Entity, SourceRef } from "../contracts/model";
import { badge, button, escape, sourceButton } from "./html";

export interface CatalogPage {
  entries: number;
  approved: number;
  observed: number;
  retired: number;
  pendingChanges: number;
  records: (Entity & { freshness: { state: string; changed: string[] } })[];
  proposals: Entity[];
  nextOffset: number | null;
  proposalsNextOffset: number | null;
  total: number;
  inventory: {
    total: number;
    described: number;
    files: { path: string; described: boolean }[];
    nextOffset: number | null;
  };
}
function definition(value: unknown) {
  const content = value as {
    category: string;
    title: string;
    description: string;
    sources: SourceRef[];
    tests: SourceRef[];
    testGap?: string;
    ui?: Record<string, string>;
  };
  return `<h3>${escape(content.title)}</h3><p>${escape(content.category)} &middot; ${escape(content.description)}</p>${
    content.ui
      ? `<dl>${Object.entries(content.ui)
          .map(
            ([key, value]) =>
              `<dt>${escape(key)}</dt><dd>${escape(value)}</dd>`,
          )
          .join("")}</dl>`
      : ""
  }<p>Sources: ${content.sources.map(sourceButton).join(" ")}</p><p>Tests: ${content.tests.map(sourceButton).join(" ") || escape(content.testGap || "No test references recorded for this file.")}</p>`;
}
function review(record: Entity, drafts: Record<string, string>) {
  return `<label>Review reason<textarea name="catalogReason-${record.id}" maxlength="12000" required>${escape(drafts[`catalogReason-${record.id}`] ?? "")}</textarea></label><div class="detail-actions">${button("catalogReview", record.kind === "knowledge" ? "Approve baseline" : "Approve change", `data-id="${record.id}" data-revision="${record.revision}" data-review="approve"`, "primary")}${button("catalogReview", "Reject", `data-id="${record.id}" data-revision="${record.revision}" data-review="reject"`)}</div>`;
}
export function catalogView(
  page: CatalogPage | undefined,
  drafts: Record<string, string>,
  offset: number,
) {
  return `<section class="catalog-view"><div class="section-heading"><h1>Project knowledge</h1>${button("catalogRefresh", "Refresh", "", "small")}</div><p>File responsibilities, rules, features and interface contracts. Observations await your review. Approval preserves the exact definition and sources; every replacement or retirement keeps its history.</p><form id="catalog-form"><label>Find a definition<input name="catalogQuery" value="${escape(drafts.catalogQuery ?? "")}"></label><label>File or directory<input name="catalogPath" value="${escape(drafts.catalogPath ?? "")}"></label><label>Category<select name="catalogCategory">${[
    ["", "All categories"],
    ["file", "Files"],
    ["rule", "Rules"],
    ["feature", "Features"],
    ["ui", "Interface"],
  ]
    .map(
      ([v, label]) =>
        `<option value="${v}" ${drafts.catalogCategory === v ? "selected" : ""}>${label}</option>`,
    )
    .join(
      "",
    )}</select></label><button type="submit">Search knowledge</button></form>${!page ? '<p role="status">Loading project knowledge...</p>' : `<p>${page.entries} entries &middot; ${page.approved} approved &middot; ${page.observed} observed &middot; ${page.retired} retired &middot; ${page.pendingChanges} pending changes.</p><p class="muted">Test references describe intended validation. Execution evidence remains in the specification. File counts do not prove complete rule or interface coverage.</p><h2>Pending changes</h2>${page.proposals.map((p) => `<article class="record"><p>${escape(p.id)} &middot; ${escape(p.data.action)} &middot; target revision ${escape(p.data.targetRevision)}</p><h3>Reason</h3><p>${escape(p.data.reason)}</p><details><summary>Before</summary>${definition(p.data.before)}</details><details open><summary>${p.data.action === "retire" ? "Definition to retire" : "After"}</summary>${definition(p.data.content)}</details>${review(p, drafts)}</article>`).join("") || "<p>No pending changes on this page.</p>"}<h2>Definitions</h2>${page.records.map((r) => `<article class="record">${badge(r.state)} ${badge(r.freshness.state)}<p>${escape(r.id)} &middot; revision ${r.revision}</p>${definition(r.data.content)}${r.freshness.changed.length ? `<p>Changed or missing sources: ${escape(r.freshness.changed.join(", "))}</p>` : ""}${r.state === "observed" ? review(r, drafts) : ""}${button("history", "Definition history", `data-id="${r.id}"`, "text-button")}${button("impact", "Relationships", `data-id="${r.id}"`, "text-button")}</article>`).join("") || "<p>No definitions match. Ask your native agent to use the contextory-migrate skill for an existing project.</p>"}<h2>File inventory</h2><p>${page.inventory.described} of ${page.inventory.total} files have a catalog entry in this path scope. Generated descriptions still need semantic review.</p><ul>${page.inventory.files.map((f) => `<li>${sourceButton({ path: f.path })} &middot; ${f.described ? "indexed" : "description missing"}</li>`).join("")}</ul><div class="detail-actions">${offset ? button("catalogPrevious", "Previous page") : ""}${page.nextOffset !== null || page.proposalsNextOffset !== null || page.inventory.nextOffset !== null ? button("catalogNext", "Next page") : ""}</div>`}</section>`;
}
