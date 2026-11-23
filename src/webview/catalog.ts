import type { Entity, SourceRef } from "../contracts/model";
import { badge, button, escape, sourceButton } from "./html";

export type CatalogRecord = Entity & {
  freshness?: { state: string; changed: string[] };
  reviewBlocker?: string;
};
export interface CatalogFeedback {
  state: "pending" | "error" | "success";
  text: string;
  revision: number;
}
export interface CatalogPage {
  entries: number;
  approved: number;
  observed: number;
  retired: number;
  pendingChanges: number;
  records: CatalogRecord[];
  proposals: CatalogRecord[];
  nextOffset: number | null;
  proposalsNextOffset: number | null;
  proposalsTotal?: number;
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
function feedback(value?: CatalogFeedback) {
  return value
    ? `<p class="catalog-feedback ${value.state}" role="${value.state === "error" ? "alert" : "status"}">${escape(value.text)}</p>`
    : "";
}
function review(
  record: CatalogRecord,
  drafts: Record<string, string>,
  status?: CatalogFeedback,
) {
  const waiting =
    status?.state === "pending" ||
    (status?.state === "success" && status.revision === record.revision);
  const needsSnapshot =
    record.data.action !== "retire" &&
    ["stale", "unknown"].includes(record.freshness?.state ?? "");
  const action = (value: string, disabled: boolean) =>
    `data-id="${record.id}" data-revision="${record.revision}" data-review="${value}" ${disabled ? "disabled" : ""}`;
  return `<section class="catalog-review" aria-label="Review ${escape(record.title)}">
    ${needsSnapshot ? `<div class="catalog-source-warning"><strong>Sources need review</strong><p>Open the changed files and check that this definition still describes them. Refresh the source snapshot before approving. Refreshing keeps the item pending.</p>${record.freshness?.changed.map((path) => sourceButton({ path })).join(" ") ?? ""}</div>` : ""}
    ${record.reviewBlocker ? `<p class="catalog-feedback error" role="alert">${escape(record.reviewBlocker)}</p>` : ""}
    ${feedback(status)}
    <label>Review reason<textarea name="catalogReason-${record.id}" maxlength="12000" required ${waiting ? "disabled" : ""}>${escape(drafts[`catalogReason-${record.id}`] ?? "")}</textarea></label>
    <div class="detail-actions">${needsSnapshot ? button("catalogReview", "Refresh source snapshot", action("refresh", Boolean(waiting || record.reviewBlocker))) : ""}${button("catalogReview", record.kind === "knowledge" ? "Approve baseline" : "Approve change", action("approve", Boolean(waiting || needsSnapshot || record.reviewBlocker)), "primary")}${button("catalogReview", "Reject", action("reject", Boolean(waiting)))}</div></section>`;
}
function recordView(
  r: CatalogRecord,
  drafts: Record<string, string>,
  status?: CatalogFeedback,
  allowReview = false,
) {
  return `<article class="record" data-catalog-id="${r.id}">${badge(r.state)} ${badge(r.freshness?.state ?? "unknown")}<p>${escape(r.id)} &middot; revision ${r.revision}</p>${definition(r.data.content)}${allowReview && r.state === "observed" ? review(r, drafts, status) : feedback(status)}${button("history", "Definition history", `data-id="${r.id}"`, "text-button")}${button("impact", "Relationships", `data-id="${r.id}"`, "text-button")}</article>`;
}
export type ApprovalsPage = Omit<CatalogPage, "inventory">;

function proposalView(
  p: CatalogRecord,
  drafts: Record<string, string>,
  status?: CatalogFeedback,
) {
  return `<article class="record" data-catalog-id="${p.id}"><p>${escape(p.id)} &middot; ${escape(p.data.action)} &middot; target revision ${escape(p.data.targetRevision)}</p><h3>Reason</h3><p>${escape(p.data.reason)}</p><details><summary>Before</summary>${definition(p.data.before)}</details><details open><summary>${p.data.action === "retire" ? "Definition to retire" : "After"}</summary>${definition(p.data.content)}</details>${review(p, drafts, status)}</article>`;
}
function pagination(offset: number, next: boolean) {
  return `<div class="detail-actions">${offset ? button("catalogPrevious", "Previous page") : ""}${next ? button("catalogNext", "Next page") : ""}</div>`;
}
export function approvalsView(
  page: ApprovalsPage | undefined,
  drafts: Record<string, string>,
  offset: number,
  statuses: Record<string, CatalogFeedback> = {},
) {
  const baselines = page?.records.filter((r) => r.state === "observed") ?? [];
  const proposals = page?.proposals ?? [];
  return `<section class="approvals-view"><div class="section-heading"><h1>Approvals</h1>${button("catalogRefresh", "Refresh", "", "small")}</div><p>Review the changes that need your decision.</p>${
    !page
      ? '<p role="status">Loading pending approvals...</p>'
      : `<p class="approval-summary">${page.observed + page.pendingChanges} items awaiting review</p>${
          !baselines.length && !proposals.length
            ? `<div class="empty"><h2>No pending approvals</h2><p>You are up to date. Browse definitions and source coverage in Knowledge.</p>${button("navigate", "Open Knowledge", 'data-screen="catalog"')}</div>`
            : `${proposals.length ? `<h2>Pending changes</h2>${proposals.map((p) => proposalView(p, drafts, statuses[p.id])).join("")}` : ""}${baselines.length ? `<h2>Definitions awaiting review</h2>${baselines.map((r) => recordView(r, drafts, statuses[r.id], true)).join("")}` : ""}`
        }${pagination(offset, page.nextOffset !== null || page.proposalsNextOffset !== null)}`
  }</section>`;
}
export function catalogView(
  page: CatalogPage | undefined,
  drafts: Record<string, string>,
  offset: number,
) {
  return `<section class="catalog-view"><div class="section-heading"><h1>Project knowledge</h1>${button("catalogRefresh", "Refresh", "", "small")}</div><p>Browse project definitions, their sources, history and file coverage.</p>${button("navigate", "Open Approvals", 'data-screen="approvals"', "small")}<details class="catalog-search" ${drafts.catalogSearchOpen === "true" ? "open" : ""}><summary>Find definitions & coverage</summary><form id="catalog-form"><label>Find a definition<input name="catalogQuery" value="${escape(drafts.catalogQuery ?? "")}"></label><label>File or directory<input name="catalogPath" value="${escape(drafts.catalogPath ?? "")}"></label><label>Category<select name="catalogCategory">${[
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
    )}</select></label><button type="submit">Search knowledge</button></form></details>${
    !page
      ? '<p role="status">Loading project knowledge...</p>'
      : `<p>${page.entries} entries &middot; ${page.approved} approved &middot; ${page.observed} observed &middot; ${page.retired} retired.</p><p class="muted">Test references describe intended validation. Execution evidence remains in the specification. File counts do not prove complete rule or interface coverage.</p><h2>Definitions</h2>${page.records.map((r) => recordView(r, drafts)).join("") || "<p>No definitions match.</p>"}<details class="catalog-inventory"><summary>Source coverage & file inventory</summary><p>${page.inventory.described} of ${page.inventory.total} files have a catalog entry in this path scope. Generated descriptions still need semantic review.</p><ul>${page.inventory.files.map((f) => `<li>${sourceButton({ path: f.path })} &middot; ${f.described ? "indexed" : "description missing"}</li>`).join("")}</ul></details>${pagination(offset, page.nextOffset !== null || page.inventory.nextOffset !== null)}`
  }</section>`;
}
