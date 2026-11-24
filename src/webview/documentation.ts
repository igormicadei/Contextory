import { ui, tx, language } from "../i18n";
import type { DocumentationSection } from "../documentation/reader";
import { escape, button, badge, sourceButton } from "./html";

export interface DocumentationPage {
  state: string;
  name?: string;
  schemaVersion?: number;
  corpusFingerprint?: string;
  sections: DocumentationSection[];
  total: number;
  nextOffset: number | null;
  note: string;
}
export function documentationView(
  page: DocumentationPage | undefined,
  drafts: Record<string, string>,
  offset: number,
  error: string,
  loading: boolean,
  job:
    | {
        state: string;
        data?: {
          action?: string;
          error?: string;
          result?: unknown;
          artifact?: string;
        };
      }
    | undefined,
) {
  const docsLocale = drafts.docsLocale || language();
  return ui`<section class="documentation-view"><div class="section-heading"><div><h1>Project documentation</h1><p>Understand what an area does and why it works that way.</p></div>${button("docsRefresh", tx("Refresh"), "", "small")}</div>
  <form id="documentation-form"><label>Find an explanation<input name="docsQuery" value="${escape(drafts.docsQuery ?? "")}" placeholder="A feature, behavior or decision"></label><div class="docs-filters"><label>Source path<input name="docsPath" value="${escape(drafts.docsPath ?? "")}" placeholder="Optional file or directory"></label><label>Language<select name="docsLocale"><option value="en" ${docsLocale !== "pt-BR" ? "selected" : ""}>English</option><option value="pt-BR" ${docsLocale === "pt-BR" ? "selected" : ""}>Português brasileiro</option></select></label></div><button type="submit">Find documentation</button></form>
  ${drafts.docsRecord ? ui`<p>Related to ${escape(drafts.docsRecord)} ${button("docsClearRecord", tx("Show all documentation"), "", "text-button")}</p>` : ""}
  ${error ? ui`<div role="alert" class="catalog-feedback error"><span>${escape(error)}</span> ${button("docsRefresh", tx("Try again"), "", "small")}</div>` : ""}
  ${loading ? ui('<p role="status">Loading documentation…</p>') : ""}
  ${!page ? "" : page.state === "missing" ? ui('<div class="empty"><h2>No project documentation yet</h2><p>Ask your agent to use the bundled contextory-documentation skill. It maps the project, writes explanations in English and Portuguese, and builds a local Carbon website. Existing documentation is preserved.</p></div>') : ui`${badge(page.state)}<p>${page.total} matching sections · ${escape(page.name ?? "")}</p>${page.sections.map((s) => ui`<article class="record documentation-section" data-docs-id="${escape(s.id)}"><p class="muted">${escape(s.pageTitle)} · ${escape(s.pageId)}#${escape(s.sectionId)}</p><h2>${escape(s.title)}</h2>${badge(s.freshness.state)}${s.freshness.changed.length ? ui`<p class="catalog-feedback error">Review needed: ${s.freshness.changed.map(escape).join(", ")}</p>` : ""}<div class="documentation-prose">${escape(s.text)}</div>${s.truncated ? ui('<p class="muted">Excerpt shortened. Open the corpus for the full section.</p>') : ""}<p>Sources: ${s.sources.map(sourceButton).join(" ") || tx("No source references recorded.")}</p>${s.records.length ? ui`<p>Related records: ${s.records.map((r) => button("select", escape(r.title), `data-id="${escape(r.id)}"`, "text-button") + ` ${badge(r.state)}`).join(" ")}</p>` : ""}<p class="muted">${escape(tx(s.provenance))}${s.association ? ui` Linked ${escape(s.association.time)}: ${escape(s.association.reason)}` : ""}</p></article>`).join("") || ui("<p>No explanations match. Broaden the query or source path.</p>")}<div class="detail-actions">${offset ? button("docsPrevious", tx("Previous page")) : ""}${page.nextOffset !== null ? button("docsNext", tx("Next page")) : ""}</div><p class="muted">${escape(tx(page.note))}</p>`}
  <details class="documentation-maintenance" ${drafts.docsMaintenanceOpen === "true" ? "open" : ""}><summary>Keep documentation current</summary><p>Stale source references identify explanations to review with your agent. Link sections to decisions, definitions and work records to keep change history connected. A successful build does not approve the content.</p><div class="detail-actions">${button("docsOperation", tx("Check documentation"), 'data-operation="validate"', "small")}${button("docsOperation", tx("Map documentation sources"), 'data-operation="map"', "small")}${sourceButton({ path: ".documentation/project.json" })}</div><p>Generation uses the bundled runtime and local Carbon assets. Python 3.11+ is needed for these operations.</p>${job ? ui`<div role="status"><strong>${escape(job.data?.action ?? tx("Documentation operation"))}: ${escape(job.state === "passed" && (job.data?.result as { valid?: boolean } | undefined)?.valid === false ? "needs review" : job.state)}</strong>${job.data?.error ? ui`<p>${escape(job.data.error)}</p>` : ""}${job.data?.result ? ui`<pre tabindex="0">${escape(JSON.stringify(job.data.result, null, 2).slice(0, 10000))}</pre>` : ""}${job.data?.artifact ? ui`<p>Retained artifact: ${escape(job.data.artifact)}</p>` : ""}</div>` : ""}</details></section>`;
}
