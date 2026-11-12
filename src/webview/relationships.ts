import type { RelationshipGraph, RelationshipRecord } from "../contracts/model";
import { escape, badge, button, sourceButton } from "./html";

const labels: Record<string, string> = {
  contains: "includes",
  depends_on: "depends on",
  implements: "implements",
  resolves: "resolves",
  validated_by: "is validated by",
  related_to: "is related to",
  supersedes: "supersedes",
};
function record(item: RelationshipRecord, origin: string) {
  return `<div class="relationship-record ${item.id === origin ? "relationship-origin" : ""}"><div class="relationship-meta"><span class="record-kind">${escape(item.kind === "source" ? "File / symbol" : item.kind)}</span>${item.state ? badge(item.state) : ""}</div><h3>${item.kind === "source" || item.kind === "record" ? escape(item.title) : button("openRecord", escape(item.title), `data-id="${escape(item.id)}"`, "record-title-link")}</h3><span class="record-id">${escape(item.id)}${item.revision ? ` &middot; revision ${item.revision}` : ""}</span>${item.description ? `<p>${escape(item.description)}</p>` : ""}${item.sources.length ? `<div class="relationship-sources"><span class="muted">${item.kind === "source" ? "Open source" : "Source references"}</span>${item.sources.map((s) => (/[*?{}]/.test(s.path) ? `<code>${escape(s.path)}</code>` : sourceButton(s))).join("")}</div>` : ""}</div>`;
}
export function relationshipView(graph?: RelationshipGraph): string {
  if (!graph)
    return '<h1>Relationships</h1><p class="muted">Loading related project records...</p>';
  const items = new Map([graph.subject, ...graph.nodes].map((n) => [n.id, n]));
  return `<div class="section-heading"><h1>Relationships</h1>${button("refreshRelationships", "Refresh", "", "small")}</div><p class="muted">How this work connects to requests, milestones, specifications, decisions and source files.</p><section class="relationship-subject" aria-label="Selected record">${record(graph.subject, graph.origin)}</section><div class="section-heading"><h2>Connections</h2><span class="muted">${graph.nodes.length} related records &middot; ${graph.edges.length} connections</span></div>${graph.partial ? `<p class="relationship-boundary" role="status">Showing a bounded view: up to ${graph.limit} related records within ${graph.depth} steps. Some connections are outside these limits.</p>` : ""}<div class="relationship-list">${
    graph.edges
      .map((edge) => {
        const from = items.get(edge.source),
          to = items.get(edge.target);
        if (!from || !to) return "";
        const verb = labels[edge.kind] ?? edge.kind.replaceAll("_", " ");
        return `<article class="relationship-card" aria-label="${escape(from.title)} ${escape(verb)} ${escape(to.title)}"><div class="relationship-endpoints">${record(from, graph.origin)}<div class="relationship-verb"><span aria-hidden="true">&rarr;</span><strong>${escape(verb)}</strong></div>${record(to, graph.origin)}</div>${edge.rationale ? `<p class="relationship-rationale"><strong>Why they are linked:</strong> ${escape(edge.rationale === "Project hierarchy" ? "Part of the request / milestone / specification structure." : edge.rationale)}</p>` : ""}</article>`;
      })
      .join("") ||
    '<p class="muted">No relationships have been recorded for this work yet.</p>'
  }</div><p class="muted relationship-note">Select a record title to open its request in Contextory, or a source reference to open the file.</p>`;
}
