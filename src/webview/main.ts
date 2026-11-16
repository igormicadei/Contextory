import type {
  RelationshipGraph,
  Audit,
  HistoryPage,
  Dashboard,
  AgentAutomation,
  Entity,
  FlowGraph,
  SourceRef,
} from "../contracts/model";
import { escape, button, badge, sourceButton } from "./html";
import { relationshipView } from "./relationships";
import { architectureView, type Architecture, type CodeContext } from "./architecture";
import { clients, clientIds } from "../providers/clients";
import contextoryIcon from "../../media/contextory.svg";
import type { UsageSummary } from "../contracts/usage";
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const host = acquireVsCodeApi();
const app = document.querySelector<HTMLDivElement>("#app")!;
let dashboard: Dashboard | undefined;
let automation: AgentAutomation | undefined;
let entitiesById = new Map<string, Entity>();
let childrenById = new Map<string, Entity[]>();
let searchableRequests = new Map<string, string>();
function indexDashboard(value: Dashboard) {
  dashboard = value;
  entitiesById = new Map(value.entities.map((e) => [e.id, e]));
  childrenById = new Map();
  searchableRequests = new Map();
  for (const e of value.entities)
    if (e.parentId)
      childrenById.set(e.parentId, [
        ...(childrenById.get(e.parentId) ?? []),
        e,
      ]);
  for (const e of value.entities) {
    const r = requestOf(e.id);
    if (r)
      searchableRequests.set(
        r.id,
        (searchableRequests.get(r.id) ?? "") +
          ` ${e.id} ${e.title} ${JSON.stringify(e.data)}`.toLowerCase(),
      );
  }
}
let graph: FlowGraph | undefined;
const surface = document.body.dataset.surface ?? "sidebar";
const flowOnly = surface === "flow";
const relationshipsOnly = surface === "relationships";
const architectureOnly = surface === "architecture";
let architecture: Architecture | undefined;
let codeContext: CodeContext | undefined;
const panelShape = window.matchMedia(
  "(min-width: 760px) and (min-aspect-ratio: 3/2)",
);
const horizontalLayout = () => surface === "sidebar" && panelShape.matches;
let relationships: RelationshipGraph | undefined;
let screen = architectureOnly ? "architecture" : relationshipsOnly
  ? "relationships"
  : flowOnly
    ? "map"
    : "overview";
let renderedView = "";
let history: HistoryPage = { events: [], nextBefore: null };
let historyScope = "";
let historyLoaded = false;
const openMilestones = new Set<string>();
let selected = "";
let detailTab = "contract";
const usageBySpec = new Map<string, UsageSummary>();
let notice = "";
let busy = false;
let nodeId = "";
let hits: {
  id: string;
  title: string;
  excerpt: string;
  source?: SourceRef;
  via: string[];
  revision: string;
}[] = [];
const drafts: Record<string, string> = {};
const empty = (title: string, body: string, action = "") =>
  `<div class="empty"><div class="empty-symbol" aria-hidden="true">◇</div><h2>${title}</h2><p>${body}</p>${action}</div>`;
const children = (id: string, kind?: string) =>
  (childrenById.get(id) ?? []).filter((e) => !kind || e.kind === kind);
const requestOf = (id: string): Entity | undefined => {
  let e = entitiesById.get(id.split("#")[0]);
  const seen = new Set<string>();
  while (e && e.kind !== "request" && !seen.has(e.id)) {
    seen.add(e.id);
    e = entitiesById.get(e.parentId ?? "");
  }
  return e?.kind === "request" ? e : undefined;
};
const requestSpecs = (id: string) =>
  children(id, "milestone").flatMap((m) => children(m.id, "spec"));
const requestState = (r: Entity) => {
  const specs = requestSpecs(r.id);
  if (["completed", "cancelled"].includes(r.state)) return r.state;
  if (
    specs.length &&
    children(r.id, "milestone").every(
      (m) =>
        ["completed", "cancelled"].includes(m.state) ||
        (children(m.id, "spec").length > 0 &&
          children(m.id, "spec").every((s) =>
            ["completed", "cancelled"].includes(s.state),
          )),
    )
  )
    return "completed";
  return specs.some((s) => s.state === "implementing")
    ? "implementing"
    : specs.some((s) => s.state === "blocked")
      ? "blocked"
      : "open";
};
function connections() {
  return `<div class="connections" role="group" aria-label="Native agents">${(
    clientIds.filter(id=>id!=="generic" || dashboard?.connections.some(c=>c.provider==="generic"))
  )
    .map((provider) => {
      const c = dashboard?.connections.find((c) => c.provider === provider);
      const name = clients[provider].label;
      const online = c?.configured && c.mcpSeen;
      return `<button class="connection" data-action="${c?.configured ? "disconnect" : "connect"}" data-provider="${provider}" aria-label="${c?.configured ? "Disconnect" : "Connect"} ${name}" title="${name}: ${online ? "MCP observed" : c?.configured ? "Waiting for native connection" : "Disconnected"}"><strong>${name}</strong><span class="status-dot ${online ? "online" : ""}" role="img" aria-label="${online ? "Connected" : "Not connected"}"></span></button>`;
    })
    .join("")}</div>`;
}
function autoConnectSwitch() {
  const enabled = automation?.enabled ?? true;
  return `<button class="automation-toggle" role="switch" aria-checked="${enabled}" aria-label="Auto-connect" data-action="autoConnect" ${automation ? "" : "disabled"} title="${enabled ? "Pause automatic agent connections" : "Resume automatic agent connections"}. Existing connections stay available."><span>Auto-connect</span><span class="toggle-track" aria-hidden="true"></span></button>`;
}
function requestProgress(request: Entity) {
  const specs = requestSpecs(request.id);
  const done = specs.filter((s) => s.state === "completed").length;
  return `<small class="muted">${done} / ${specs.length} specs complete</small><progress class="request-progress" max="${Math.max(1, specs.length)}" value="${done}" aria-label="${escape(request.title)} progress" aria-valuetext="${specs.length ? `${done} of ${specs.length} specifications completed` : "No specifications defined yet"}"></progress>`;
}
function activity(events: Audit[], full = false) {
  return `<ol class="activity">${events.map((e) => `<li><span class="activity-dot"></span><div><strong>${escape(e.title ?? e.type.replaceAll(".", " "))}</strong>${e.context?.length ? `<div class="history-links">${e.context.map((c) => button("select", escape(c.title), `data-id="${escape(c.id)}" title="${escape(c.kind)} ${escape(c.id)}"`, "text-button")).join('<span aria-hidden="true"> / </span>')}</div>` : `<span class="muted">${escape(e.entityId)}</span>`}<span class="muted">${escape(e.actor)}${full ? ` \u00b7 event ${e.sequence}` : ""}</span></div><time datetime="${e.time}">${new Date(e.time).toLocaleString([], full ? {} : { hour: "2-digit", minute: "2-digit" })}</time></li>`).join("") || '<li class="muted">No project activity yet.</li>'}</ol>`;
}
function overview() {
  const specs = dashboard?.entities.filter((e) => e.kind === "spec") ?? [];
  const requests =
    dashboard?.entities.filter((e) => e.kind === "request") ?? [];
  const open = requests.filter(
    (r) => !["completed", "cancelled"].includes(requestState(r)),
  );
  return `<div class="overview-layout">
    <div class="metrics" aria-label="Workspace progress"><div><strong>${open.length}</strong><span>open requests</span></div><div><strong>${specs.filter((e) => e.state === "implementing").length}</strong><span>in progress</span></div><div><strong>${specs.filter((e) => e.state === "completed").length}<small> / ${specs.length}</small></strong><span>completed specs</span></div></div>
    <section class="overview-work"><div class="section-heading"><h2 id="work-heading">Current work</h2>${button("navigate", "View requests \u2197", 'data-screen="requests"', "text-button")}</div>
      <div class="work-list" data-scroll="work" role="region" aria-labelledby="work-heading" tabindex="0">${open.map((r) => `<button class="work-row" data-action="select" data-id="${r.id}"><div><span class="record-id">${r.id}</span><strong>${escape(r.title)}</strong>${requestProgress(r)}</div>${badge(requestState(r))}<span aria-hidden="true">&#8250;</span></button>`).join("") || '<p class="muted">No open requests. Describe a change in native chat, or create a request.</p>'}</div>
    </section>
    <section class="overview-activity"><div class="section-heading"><h2 id="activity-heading">Recent activity</h2>${button("navigate", "Full history \u2197", 'data-screen="history"', "text-button")}</div><div class="activity-list" data-scroll="activity" role="region" aria-labelledby="activity-heading" tabindex="0">${activity(dashboard?.events.slice(0, 3) ?? [])}</div></section>
  </div>`;
}
function requestCard(r: Entity) {
  const inline = !horizontalLayout();
  return `<article class="request-card ${requestOf(selected)?.id === r.id ? "selected-request" : ""}" id="record-${r.id}">
    <div class="section-heading"><div class="request-title"><span class="record-id">${r.id}</span><h2>${escape(r.title)}</h2></div>${badge(requestState(r))}</div>
    <p>${escape(r.data.description)}</p>
    <div class="request-actions">${button("report", "Export request report", `data-id="${r.id}"`, "small")}${button("history", "Request history", `data-id="${r.id}"`, "text-button")}</div>
    ${
      children(r.id, "milestone")
        .map(
          (
            m,
          ) => `<details class="milestone" data-milestone="${m.id}" ${openMilestones.has(m.id) ? "open" : ""}>
      <summary><span>${escape(m.title)}</span>${badge(m.state)}</summary>
      <div class="milestone-detail"><span class="record-id">${m.id} &middot; revision ${m.revision}</span><p>${escape(m.data.description || "Milestone specifications")}</p>${button("history", "Milestone history", `data-id="${m.id}"`, "text-button")}
      ${
        children(m.id, "spec")
          .map(
            (s) =>
              `<button class="spec-row ${selected === s.id ? "selected" : ""}" aria-expanded="${selected === s.id}" ${selected === s.id ? `aria-controls="detail-${s.id}"` : ""} data-action="toggleSpec" data-id="${s.id}"><span class="spec-indicator ${s.state}"></span><div><strong>${escape(s.title)}</strong><small>${s.id} &middot; revision ${s.revision}</small></div>${badge(s.state)}</button>${inline && selected === s.id ? specDetails(s) : ""}`,
          )
          .join("") || '<p class="muted">Waiting for specifications.</p>'
      }
      </div></details>`,
        )
        .join("") ||
      '<p class="muted">The native agent can add milestones and specifications through Contextory.</p>'
    }
  </article>`;
}
function requestInspector(spec: Entity | undefined) {
  if (!spec)
    return empty(
      "Select a specification",
      "Expand a milestone in the request list to review its contract, issues, decisions and evidence.",
    );
  const request = requestOf(spec.id);
  const milestone = entitiesById.get(spec.parentId ?? "");
  return `<header class="inspector-heading"><p class="muted">${escape(request?.title)} / ${escape(milestone?.title)}</p><h2>${escape(spec.title)}</h2></header>${specDetails(spec)}`;
}
function requestTree() {
  const requests =
    dashboard?.entities.filter((e) => e.kind === "request") ?? [];
  const query = (drafts.query ?? "").toLowerCase().trim();
  const terms = query.split(/\s+/).filter(Boolean);
  const matching = requests.filter((r) => {
    if (!query) return true;
    const text = searchableRequests.get(r.id) ?? "";
    return (
      terms.every((t) => text.includes(t)) ||
      hits.some((h) => requestOf(h.id)?.id === r.id)
    );
  });
  const visibleSpec = matching.some((r) => r.id === requestOf(selected)?.id)
    ? entitiesById.get(selected)
    : undefined;
  return `<div class="requests-view"><div class="requests-toolbar"><div class="section-heading"><h1>Requests</h1>${button("newRequest", "+ New request", "", "primary")}</div><form id="search-form"><label class="sr-only" for="query">Filter requests and their history</label><div class="search-box"><input type="search" id="query" name="query" placeholder="Search requests, changes, decisions..." value="${escape(drafts.query)}"><button type="submit" class="small">Search history</button></div></form><p class="muted search-hint">${matching.length} of ${requests.length} requests &middot; Includes milestones, specs, issues and decisions.</p></div><div class="requests-layout"><div class="request-list" data-scroll="requests" role="region" aria-label="Request list" tabindex="0"><form id="request-form" class="new-request ${drafts.showRequest === "true" ? "" : "hidden"}"><label>Title<input id="requestTitle" name="requestTitle" maxlength="300" required value="${escape(drafts.requestTitle)}"></label><label>What should change?<textarea id="requestDescription" name="requestDescription" maxlength="12000" required>${escape(drafts.requestDescription)}</textarea></label><button type="submit" class="primary">Create request</button></form>${
    !requests.length
      ? empty(
          "A clear plan starts here",
          "Create a request from your native conversation. Contextory keeps milestones, specs and their history together.",
        )
      : !matching.length
        ? '<p class="muted">No matching requests.</p>'
        : matching.map(requestCard).join("")
  }</div>${horizontalLayout() ? `<aside class="request-inspector" data-scroll="inspector" aria-label="Specification inspector" tabindex="0">${requestInspector(visibleSpec)}</aside>` : ""}</div></div>`;
}
function loadHistory(append = false) {
  send({
    type: "tool",
    name: "contextory_history_get",
    requestId: `history:${historyScope}:${append ? "older" : "new"}`,
    arguments: {
      entityId: historyScope || undefined,
      before: append ? history.nextBefore : undefined,
      limit: 40,
    },
  });
}
function historyView() {
  const scope = dashboard?.entities.find((e) => e.id === historyScope);
  return `<div class="history-view"><div class="history-toolbar"><div class="section-heading"><h1>History</h1>${button("historyRefresh", "Refresh", "", "small")}</div><label>Request<select id="historyFilter" name="historyFilter"><option value="">All project history</option>${dashboard?.entities
    .filter((e) => e.kind === "request")
    .map(
      (r) =>
        `<option value="${r.id}" ${historyScope === r.id || requestOf(historyScope)?.id === r.id ? "selected" : ""}>${escape(r.title)}</option>`,
    )
    .join(
      "",
    )}</select></label>${scope ? `<p class="muted">History for ${escape(scope.title)} and its descendants. ${button("history", "Show all", "", "text-button")}</p>` : '<p class="muted">Requests, milestones, specifications and native sessions, with links to their context.</p>'}</div><div class="history-feed" data-scroll="history" role="region" aria-label="Project history" tabindex="0">${activity(history.events, true)}${history.nextBefore ? button("olderHistory", "Load older activity", "", "small") : historyLoaded ? '<p class="muted">Beginning of history.</p>' : '<p class="muted">Loading history...</p>'}</div></div>`;
}
function specDetails(s: Entity) {
  const records = children(s.id);
  const criteria = s.data.criteria as { id: string; text: string }[];
  let body = "";
  if (detailTab === "contract")
    body = `<p>${escape(s.data.description)}</p><h3>Acceptance criteria</h3><ul class="criteria">${criteria.map((c) => `<li><span>${escape(c.id)}</span>${escape(c.text)}</li>`).join("")}</ul><h3>Scope</h3><p class="muted">${escape((s.data.paths as string[])?.join(", ") || "Defined by the specification")}</p>`;
  if (detailTab === "issues")
    body =
      records
        .filter((e) => e.kind === "finding")
        .map(
          (e) =>
            `<article class="record"><div class="section-heading"><h3>${escape(e.title)}</h3>${badge(e.state)}</div><p>${escape(e.data.observation)}</p><p><strong>Impact:</strong> ${escape(e.data.impact)}</p>${e.data.resolution ? `<p><strong>Resolution:</strong> ${escape(e.data.resolution)}</p>` : ""}${((e.data.sources as SourceRef[]) ?? []).map(sourceButton).join("")}</article>`,
        )
        .join("") ||
      '<p class="muted">No findings recorded. The outcome will state whether issues were found.</p>';
  if (detailTab === "decisions")
    body =
      records
        .filter((e) => e.kind === "decision")
        .map(
          (e) =>
            `<article class="record"><h3>${escape(e.title)}</h3><p>${escape(e.data.choice)}</p><p><strong>Why:</strong> ${escape(e.data.rationale)}</p><p><strong>Tradeoffs:</strong> ${escape(e.data.alternatives)}</p><p><strong>Consequences:</strong> ${escape(e.data.consequences)}</p><small class="muted">${escape(e.data.provenance)}</small></article>`,
        )
        .join("") ||
      '<p class="muted">Choices and their rationale will remain here for future work.</p>';
  if (detailTab === "evidence")
    body =
      records
        .filter((e) => e.kind === "evidence")
        .map(
          (e) =>
            `<article class="record"><div class="section-heading"><h3>${escape(e.title)}</h3>${badge(e.state)}</div><p class="muted">${e.data.origin === "contextory-runner" ? "Independent Contextory check" : "Agent-reported observation"} · ${escape((e.data.criteria as string[])?.join(", "))}</p><pre>${escape(e.data.detail)}</pre><small class="muted">Bound to the recorded source, contract and attempt. Completion rechecks eligibility.</small></article>`,
        )
        .join("") ||
      '<p class="muted">No evidence yet. Native agents can run your configured independent checks.</p>';
  if (detailTab === "outcome")
    body =
      records
        .filter((e) => e.kind === "outcome")
        .map(
          (e) =>
            `<article class="record"><h3>What changed</h3><p>${escape(e.data.summary)}</p><h3>Issues and fixes</h3><p>${escape(e.data.issuesSummary)}</p><h3>Decisions</h3><p>${escape(e.data.decisionsSummary)}</p><h3>Remaining limits</h3><p>${escape(e.data.limitations)}</p><h3>Report</h3><p>${escape(e.data.report)}</p></article>`,
        )
        .join("") ||
      '<p class="muted">The agent submits a durable explanation before completion.</p>';
  if (detailTab === "history")
    body = `<p>Explore all events for this specification and its records.</p>${button("history", "Open specification history", `data-id="${s.id}"`, "small")}`;
  if (detailTab === "usage") {
    const usage = usageBySpec.get(s.id);
    const count = (value: number | null | undefined) =>
      value === null || value === undefined
        ? "Unavailable"
        : value.toLocaleString();
    body = `<div class="section-heading"><h3>Agent models and usage</h3>${button("refreshUsage", "Refresh usage", "", "small")}</div>${usage ? `<p>${usage.attempts} native request attempts observed; ${usage.measuredAttempts} with token counts.</p>${usage.groups.map((g) => `<article class="record"><h3>${escape(g.provider)} &middot; ${escape(g.model ?? "Model unavailable")}</h3><p>Input: ${count(g.tokens.inputTokens)} &middot; Output: ${count(g.tokens.outputTokens)} &middot; Total: ${count(g.tokens.totalTokens)}</p><p class="muted">Cached input (included in input): ${count(g.tokens.cachedInputTokens)}<br>Reasoning (included in output): ${count(g.tokens.reasoningTokens)}</p></article>`).join("") || '<p class="muted">No native model or usage records linked to this specification.</p>'}${usage.groupsTruncated ? '<p class="muted">Only the first 100 model groups are shown. Filter with contextory_usage_get.</p>' : ""}<p class="muted">${escape(usage.note)}</p>` : '<p class="muted">Loading native usage records...</p>'}`;
  }
  return `<section id="detail-${s.id}" class="spec-detail" aria-label="${escape(s.title)} details"><div class="section-heading"><span class="record-id">${s.id} &middot; revision ${s.revision}</span>${badge(s.state)}</div><div class="detail-tabs" role="tablist" aria-label="Specification details">${["contract", "issues", "decisions", "evidence", "outcome", "usage", "history"].map((tab) => `<button id="tab-${tab}" role="tab" aria-selected="${detailTab === tab}" data-action="detailTab" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>`).join("")}</div><div role="tabpanel" aria-labelledby="tab-${detailTab}">${body}</div><div class="detail-actions">${button("impact", "Explore relationships", `data-id="${s.id}"`)}${s.state === "submitted" ? button("complete", "Check completion", `data-id="${s.id}" data-revision="${s.revision}"`, "primary") : ""}</div></section>`;
}
function flowSvg(g: FlowGraph) {
  const levels = new Map<string, number>();
  if (g.nodes[0]) levels.set(g.nodes[0].id, 0);
  const queue = g.nodes[0] ? [g.nodes[0].id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    for (const edge of g.edges.filter((e) => e.from === id))
      if (!levels.has(edge.to)) {
        levels.set(edge.to, Math.min(16, (levels.get(id) ?? 0) + 1));
        queue.push(edge.to);
      }
  }
  const slots = new Map<number, number>();
  const positions = new Map(
    g.nodes.map((node) => {
      const level = levels.get(node.id) ?? node.depth;
      const row = slots.get(level) ?? 0;
      slots.set(level, row + 1);
      return [node.id, { x: 30 + level * 250, y: 32 + row * 102 }];
    }),
  );
  const width = Math.max(700, ...[...positions.values()].map((p) => p.x + 240));
  const height = Math.max(300, ...[...positions.values()].map((p) => p.y + 95));
  return `<svg class="flow-diagram" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Possible source flow"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"></path></marker></defs>${g.edges
    .map((edge) => {
      const a = positions.get(edge.from);
      const b = positions.get(edge.to);
      if (!a || !b) return "";
      const x1 = a.x + 205;
      const y1 = a.y + 31;
      const x2 = b.x;
      const y2 = b.y + 31;
      const bend = Math.max(35, Math.abs(x2 - x1) / 2);
      return `<g class="graph-edge ${escape(edge.kind)}"><path d="M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}" marker-end="url(#arrow)"></path><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 6}">${escape(edge.label ?? edge.kind)}</text></g>`;
    })
    .join("")}${g.nodes
    .map((node) => {
      const p = positions.get(node.id)!;
      return `<g class="graph-node ${node.kind} ${nodeId === node.id ? "selected" : ""}" transform="translate(${p.x},${p.y})" role="button" tabindex="0" aria-label="${escape(node.label)}" data-action="node" data-id="${node.id}"><title>${escape(node.label)}${node.source ? ` — ${escape(node.source.path)}:${(node.source.line ?? 0) + 1}` : ""}</title><rect width="205" height="66" rx="8"></rect><text x="12" y="19" class="node-kind">${escape(node.kind)}</text><text x="12" y="41">${escape(node.label.slice(0, 28))}${node.label.length > 28 ? "…" : ""}</text><text x="12" y="57" class="node-location">${escape(node.source?.path.split("/").pop() ?? "")}</text></g>`;
    })
    .join("")}</svg>`;
}
function map() {
  const node = graph?.nodes.find((n) => n.id === nodeId);
  return `<div class="section-heading"><h1>Source flow</h1>${button("trace", "Trace current symbol", "", "primary")}</div><p class="muted">Explore possible calls and branches from your cursor. No agent or application execution required.</p><div class="flow-controls"><label>View<select id="flowView" name="flowView"><option value="flow" ${(drafts.flowView ?? graph?.view ?? "flow") === "flow" ? "selected" : ""}>Calls + branches</option><option value="calls" ${(drafts.flowView ?? graph?.view ?? "flow") === "calls" ? "selected" : ""}>Calls</option></select></label><label>Call depth<input id="flowDepth" name="flowDepth" type="number" min="0" max="12" value="${escape(drafts.flowDepth ?? graph?.limits.callDepth ?? 5)}"></label>${graph ? button("retrace", "Refresh") : ""}${button("cancelAnalysis", "Cancel", "", "text-button")}${graph ? button("exportGraphJson", "Export JSON", "", "small") + button("exportGraphSvg", "Export SVG", "", "small") : ""}</div>${graph ? `<div class="graph-summary"><strong>${escape(graph.root.path)}</strong><span>${graph.nodes.length} nodes · ${graph.edges.length} edges · ${graph.durationMs} ms</span>${badge(graph.partial ? "partial" : "bounded")}${graph.unsaved ? badge("unsaved snapshot") : ""}</div><div class="diagram-scroll" tabindex="0" aria-label="Scroll source flow diagram">${flowSvg(graph)}</div>${node ? `<div class="node-detail"><strong>${escape(node.label)}</strong>${node.source ? sourceButton(node.source) : ""}${button("expand", "Trace from this node", `data-id="${node.id}"`, "small")}</div>` : ""}<details class="analysis-limits"><summary>Analysis boundaries (${graph.frontier.length})</summary><ul>${graph.frontier.map((f) => `<li>${escape(graph?.nodes.find((n) => n.id === f.nodeId)?.label)}: ${escape(f.reason)}</li>`).join("")}${graph.gaps.map((gap) => `<li>${escape(gap)}</li>`).join("")}</ul></details>` : empty("Choose a starting point", "Place the cursor inside a function, then choose “Trace Flow from Here” in the editor. The default explores five call hops with visible boundaries.")}`;
}
function render() {
  const viewKey = `${screen}:${screen === "history" ? historyScope : screen === "requests" ? (drafts.query ?? "") : ""}`;
  const scrollAreas =
    renderedView === viewKey
      ? [...document.querySelectorAll<HTMLElement>("[data-scroll]")].map(
          (element) => ({
            key: element.dataset.scroll!,
            top: element.scrollTop,
            left: element.scrollLeft,
          }),
        )
      : [];
  document.body.dataset.layout = horizontalLayout() ? "horizontal" : "vertical";
  const contentScroll =
    renderedView === viewKey
      ? (document.querySelector("main")?.scrollTop ?? 0)
      : 0;
  const focused = document.activeElement as HTMLInputElement | null;
  const focusId = focused?.id;
  const selection =
    focused && "selectionStart" in focused ? focused.selectionStart : undefined;
  const diagram = document.querySelector(".diagram-scroll");
  const scroll = {
    left: diagram?.scrollLeft ?? 0,
    top: diagram?.scrollTop ?? 0,
  };
  const workspaceName =
    document.body.dataset.workspaceName ||
    dashboard?.root.split(/[\\/]/).pop() ||
    "No workspace open";
  const workspacePath =
    document.body.dataset.workspacePath || dashboard?.root || workspaceName;
  app.innerHTML = `<header class="app-header"><div class="brand"><span class="brand-mark" aria-hidden="true">${contextoryIcon}</span><div class="brand-copy"><strong>Contextory</strong><span class="workspace-name" aria-label="Workspace" title="${escape(workspacePath)}">${escape(workspaceName)}</span></div></div>${button("refresh", "↻", 'aria-label="Refresh workspace" title="Refresh workspace"', "icon-button")}</header><nav class="main-nav ${surface !== "sidebar" ? "hidden" : ""}" aria-label="Contextory views">${[
    ["overview", "Overview"],
    ["requests", "Requests"],
    ["history", "History"],
    ["map", "Code map"],
    ["architecture", "Architecture"],
  ]
    .map(
      ([id, label]) =>
        `<button data-action="navigate" data-screen="${id}" class="${screen === id ? "active" : ""}" aria-current="${screen === id ? "page" : "false"}">${label}</button>`,
    )
    .join(
      "",
    )}</nav>${notice ? `<div class="notice" role="status"><span>${escape(notice)}</span>${button("dismiss", "×", 'aria-label="Dismiss notification"', "icon-button")}</div>` : ""}${busy ? '<div class="loading-line" role="progressbar" aria-label="Contextory is working"></div>' : ""}<main>${!dashboard && screen !== "map" && screen !== "relationships" ? empty("Open your workspace", "Contextory connects your native agents to shared project records. Open a trusted folder, then refresh.", button("refresh", "Refresh", "", "primary")) : screen === "architecture" ? architectureView(architecture, codeContext, drafts.codeQuery ?? "", architectureOnly) : screen === "relationships" ? relationshipView(relationships) : screen === "requests" ? requestTree() : screen === "history" ? historyView() : screen === "map" ? map() : overview()}</main><footer>${surface === "sidebar" ? connections() : ""}<div class="workspace-status"><span class="status-dot ${dashboard ? "online" : ""}"></span><span>${dashboard ? escape(dashboard.root.split(/[\\/]/).pop()) : "Open a workspace"}</span>${surface === "sidebar" ? autoConnectSwitch() : '<span class="footer-label">Native conversation &middot; durable context</span>'}</div></footer>`;
  document.querySelector<HTMLElement>("main")!.dataset.screen = screen;
  for (const scroll of scrollAreas) {
    const replacement = document.querySelector<HTMLElement>(
      `[data-scroll="${scroll.key}"]`,
    );
    if (replacement) {
      replacement.scrollTop = scroll.top;
      replacement.scrollLeft = scroll.left;
    }
  }
  if (focusId) {
    const replacement = document.getElementById(
      focusId,
    ) as HTMLInputElement | null;
    replacement?.focus({ preventScroll: true });
    if (
      selection !== undefined &&
      selection !== null &&
      replacement?.type !== "number"
    )
      replacement?.setSelectionRange?.(selection, selection);
  }
  const replacement = document.querySelector(".diagram-scroll");
  if (replacement) {
    replacement.scrollLeft = scroll.left;
    replacement.scrollTop = scroll.top;
  }
  const content = document.querySelector("main");
  if (content) content.scrollTop = contentScroll;
  renderedView = viewKey;
}
const send = (message: unknown) => host.postMessage(message);
function loadArchitecture() {
  send({ type: "tool", requestId: "architecture", name: "contextory_code_architecture_get", arguments: {refresh:true} });
}
function preparePanelSelection(requestId?: string) {
  if (
    !horizontalLayout() ||
    (selected && (!requestId || requestOf(selected)?.id === requestId))
  )
    return;
  const request = requestId
    ? entitiesById.get(requestId)
    : (dashboard?.entities.find(
        (e) =>
          e.kind === "request" &&
          requestSpecs(e.id).some((s) => s.state === "implementing"),
      ) ??
      dashboard?.entities.find(
        (e) => e.kind === "request" && requestSpecs(e.id).length,
      ));
  const specs = request ? requestSpecs(request.id) : [];
  const spec = specs.find((s) => s.state === "implementing") ?? specs[0];
  if (spec) {
    selected = spec.id;
    detailTab = "contract";
    if (spec.parentId) openMilestones.add(spec.parentId);
  }
}
function revealSelection() {
  if (horizontalLayout()) {
    document
      .querySelector(`.spec-row[data-id="${CSS.escape(selected)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  } else {
    document
      .getElementById(
        selected ? `detail-${selected}` : `record-${requestOf(selected)?.id}`,
      )
      ?.scrollIntoView({ block: "nearest" });
  }
}
function selectRecord(id: string) {
  const e = entitiesById.get(id);
  let owner = e;
  while (owner && !["request", "milestone", "spec"].includes(owner.kind))
    owner = entitiesById.get(owner.parentId ?? "");
  selected = owner?.kind === "spec" ? owner.id : "";
  detailTab =
    (
      {
        finding: "issues",
        decision: "decisions",
        evidence: "evidence",
        outcome: "outcome",
      } as Record<string, string>
    )[e?.kind ?? ""] ?? "contract";
  if (owner?.kind === "spec" && owner.parentId)
    openMilestones.add(owner.parentId);
  if (e?.kind === "milestone") openMilestones.add(e.id);
  const r = requestOf(id);
  if (e?.kind === "request")
    children(e.id, "milestone").forEach((m) => openMilestones.add(m.id));
  drafts.query = "";
  hits = [];
  screen = "requests";
  preparePanelSelection(r?.id);
  render();
  if (selected) revealSelection();
  else
    document
      .getElementById(`record-${r?.id}`)
      ?.scrollIntoView({ block: "nearest" });
}
function action(element: Element) {
  const data = (element as HTMLElement).dataset;
  switch (data.action) {
    case "autoConnect":
      if (automation)
        send({ type: "autoConnect", enabled: !automation.enabled });
      break;
    case "exportGraphJson":
      send({ type: "graphExport", format: "json" });
      break;
    case "exportGraphSvg": {
      const svg = document.querySelector<SVGSVGElement>(".flow-diagram");
      if (!svg) break;
      const clone = svg.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const originals = [svg, ...svg.querySelectorAll("*")];
      const copies = [clone, ...clone.querySelectorAll("*")];
      originals.forEach((element, index) => {
        const style = getComputedStyle(element);
        for (const property of [
          "fill",
          "stroke",
          "stroke-width",
          "stroke-dasharray",
          "font-family",
          "font-size",
          "opacity",
        ])
          copies[index].setAttribute(
            property,
            style.getPropertyValue(property),
          );
      });
      send({ type: "graphExport", format: "svg", content: clone.outerHTML });
      break;
    }
    case "navigate":
      screen = data.screen!;
      if (screen === "history") loadHistory();
      if (screen === "architecture") loadArchitecture();
      if (screen === "requests") preparePanelSelection();
      render();
      if (screen === "requests" && horizontalLayout()) revealSelection();
      break;
    case "architectureRefresh":
      loadArchitecture();
      break;
    case "architecturePanel":
      send({type:"architecturePanel"});
      break;
    case "architectureScope":
      drafts.codeQuery = data.path!;
      send({type:"tool",requestId:`code-context:${drafts.codeQuery}`,name:"contextory_code_context_get",arguments:{query:drafts.codeQuery,paths:[data.path],budgetTokens:3000}});
      break;
    case "select":
      selectRecord(data.id!);
      break;
    case "openRecord":
      send({ type: "openRecord", id: data.id });
      break;
    case "refreshRelationships":
      send({ type: "relationships", id: relationships?.origin });
      break;
    case "toggleSpec":
      selected = selected === data.id ? "" : data.id!;
      detailTab = "contract";
      render();
      if (horizontalLayout()) {
        const inspector = document.querySelector(".request-inspector");
        if (inspector) inspector.scrollTop = 0;
      }
      break;
    case "history":
      historyScope = data.id ?? "";
      history = { events: [], nextBefore: null };
      historyLoaded = false;
      screen = "history";
      loadHistory();
      render();
      break;
    case "historyRefresh":
      loadHistory();
      break;
    case "olderHistory":
      loadHistory(true);
      break;
    case "report":
      send({ type: "report", requestId: data.id });
      break;
    case "detailTab":
      detailTab = data.tab!;
      if (detailTab === "usage") loadUsage();
      render();
      if (horizontalLayout()) {
        const inspector = document.querySelector(".request-inspector");
        if (inspector) inspector.scrollTop = 0;
      }
      break;
    case "refreshUsage":
      loadUsage();
      break;
    case "dismiss":
      notice = "";
      render();
      break;
    case "newRequest":
      drafts.showRequest = drafts.showRequest === "true" ? "false" : "true";
      render();
      document.getElementById("requestTitle")?.focus();
      break;
    case "connect":
    case "disconnect":
      send({ type: data.action, provider: data.provider });
      break;
    case "source":
      send({ type: "source", source: JSON.parse(data.source!) });
      break;
    case "node":
      nodeId = data.id!;
      render();
      break;
    case "trace":
      send({
        type: "trace",
        options: {
          view: drafts.flowView ?? "flow",
          limits: { callDepth: Number(drafts.flowDepth ?? 5) },
        },
      });
      break;
    case "retrace":
      send({
        type: "trace",
        input: {
          root: graph!.root,
          view: (document.getElementById("flowView") as HTMLSelectElement)
            .value,
          limits: {
            callDepth: Number(
              (document.getElementById("flowDepth") as HTMLInputElement).value,
            ),
          },
        },
      });
      break;
    case "expand":
      send({
        type: "expand",
        arguments: {
          graphId: graph!.id,
          snapshotId: graph!.snapshotId,
          nodeId: data.id,
        },
      });
      break;
    case "complete":
      send({
        type: "tool",
        name: "contextory_spec_change",
        arguments: {
          operationId: crypto.randomUUID(),
          action: "complete",
          id: data.id,
          expectedRevision: Number(data.revision),
        },
      });
      break;
    case "impact":
      send({ type: "relationships", id: data.id });
      break;
    default:
      send({ type: data.action });
  }
}
app.addEventListener("click", (event) => {
  const element = (event.target as Element).closest("[data-action]");
  if (element) action(element);
});
app.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    const element = (event.target as Element).closest("g[data-action]");
    if (element) {
      event.preventDefault();
      action(element);
    }
  }
});
app.addEventListener("keydown", (event) => {
  const tab = (event.target as Element).closest('[role="tab"]');
  if (!tab || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
    return;
  event.preventDefault();
  const tabs = [...app.querySelectorAll<HTMLElement>('[role="tab"]')];
  const index = tabs.indexOf(tab as HTMLElement);
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? tabs.length - 1
        : (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) %
          tabs.length;
  action(tabs[next]);
  document.getElementById(tabs[next].id)?.focus();
});
app.addEventListener("input", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name) drafts[input.name] = input.value;
  if (input.name === "query") {
    hits = [];
    render();
  }
});
app.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  if (input.name) drafts[input.name] = input.value;
  if (input.name === "historyFilter") {
    historyScope = input.value;
    historyLoaded = false;
    history = { events: [], nextBefore: null };
    loadHistory();
    render();
  }
});
app.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target as HTMLFormElement;
  if (form.id === "code-context-form" && drafts.codeQuery?.trim())
    send({type:"tool",requestId:`code-context:${drafts.codeQuery}`,name:"contextory_code_context_get",arguments:{query:drafts.codeQuery,budgetTokens:3000}});
  if (form.id === "request-form") {
    send({
      type: "tool",
      name: "contextory_request_change",
      arguments: {
        operationId: crypto.randomUUID(),
        action: "create",
        title: drafts.requestTitle,
        description: drafts.requestDescription,
      },
    });
    drafts.showRequest = "false";
    drafts.requestTitle = "";
    drafts.requestDescription = "";
  }
  if (form.id === "search-form" && drafts.query?.trim())
    send({
      type: "tool",
      requestId: `search:${drafts.query}`,
      name: "contextory_search",
      arguments: {
        query: drafts.query,
        mode: drafts.searchMode ?? "hybrid",
        limit: 10,
      },
    });
});
function loadUsage() {
  if (selected)
    send({
      type: "tool",
      name: "contextory_usage_get",
      requestId: `usage:${selected}`,
      arguments: { entityId: selected, limit: 1 },
    });
}
window.addEventListener("message", (event) => {
  const message = event.data;
  if (message.automation) automation = message.automation;
  if (message.type === "restore") indexDashboard(message.dashboard);
  if (message.type === "notice") notice = message.text;
  if (message.type === "busy") busy = message.value;
  if(message.type === "toolResult" && message.requestId === "architecture") architecture = message.result;
  if(message.type === "toolResult" && message.requestId === `code-context:${drafts.codeQuery}`) codeContext = message.result;
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("usage:")
  )
    usageBySpec.set(String(message.requestId).slice(6), message.result);
  if (message.type === "flow" && !relationshipsOnly && !architectureOnly) {
    graph = message.graph;
    screen = "map";
    nodeId = "";
  }
  if (
    message.type === "toolResult" &&
    message.requestId === `search:${drafts.query}`
  ) {
    hits = message.result.hits;
    if (message.result.degraded) notice = message.result.reason;
  }
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith(`history:${historyScope}:`)
  ) {
    history = {
      events: String(message.requestId).endsWith(":older")
        ? [...history.events, ...message.result.events].filter(
            (e, i, all) =>
              all.findIndex((a) => a.sequence === e.sequence) === i,
          )
        : message.result.events,
      nextBefore: message.result.nextBefore,
    };
    historyLoaded = true;
  }
  if (message.type === "relationships" && relationshipsOnly)
    relationships = message.graph;
  if (
    message.type === "selectRecord" &&
    surface === "sidebar" &&
    typeof message.id === "string"
  )
    selectRecord(message.id);
  render();
  if (
    message.type === "flow" &&
    horizontalLayout() &&
    window.innerHeight <= 320
  )
    document
      .querySelector(".diagram-scroll")
      ?.scrollIntoView({ block: "nearest" });
});
app.addEventListener(
  "toggle",
  (event) => {
    const d = event.target as HTMLDetailsElement;
    if (d.dataset.milestone) {
      if (d.open) openMilestones.add(d.dataset.milestone);
      else openMilestones.delete(d.dataset.milestone);
    }
  },
  true,
);
panelShape.addEventListener("change", () => {
  if (surface !== "sidebar") return;
  if (screen === "requests") preparePanelSelection();
  render();
  if (screen === "requests" && selected) revealSelection();
});
render();
send({ type: "ready", surface });
if (architectureOnly) loadArchitecture();
