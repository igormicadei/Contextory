import type { CodeQueries } from "../codebase/queries";
import { escape, button, badge, sourceButton } from "./html";
export type Architecture = ReturnType<CodeQueries["architecture"]>;
export type CodeContext = Awaited<ReturnType<CodeQueries["context"]>>;
export function architectureView(
  value: Architecture | undefined,
  context: CodeContext | undefined,
  query: string,
  only: boolean,
) {
  const status = value?.status;
  return `<section class="architecture-view"><div class="section-heading"><div><h1>Architecture</h1><p class="muted">Explore source structure and the decisions connected to it.</p></div><div>${only ? "" : button("architecturePanel", "Open workbench", "", "small")}${button("architectureRefresh", "Refresh code index", "", "small")}</div></div>
    <div class="architecture-state" role="status">${badge(status?.state ?? "empty")} ${status ? `${status.files} files · ${status.symbols} symbols · ${status.edges} relationships` : "Preparing the local code graph…"}${status?.indexedAt ? `<span class="muted">Updated ${escape(new Date(status.indexedAt).toLocaleString())}</span>` : ""}</div>
    ${status?.partial ? `<details class="analysis-limits"><summary>Coverage is partial · ${status.gaps.length} notices</summary><ul>${status.gaps.map((g) => `<li>${escape(g)}</li>`).join("")}</ul></details>` : ""}
    <form id="code-context-form" class="search-box"><label class="sr-only" for="codeQuery">Find a symbol or describe a task</label><input id="codeQuery" name="codeQuery" type="search" placeholder="Find a symbol or describe a task…" value="${escape(query)}" required><button type="submit">Find context</button></form>
    ${context ? `<section class="architecture-context"><h2>Context for ${escape(query)}</h2><p class="muted">${context.symbols.length} source results · ${context.records.length} project records${context.truncated ? " · More context is available through the agent tools" : ""}</p>${context.symbols.map((s) => `<article class="record"><h3>${escape(s.name)}</h3><p class="muted">${escape(s.kind)} · ${escape(s.reason)}</p>${s.path ? sourceButton({ path: s.path, line: s.line }) : ""}<pre>${escape(s.signature)}</pre></article>`).join("")}${context.records.map((r) => `<article class="record"><h3>${button("openRecord", escape(r.title), `data-id="${escape(r.id)}"`, "text-button")}</h3><p>${escape(r.description)}</p></article>`).join("")}${!context.symbols.length && !context.records.length ? "<p>No indexed context matched. Try a qualified symbol or refresh the index.</p>" : ""}</section>` : ""}
    <div class="architecture-columns"><section><h2>Subsystems</h2><div class="subsystem-grid">${
      value?.subsystems
        .map(
          (s) =>
            `<article class="record"><h3>${button("architectureScope", escape(s.name), `data-path="${escape(s.name)}"`, "text-button")}</h3><p>${s.files} files · ${s.symbols} symbols</p>${s.paths
              .slice(0, 3)
              .map((path) => sourceButton({ path }))
              .join("")}</article>`,
        )
        .join("") ||
      '<p class="muted">Subsystems appear after indexing readable project files.</p>'
    }</div></section>
    <section><h2>Entry points</h2>${value?.entryPoints.map(sourceButton).join("") || '<p class="muted">Set entryPoints in contextory.project.json to describe the project’s starting points.</p>'}<h2>Shared symbols</h2>${value?.hubs.map((h) => `<p><strong>${escape(h.name)}</strong> <span class="muted">${h.references} references</span><br>${sourceButton(h)}</p>`).join("") || '<p class="muted">Resolved shared symbols appear here.</p>'}</section></div>
    <section><h2>Subsystem dependencies</h2><div class="architecture-table"><table><thead><tr><th>From</th><th>Depends on</th><th>Links</th></tr></thead><tbody>${value?.dependencies.map((d) => `<tr><td>${escape(d.from)}</td><td>${escape(d.to)}</td><td>${d.count}</td></tr>`).join("") || '<tr><td colspan="3">No cross-subsystem dependencies in the current graph.</td></tr>'}</tbody></table></div></section>
    ${value?.conventions.length ? `<section><h2>Project conventions</h2><ul>${value.conventions.map((c) => `<li>${escape(c)}</li>`).join("")}</ul></section>` : ""}
    <p class="muted">Static relationships describe possible connections. Dynamic dispatch and unsupported inputs may be incomplete.</p></section>`;
}
