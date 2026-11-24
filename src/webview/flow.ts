import { ui, tx } from "../i18n";
import type { FlowGraph } from "../contracts/model";
import { escape, button, badge, sourceButton } from "./html";
import { explorerSvg, mapToolbar } from "./explorer";

export function flowView(
  graph: FlowGraph | undefined,
  selectedId: string,
  drafts: Record<string, string>,
) {
  const node = graph?.nodes.find((n) => n.id === selectedId);
  const edges =
    graph?.edges.filter(
      (e) =>
        !drafts.flowEdge ||
        drafts.flowEdge === "all" ||
        e.kind === drafts.flowEdge,
    ) ?? [];
  const ids = new Set([selectedId]);
  for (const e of edges)
    if (e.from === selectedId || e.to === selectedId) {
      ids.add(e.from);
      ids.add(e.to);
    }
  const nodes =
    graph?.nodes.filter(
      (n) => drafts.flowFocus !== "true" || !node || ids.has(n.id),
    ) ?? [];
  const incoming = graph?.edges.filter((e) => e.to === selectedId) ?? [];
  const outgoing = graph?.edges.filter((e) => e.from === selectedId) ?? [];
  const related = (id: string) => {
    const n = graph?.nodes.find((n) => n.id === id);
    return n
      ? button(
          "node",
          escape(n.label),
          `data-id="${escape(id)}"`,
          "explorer-item",
        )
      : "";
  };
  return ui`<section class="flow-explorer"><div class="section-heading"><div><p class="eyebrow">Follow a possible path</p><h1>Source flow</h1></div>${button("trace", tx("Trace current symbol"), "", "primary")}</div><p class="muted">Start at your editor cursor, select a step, then follow its calls and branches. This is static analysis, not a recorded execution.</p><div class="flow-controls"><label>View<select id="flowView" name="flowView"><option value="flow" ${(drafts.flowView ?? graph?.view ?? "flow") === "flow" ? "selected" : ""}>Calls + branches</option><option value="calls" ${(drafts.flowView ?? graph?.view ?? "flow") === "calls" ? "selected" : ""}>Calls</option></select></label><label>Call depth<input id="flowDepth" name="flowDepth" type="number" min="0" max="12" value="${escape(drafts.flowDepth ?? graph?.limits.callDepth ?? 5)}"></label>${graph ? button("retrace", tx("Refresh")) : ""}${button("cancelAnalysis", tx("Cancel"), "", "text-button")}${graph ? button("exportGraphJson", tx("Export JSON"), "", "small") + button("exportGraphSvg", tx("Export SVG"), "", "small") : ""}</div>
  ${graph?.codebase ? ui`<p class="reference-identity"><strong>Reference: ${escape(graph.codebase.name)}</strong><br>${escape(graph.codebase.root)}</p>` : ""}
  ${
    graph
      ? ui`<div class="graph-summary"><strong>${escape(graph.root.path)}</strong><span>${graph.nodes.length} nodes · ${graph.edges.length} edges · ${graph.durationMs} ms</span>${badge(graph.partial ? "partial" : "bounded")}${graph.unsaved ? badge("unsaved snapshot") : ""}</div><div class="exploration-workspace flow-workspace"><aside class="explorer-tree" aria-label="Flow steps"><h2>Steps in this trace</h2><p class="muted">Select a step to inspect its connections.</p>${graph.nodes.map((n) => button("node", ui`<span>${escape(n.label)}</span><small>${escape(tx(n.kind))}</small>`, `data-id="${escape(n.id)}" aria-pressed="${selectedId === n.id}"`, `explorer-item ${selectedId === n.id ? "active" : ""}`)).join("")}</aside><section class="explorer-main"><div class="explorer-filters"><label>Connections<select name="flowEdge"><option value="all">All connection types</option>${[...new Set(graph.edges.map((e) => e.kind))].map((kind) => ui`<option value="${kind}" ${drafts.flowEdge === kind ? "selected" : ""}>${escape(tx(kind))}</option>`).join("")}</select></label>${button("flowFocus", drafts.flowFocus === "true" ? tx("Show full trace") : tx("Focus selected step"), `aria-pressed="${drafts.flowFocus === "true"}" ${node ? "" : "disabled"}`, "small")}</div>${mapToolbar("flow-canvas")}<div id="flow-canvas" class="diagram-scroll map-canvas" tabindex="0" aria-label="Scroll source flow diagram">${explorerSvg(
          nodes.map((n) => ({
            id: n.id,
            label: n.label,
            kind: n.kind,
            detail: n.source
              ? `${n.source.path.split("/").pop()}:${(n.source.line ?? 0) + 1}`
              : tx("Analysis boundary"),
            level: undefined,
          })),
          edges,
          selectedId,
          "node",
          tx("Possible source flow"),
          "flow-diagram",
        )}</div><div class="map-legend"><span>→ Possible next step / call</span><span>Dashed: call</span><span>Branch / loop: condition</span><span>Red: exception</span></div><p class="muted">${nodes.length} of ${graph.nodes.length} steps visible. Select a step in the list or map; use its connections to continue.</p></section><aside class="explorer-inspector node-detail" aria-label="Flow step inspector">${
          node
            ? ui`<p class="eyebrow">Selected step · ${escape(tx(node.kind))}</p><h2>${escape(node.label)}</h2>${node.source ? sourceButton(node.source) : ui('<p class="muted">No source location available.</p>')}${button("expand", tx("Trace from this node"), `data-id="${escape(node.id)}"`, "small")}<h3>Incoming · ${incoming.length}</h3>${incoming.map((e) => ui`<div class="connection-detail"><span>← ${escape(e.label ?? e.kind)}</span>${related(e.from)}</div>`).join("") || ui('<p class="muted">Start of this bounded trace.</p>')}<h3>Outgoing · ${outgoing.length}</h3>${outgoing.map((e) => ui`<div class="connection-detail"><span>→ ${escape(e.label ?? e.kind)}</span>${related(e.to)}</div>`).join("") || ui('<p class="muted">No outgoing steps in this snapshot.</p>')}${graph.frontier
                .filter((f) => f.nodeId === node.id)
                .map(
                  (f) =>
                    ui`<p class="notice">Boundary: ${escape(f.reason)}</p>`,
                )
                .join("")}`
            : ui(
                "<h2>Inspect a step</h2><p>Select a function, call or condition to see its source and direct connections.</p>",
              )
        }</aside></div><details class="analysis-limits"><summary>Analysis boundaries (${graph.frontier.length})</summary><ul>${graph.frontier.map((f) => ui`<li>${escape(graph.nodes.find((n) => n.id === f.nodeId)?.label)}: ${escape(f.reason)}</li>`).join("")}${graph.gaps.map((gap) => ui`<li>${escape(gap)}</li>`).join("")}</ul></details>`
      : ui`<div class="empty"><div class="empty-symbol" aria-hidden="true">◇</div><h2>Choose a starting point</h2><ol><li>Open a source file and place the cursor inside a function.</li><li>Choose <strong>Trace current symbol</strong> or the editor’s <strong>Trace Flow from Here</strong>.</li><li>Follow the map, inspect a step, and expand where you need detail.</li></ol><p>The default explores five call hops and keeps unresolved paths visible.</p></div>`
  }</section>`;
}
