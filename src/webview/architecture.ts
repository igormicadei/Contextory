import { ui, tx, language } from "../i18n";
import type { CodeQueries } from "../codebase/queries";
import type { CodebaseInfo } from "../contracts/model";
import { escape, button, badge, sourceButton } from "./html";
import { explorerSvg, mapToolbar } from "./explorer";
export type Architecture = ReturnType<CodeQueries["architecture"]>;
export type CodeContext = Awaited<ReturnType<CodeQueries["context"]>>;
export interface ArchitectureState {
  contextQuery: string;
  scope: string;
  file: string;
  selected: string;
  mode: "map" | "matrix";
  relation: string;
  direction: string;
  loading: boolean;
  error: string;
}
export const initialArchitectureState = (): ArchitectureState => ({
  contextQuery: "",
  scope: "",
  file: "",
  selected: "",
  mode: "map",
  relation: "all",
  direction: "both",
  loading: false,
  error: "",
});
const pick = (id: string, text: string, active = false) =>
  button(
    "architectureSelect",
    escape(text),
    `data-id="${escape(id)}" aria-pressed="${active}"`,
    `explorer-item ${active ? "active" : ""}`,
  );

function matrix(value: Architecture) {
  const groups = value.subsystems;
  const counts = new Map(
    value.dependencies.map((d) => [`${d.from}\0${d.to}`, d.count]),
  );
  const max = Math.max(1, ...value.dependencies.map((d) => d.count));
  return ui`<div class="dependency-matrix" tabindex="0" aria-label="Directional subsystem dependencies"><table><caption>Rows depend on columns. Counts include indexed calls, imports, inheritance and re-exports. Select a cell to explore its source subsystem.</caption><thead><tr><th scope="col">From ↓ / to →</th>${groups.map((s) => ui`<th scope="col">${escape(s.name)}</th>`).join("")}</tr></thead><tbody>${groups
    .map(
      (a) =>
        ui`<tr><th scope="row">${escape(a.name)}</th>${groups
          .map((b) => {
            const count = counts.get(`${a.name}\0${b.name}`) ?? 0;
            const reciprocal =
              count > 0 && counts.has(`${b.name}\0${a.name}`);
            return ui`<td class="heat-${count ? Math.max(1, Math.ceil((count / max) * 4)) : 0}">${count ? button("architectureScope", `${count}${reciprocal ? " ↔" : ""}`, ui`data-path="${escape(a.name)}" aria-label="${escape(ui`${a.name} depends on ${b.name}: ${count} links${reciprocal ? tx("; reciprocal dependency") : ""}`)}"`, "matrix-cell") : ui('<span aria-label="No indexed dependency">—</span>')}</td>`;
          })
          .join("")}</tr>`,
    )
    .join(
      "",
    )}</tbody></table></div><p class="map-legend"><span>Light → dark: fewer → more links</span><span>↔ Reciprocal direct dependency</span></p>`;
}

export function architectureView(
  value: Architecture | undefined,
  context: CodeContext | undefined,
  query: string,
  only: boolean,
  state: ArchitectureState,
  references: CodebaseInfo[] = [],
  codebaseId = "current",
) {
  const reference = references.find((r) => r.id === codebaseId);
  const status = value?.status,
    scope = value?.subsystems.find((s) => s.name === state.scope);
  const selected = context?.symbols.find((s) => s.id === state.selected);
  const relations =
    context?.relationships.filter(
      (e) =>
        (state.relation === "all"
          ? !["contains", "references"].includes(e.kind)
          : state.relation === e.kind) &&
        (!selected ||
          (state.direction === "incoming"
            ? e.target === selected.id
            : state.direction === "outgoing"
              ? e.source === selected.id
              : e.source === selected.id || e.target === selected.id)),
    ) ?? [];
  const neighborIds = new Set(relations.flatMap((e) => [e.source, e.target]));
  if (selected) neighborIds.add(selected.id);
  const sourceResults = context?.symbols ?? [];
  const symbols = selected
    ? sourceResults.filter((s) => neighborIds.has(s.id))
    : sourceResults;
  const groups = value?.subsystems.slice(0, 16) ?? [];
  const graphNodes = context
    ? symbols.slice(0, 30).map((s) => ({
        id: s.id,
        label: s.name,
        kind: s.kind,
        detail: `${s.path}:${s.line + 1}`,
      }))
    : groups.map((s) => ({
        id: s.name,
        label: s.name === "." ? tx("Project root") : s.name,
        kind: "subsystem",
        detail: ui`${s.files} files · ${s.symbols} symbols`,
      }));
  const graphEdges = context
    ? relations.map((e) => ({
        from: e.source,
        to: e.target,
        kind: e.kind,
        label: e.category === "inferred" ? ui`${e.kind} · inferred` : e.kind,
      }))
    : (value?.dependencies.map((d) => ({
        from: d.from,
        to: d.to,
        kind: "dependency",
        label: ui`${d.count} links`,
      })) ?? []);
  return ui`<section class="architecture-view"><div class="section-heading"><div><p class="eyebrow">Understand your codebase</p><h1>Architecture</h1><p class="muted">Start with a subsystem. Follow its files, symbols and connections.</p></div><div>${only ? "" : button("architecturePanel", tx("Open workbench"), "", "small")}${button("architectureRefresh", tx("Refresh code index"), "", "small")}${!reference ? button("openDocumentation", tx("Explain this area"), `data-path="${escape(selected?.path || state.file || (state.scope === "." ? "" : state.scope))}"`, "small") : ""}</div></div>
  <div class="reference-codebases"><label>Codebase<select name="architectureCodebase"><option value="current" ${codebaseId === "current" ? "selected" : ""}>Current project</option>${references.map((r) => ui`<option value="${escape(r.id)}" ${r.id === codebaseId ? "selected" : ""}>${escape(r.name)} &middot; reference</option>`).join("")}</select></label>${button("referenceAdd", tx("Add reference"), "", "small")}${reference ? button("referenceRemove", tx("Detach reference"), "", "small") : ""}</div>
  ${reference ? ui`<p class="reference-identity"><strong>Reference: ${escape(reference.name)}</strong><br>${escape(reference.root)}<br>Read-only analysis. Source and project records stay separate. Use this knowledge in the current project only when requested.</p>` : ""}
  <div class="architecture-state" role="status">${badge(status?.state ?? "empty")} ${status ? ui`${status.files} files · ${status.symbols} symbols · ${status.edges} relationships` : tx("Preparing the local code graph…")}${status?.indexedAt ? ui`<span class="muted">Updated ${escape(new Date(status.indexedAt).toLocaleString(language()))}</span>` : ""}</div>
  ${status?.partial ? ui`<details class="analysis-limits"><summary>Coverage is partial · ${status.gaps.length} notices</summary><ul>${status.gaps.map((g) => ui`<li>${escape(g)}</li>`).join("")}</ul></details>` : ""}
  <form id="code-context-form" class="search-box"><label class="sr-only" for="codeQuery">Find a symbol or describe a task</label><input id="codeQuery" name="codeQuery" type="search" placeholder="Find a symbol or describe a task…" value="${escape(query)}" required><button type="submit">Find context</button></form>
  <nav class="explorer-breadcrumbs" aria-label="Architecture location">${button("architectureHome", tx("Project"), "", "text-button")}${state.scope ? ui`<span>/</span>${button("architectureScope", escape(state.scope), `data-path="${escape(state.scope)}"`, "text-button")}` : ""}${state.file ? ui`<span>/</span><span>${escape(state.file.split("/").pop())}</span>` : ""}${selected ? ui`<span>/</span><strong>${escape(selected.name)}</strong>` : ""}${context ? button("architectureBack", tx("← Back"), "", "small") : ""}</nav>
  ${state.loading ? ui('<p class="muted" role="status">Loading source context…</p>') : ""}${state.error ? ui`<p role="alert">${escape(state.error)}</p>` : ""}
  <div class="exploration-workspace"><aside class="explorer-tree" aria-label="Repository explorer"><h2>${scope ? tx("File shortcuts") : tx("Subsystems")}</h2>${scope ? ui`${button("architectureHome", tx("← All subsystems"), "", "text-button")}<p class="muted">${scope.paths.length} of ${scope.files} indexed files. Search within this scope for more.</p>${scope.paths.map((p) => button("architectureFile", escape(p.split("/").pop()), ui`data-path="${escape(p)}" title="${escape(p)}" aria-pressed="${state.file === p}"`, `explorer-item ${state.file === p ? "active" : ""}`)).join("")}` : value?.subsystems.map((s) => button("architectureScope", ui`<span>${escape(s.name === "." ? tx("Project root") : s.name)}</span><small>${s.files} files</small>`, `data-path="${escape(s.name)}"`, "explorer-item")).join("") || ui('<p class="muted">Readable project files appear after indexing.</p>')}${context ? ui`<h2>Symbols in context</h2>${sourceResults.map((s) => pick(s.id, `${s.name} · ${s.kind}`, s.id === state.selected)).join("")}` : ""}</aside>
  <section class="explorer-main"><div class="section-heading"><div><h2>${context ? (selected ? tx("Symbol neighborhood") : tx("Source context")) : tx("Subsystem map")}</h2><p class="muted">${context ? tx("Select a symbol to isolate its direct indexed connections.") : tx("Arrows point from a subsystem to the one it depends on.")}</p></div><div class="view-switch" role="group" aria-label="Architecture visualization">${button("architectureMode", tx("Map"), `data-mode="map" aria-pressed="${state.mode === "map"}"`, "small")}${button("architectureMode", tx("Matrix"), `data-mode="matrix" aria-pressed="${state.mode === "matrix"}"`, "small")}</div></div>
  ${
    state.mode === "matrix" && value
      ? matrix(value)
      : ui`${
          context
            ? ui`<div class="explorer-filters"><label>Relationships<select name="architectureRelation"><option value="all">Calls, imports & structure</option>${[...new Set(context.relationships.map((e) => e.kind))].map((kind) => ui`<option value="${escape(tx(kind))}" ${state.relation === kind ? "selected" : ""}>${escape(tx(kind))}</option>`).join("")}</select></label><label>Direction<select name="architectureDirection">${[
                ["both", tx("Both directions")],
                ["incoming", tx("Incoming · callers")],
                ["outgoing", tx("Outgoing · dependencies")],
              ]
                .map(
                  ([id, label]) =>
                    ui`<option value="${id}" ${state.direction === id ? "selected" : ""}>${label}</option>`,
                )
                .join("")}</select></label></div>`
            : ""
        }${mapToolbar("architecture-canvas")}<div id="architecture-canvas" class="map-canvas" tabindex="0" aria-label="Architecture map. Use arrow keys to scroll.">${graphNodes.length ? explorerSvg(graphNodes, graphEdges, state.selected, context ? "architectureSelect" : "architectureMapScope", tx("Architecture relationships")) : ui('<div class="empty"><h3>No indexed connections to show</h3><p>Try another symbol, a broader scope, or refresh the index.</p></div>')}</div><div class="map-legend"><span>→ ${context ? tx("Typed direct relationship") : tx("Depends on")}</span><span>Dashed: imports / inferred</span><span>Outlined: selected</span></div><p class="muted">${context ? ui`${graphNodes.length} visible symbols · ${relations.length} selected relationships. ${context.truncated ? tx("Context is bounded; refine your search to explore further.") : tx("Select “Explore connections” to retrieve a new neighborhood.")}` : ui`${groups.length} of ${value?.subsystems.length ?? 0} subsystem summaries shown. Select a subsystem to drill in.`}</p>`
  }</section>
  <aside class="explorer-inspector" aria-label="Source inspector"><p class="eyebrow">${selected ? tx("Selected symbol") : scope ? tx("Selected subsystem") : tx("Start exploring")}</p>${
    selected
      ? ui`<h2>${escape(selected.name)}</h2>${badge(selected.kind)}${sourceButton({ path: selected.path, line: selected.line })}<pre>${escape(selected.signature)}</pre><p class="muted">${escape(selected.origin || "indexed")} · ${escape(selected.language || "source")}<br>${relations.filter((e) => e.target === selected.id).length} incoming · ${relations.filter((e) => e.source === selected.id).length} outgoing in this context</p>${reference ? button("architectureTrace", tx("Trace symbol"), "", "small") : ""}${button("architectureExplore", tx("Explore connections"), `data-id="${escape(selected.id)}"`, "small")}<h3>Direct connections</h3>${
          relations
            .slice(0, 20)
            .map((e) => {
              const other = sourceResults.find(
                (s) =>
                  s.id === (e.source === selected.id ? e.target : e.source),
              );
              return ui`<div class="connection-detail"><span>${e.target === selected.id ? "←" : "→"} ${escape(tx(e.kind))} · ${escape(tx(e.category))}</span>${other ? pick(other.id, other.name) : ui`<span>${escape(e.source === selected.id ? e.target : e.source)}</span>`}${e.path ? sourceButton({ path: e.path, line: e.line }) : ""}</div>`;
            })
            .join("") ||
          ui(
            '<p class="muted">No direct connections match this filter in the bounded context.</p>',
          )
        }`
      : scope
        ? ui`<h2>${escape(scope.name)}</h2><p>${scope.files} files · ${scope.symbols} symbols</p><p class="muted">Choose a file shortcut or select a symbol from the scoped search results.</p>`
        : ui(
            "<h2>A map, one step at a time</h2><ol><li>Select a subsystem.</li><li>Choose a file or search for a symbol.</li><li>Inspect its direct connections and open the source.</li></ol>",
          )
  }
  ${context?.records.length ? ui`<h3>Related project decisions</h3>${context.records.map((r) => ui`<p>${button("openRecord", escape(r.title), `data-id="${escape(r.id)}"`, "text-button")}<br><span class="muted">${escape(r.description)}</span></p>`).join("")}` : ""}</aside></div>
  ${context ? ui`<section class="architecture-context"><h2>Context for ${escape(state.contextQuery || query)}</h2><p class="muted">${context.symbols.length} source results · ${context.records.length} project records${context.truncated ? " · Bounded result; narrow your search for more detail" : ""}</p>${context.symbols.map((s) => ui`<article class="record"><h3>${escape(s.name)}</h3><p class="muted">${escape(tx(s.kind))} · ${escape(s.reason)}</p>${sourceButton({ path: s.path, line: s.line })}${pick(s.id, tx("Inspect symbol"), s.id === state.selected)}<pre>${escape(s.signature)}</pre></article>`).join("")}${!context.symbols.length && !context.records.length ? ui("<p>No indexed context matched. Try a qualified symbol or refresh the index.</p>") : ""}</section>` : ""}
  <details class="architecture-reference"><summary>Entry points, shared symbols and project conventions</summary><div class="architecture-columns"><section><h2>Entry points</h2>${value?.entryPoints.map(sourceButton).join("") || ui('<p class="muted">Set entryPoints in contextory.project.json to describe starting points.</p>')}</section><section><h2>Shared symbols</h2>${value?.hubs.map((h) => ui`<p>${button("architectureFile", escape(h.name), `data-path="${escape(h.path)}"`, "text-button")} · ${h.references} references<br>${sourceButton(h)}</p>`).join("") || ui('<p class="muted">Resolved shared symbols appear here.</p>')}</section></div>${value?.conventions.length ? ui`<h2>Project conventions</h2><ul>${value.conventions.map((c) => ui`<li>${escape(c)}</li>`).join("")}</ul>` : ""}</details><p class="muted">Static relationships describe possible connections, not observed execution or test coverage. Missing or dynamic targets remain coverage notices.</p></section>`;
}
