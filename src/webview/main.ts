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
import {
  architectureView,
  initialArchitectureState,
  type Architecture,
  type CodeContext,
  type ArchitectureState,
} from "./architecture";
import { flowView } from "./flow";
import { catalogView, type CatalogPage } from "./catalog";
import {
  versionsView,
  type VersionsPage,
  type VersionDetail,
} from "./versions";
import {
  bindMapInteraction,
  zoomMap,
  saveMapViewports,
  restoreMapViewports,
} from "./explorer";
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
let architectureCodebase = "current";
let architectureRequestId = "";
let architectureSequence = 0;
let codeContext: CodeContext | undefined;
let architectureState = initialArchitectureState();
let codeRequestId = "";
let codeRequestQuery = "";
let codeRequestSequence = 0;
const architectureHistory: {
  state: ArchitectureState;
  context: CodeContext | undefined;
  query: string;
}[] = [];
const panelShape = window.matchMedia(
  "(min-width: 760px) and (min-aspect-ratio: 3/2)",
);
const horizontalLayout = () => surface === "sidebar" && panelShape.matches;
let relationships: RelationshipGraph | undefined;
let screen = architectureOnly
  ? "architecture"
  : relationshipsOnly
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
let catalogPage: CatalogPage | undefined;
let catalogOffset = 0;
let catalogRequestId = "";
let catalogSequence = 0;
let versionsPage: VersionsPage | undefined;
let versionDetail: VersionDetail | undefined;
let releasePlan: Entity | undefined;
let releaseActionPending = false;
let versionsOffset = 0,
  versionDetailOffset = 0,
  versionsSequence = 0;
let versionsRequestId = "",
  versionDetailRequestId = "",
  versionPlanRequestId = "";
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
  return `<div class="connections" role="group" aria-label="Native agents">${clientIds
    .filter(
      (id) =>
        id !== "generic" ||
        dashboard?.connections.some((c) => c.provider === "generic"),
    )
    .map((provider) => {
      const c = dashboard?.connections.find((c) => c.provider === provider);
      const name = clients[provider].label;
      const online = c?.configured && (c.mcpCurrent ?? Boolean(c.mcpSeen));
      const label = online
        ? `Disconnect ${name}`
        : c?.configured
          ? `Retry ${name} connection`
          : `Connect ${name}`;
      return `<button class="connection" data-action="${online ? "disconnect" : "connect"}" data-provider="${provider}" aria-label="${label}" title="${name}: ${online ? "MCP observed in this service. Click to disconnect." : c?.configured ? "Configured; waiting for native traffic in this service. Click to retry connection setup." : "Disconnected. Click to connect."}"><strong>${name}</strong><span class="status-dot ${online ? "online" : ""}" role="img" aria-label="${online ? "Connected" : "Not connected"}"></span></button>`;
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
function map() {
  return flowView(graph, nodeId, drafts);
}
function render() {
  saveMapViewports();
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
  const focusAction = focused?.getAttribute("data-action");
  const focusNode = focused?.getAttribute("data-id");
  const focusName = focused?.getAttribute("name");
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
    ["catalog", "Knowledge"],
    ["versions", "Versions"],
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
    )}</nav>${notice ? `<div class="notice" role="status"><span>${escape(notice)}</span>${button("dismiss", "×", 'aria-label="Dismiss notification"', "icon-button")}</div>` : ""}${busy ? '<div class="loading-line" role="progressbar" aria-label="Contextory is working"></div>' : ""}<main>${!dashboard && screen !== "map" && screen !== "relationships" ? empty("Open your workspace", "Contextory connects your native agents to shared project records. Open a trusted folder, then refresh.", button("refresh", "Refresh", "", "primary")) : screen === "versions" ? versionsView(versionsPage, versionDetail, releasePlan, drafts, versionsOffset) : screen === "catalog" ? catalogView(catalogPage, drafts, catalogOffset) : screen === "architecture" ? architectureView(architecture, codeContext, drafts.codeQuery ?? "", architectureOnly, architectureState, dashboard?.references ?? [], architectureCodebase) : screen === "relationships" ? relationshipView(relationships) : screen === "requests" ? requestTree() : screen === "history" ? historyView() : screen === "map" ? map() : overview()}</main><footer>${surface === "sidebar" ? connections() : ""}<div class="workspace-status"><span class="status-dot ${dashboard ? "online" : ""}"></span><span>${dashboard ? escape(dashboard.root.split(/[\\/]/).pop()) : "Open a workspace"}</span>${surface === "sidebar" ? autoConnectSwitch() : '<span class="footer-label">Native conversation &middot; durable context</span>'}</div></footer>`;
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
  if (!focusId && (focusAction || focusName)) {
    const selector = focusAction
      ? `[data-action="${CSS.escape(focusAction)}"]${focusNode ? `[data-id="${CSS.escape(focusNode)}"]` : ""}`
      : `[name="${CSS.escape(focusName!)}"]`;
    app.querySelector<HTMLElement>(selector)?.focus({ preventScroll: true });
  }
  restoreMapViewports();
  renderedView = viewKey;
}
const send = (message: unknown) => host.postMessage(message);
function loadVersions() {
  versionsRequestId = `versions:${++versionsSequence}`;
  send({
    type: "tool",
    name: "contextory_version_get",
    requestId: versionsRequestId,
    arguments: { offset: versionsOffset, limit: 20 },
  });
}
function loadVersionDetail(id: string) {
  versionDetailRequestId = `version-detail:${++versionsSequence}`;
  send({
    type: "tool",
    name: "contextory_version_get",
    requestId: versionDetailRequestId,
    arguments: { releaseId: id, offset: versionDetailOffset, limit: 20 },
  });
}
function loadCatalog() {
  catalogRequestId = `catalog:${++catalogSequence}`;
  send({
    type: "tool",
    name: "contextory_catalog_get",
    requestId: catalogRequestId,
    arguments: {
      inventory: true,
      offset: catalogOffset,
      limit: 20,
      query: drafts.catalogQuery || undefined,
      path: drafts.catalogPath || undefined,
      category: drafts.catalogCategory || undefined,
    },
  });
}
function rememberArchitecture() {
  architectureHistory.push({
    state: { ...architectureState },
    context: codeContext,
    query: codeContext
      ? architectureState.contextQuery
      : (drafts.codeQuery ?? ""),
  });
  if (architectureHistory.length > 30) architectureHistory.shift();
}
function requestCode(query: string, paths?: string[]) {
  drafts.codeQuery = query;
  codeRequestQuery = query;
  architectureState.loading = true;
  architectureState.error = "";
  codeRequestId = `code-context:${++codeRequestSequence}`;
  send({
    type: "tool",
    requestId: codeRequestId,
    name: "contextory_code_context_get",
    arguments: {
      codebaseId: architectureCodebase,
      query,
      paths:
        paths ??
        (architectureState.file
          ? [architectureState.file]
          : architectureState.scope && architectureState.scope !== "."
            ? [architectureState.scope]
            : []),
      budgetTokens: 5000,
    },
  });
  render();
}
function loadArchitecture() {
  architectureRequestId = `architecture:${++architectureSequence}`;
  send({
    type: "tool",
    requestId: architectureRequestId,
    name: "contextory_code_architecture_get",
    arguments: { refresh: true, codebaseId: architectureCodebase },
  });
}
function selectCodebase(id: string) {
  architectureCodebase = id;
  architecture = undefined;
  codeContext = undefined;
  codeRequestId = "";
  architectureState = initialArchitectureState();
  architectureHistory.length = 0;
  drafts.codeQuery = "";
  loadArchitecture();
  render();
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
      if (screen === "catalog") loadCatalog();
      if (screen === "versions") loadVersions();
      render();
      if (screen === "requests" && horizontalLayout()) revealSelection();
      break;
    case "versionsRefresh":
      loadVersions();
      break;
    case "versionsNext":
      versionsOffset += 20;
      loadVersions();
      break;
    case "versionsPrevious":
      versionsOffset = Math.max(0, versionsOffset - 20);
      loadVersions();
      break;
    case "versionSelect":
      versionDetailOffset = 0;
      loadVersionDetail(data.id!);
      break;
    case "versionMore":
      versionDetailOffset += 20;
      if (versionDetail) loadVersionDetail(versionDetail.release.id);
      break;
    case "versionPlan":
      versionPlanRequestId = `version-plan:${++versionsSequence}`;
      send({
        type: "tool",
        name: "contextory_entity_get",
        requestId: versionPlanRequestId,
        arguments: { id: data.id },
      });
      break;
    case "releaseChange":
      releaseActionPending = true;
      send({
        type: "tool",
        name: "contextory_release_change",
        requestId: `release-action:${++versionsSequence}`,
        arguments: {
          operationId: crypto.randomUUID(),
          id: data.id,
          expectedRevision: Number(data.revision),
          action: data.release,
        },
      });
      break;
    case "catalogRefresh":
      loadCatalog();
      break;
    case "catalogNext":
      catalogOffset += 20;
      loadCatalog();
      break;
    case "catalogPrevious":
      catalogOffset = Math.max(0, catalogOffset - 20);
      loadCatalog();
      break;
    case "catalogReview": {
      const reason = drafts[`catalogReason-${data.id}`]?.trim();
      if (!reason) {
        notice =
          "Enter a review reason before approving or rejecting this definition.";
        render();
        break;
      }
      send({
        type: "tool",
        name: "contextory_catalog_review",
        requestId: `catalog-review:${data.id}`,
        arguments: {
          operationId: crypto.randomUUID(),
          id: data.id,
          expectedRevision: Number(data.revision),
          action: data.review,
          reason,
        },
      });
      break;
    }
    case "architectureRefresh":
      loadArchitecture();
      break;
    case "architecturePanel":
      send({ type: "architecturePanel" });
      break;
    case "referenceAdd":
      send({ type: "referenceAdd" });
      break;
    case "referenceRemove":
      send({
        type: "tool",
        name: "contextory_codebase_change",
        requestId: `reference-remove:${architectureCodebase}`,
        arguments: {
          action: "remove",
          codebaseId: architectureCodebase,
          operationId: crypto.randomUUID(),
        },
      });
      break;
    case "architectureTrace": {
      const symbol = codeContext?.symbols.find(
        (s) => s.id === architectureState.selected,
      );
      if (symbol)
        send({
          type: "traceReference",
          input: {
            codebaseId: architectureCodebase,
            root: { path: symbol.path, symbol: symbol.name },
            view: "flow",
          },
        });
      break;
    }
    case "mapZoom":
      zoomMap(data.map!, Number(data.factor));
      break;
    case "mapFit":
      zoomMap(data.map!, undefined, true);
      break;
    case "mapReset":
      zoomMap(data.map!);
      break;
    case "flowFocus":
      drafts.flowFocus = drafts.flowFocus === "true" ? "false" : "true";
      render();
      break;
    case "architectureMapScope":
      data.path = data.id;
    // Both the map and explorer enter the same scoped context.
    case "architectureScope":
      rememberArchitecture();
      architectureState = { ...initialArchitectureState(), scope: data.path! };
      requestCode(data.path!, data.path === "." ? [] : [data.path!]);
      break;
    case "architectureHome":
      rememberArchitecture();
      architectureState = initialArchitectureState();
      codeContext = undefined;
      drafts.codeQuery = "";
      codeRequestId = "";
      render();
      break;
    case "architectureBack": {
      const previous = architectureHistory.pop();
      architectureState = previous?.state ?? initialArchitectureState();
      architectureState.loading = false;
      codeContext = previous?.context;
      drafts.codeQuery = previous?.query ?? "";
      codeRequestId = "";
      render();
      break;
    }
    case "architectureFile":
      rememberArchitecture();
      architectureState.file = data.path!;
      architectureState.mode = "map";
      requestCode(data.path!, [data.path!]);
      break;
    case "architectureSelect":
      rememberArchitecture();
      architectureState.selected = data.id!;
      render();
      break;
    case "architectureExplore": {
      const symbol = codeContext?.symbols.find((s) => s.id === data.id);
      if (symbol) {
        rememberArchitecture();
        requestCode(`source:${symbol.path}#${symbol.name}`, []);
      }
      break;
    }
    case "architectureMode":
      architectureState.mode = data.mode === "matrix" ? "matrix" : "map";
      render();
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
      send({
        type: "source",
        source: {
          ...JSON.parse(data.source!),
          codebaseId:
            screen === "architecture"
              ? architectureCodebase
              : screen === "map"
                ? graph?.codebase?.id
                : undefined,
        },
      });
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
    case "cancelAnalysis":
      send({ type: "cancelAnalysis", codebaseId: graph?.codebase?.id });
      break;
    case "retrace":
      send({
        type: "trace",
        input: {
          codebaseId: graph?.codebase?.id,
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
          codebaseId: graph?.codebase?.id,
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
bindMapInteraction(app);
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
  if (input.name === "architectureCodebase") selectCodebase(input.value);
  if (input.name === "architectureRelation") {
    architectureState.relation = input.value;
    render();
  }
  if (input.name === "architectureDirection") {
    architectureState.direction = input.value;
    render();
  }
  if (input.name === "flowEdge") render();
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
  if (form.id === "code-context-form" && drafts.codeQuery?.trim()) {
    rememberArchitecture();
    requestCode(drafts.codeQuery);
  }
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
  if (form.id === "catalog-form") {
    catalogOffset = 0;
    loadCatalog();
  }
  if (form.id === "release-form") {
    releaseActionPending = true;
    send({
      type: "tool",
      name: "contextory_release_prepare",
      requestId: `release-action:${++versionsSequence}`,
      arguments: {
        operationId: crypto.randomUUID(),
        bump: drafts.releaseBump || "auto",
        version: drafts.releaseVersion?.trim() || undefined,
      },
    });
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
  if (message.type === "restore") {
    const previousVersions = JSON.stringify(dashboard?.versioning);
    indexDashboard(message.dashboard);
    if (
      screen === "versions" &&
      previousVersions !== JSON.stringify(dashboard?.versioning)
    )
      loadVersions();
  }
  if (message.type === "notice") {
    notice = message.text;
    if (releaseActionPending) {
      releaseActionPending = false;
      loadVersions();
      if (releasePlan) {
        versionPlanRequestId = `version-plan:${++versionsSequence}`;
        send({
          type: "tool",
          name: "contextory_entity_get",
          requestId: versionPlanRequestId,
          arguments: { id: releasePlan.id },
        });
      }
    }
    if (architectureState.loading) {
      architectureState.loading = false;
      architectureState.error = message.text;
    }
  }
  if (message.type === "busy") busy = message.value;
  if (message.type === "toolResult" && message.requestId === versionsRequestId)
    versionsPage = message.result;
  if (
    message.type === "toolResult" &&
    message.requestId === versionDetailRequestId
  )
    versionDetail = message.result;
  if (
    message.type === "toolResult" &&
    message.requestId === versionPlanRequestId
  )
    releasePlan = message.result;
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("release-action:")
  ) {
    releaseActionPending = false;
    releasePlan = message.result;
    loadVersions();
  }
  if (message.type === "toolResult" && message.requestId === catalogRequestId)
    catalogPage = message.result;
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("catalog-review:")
  )
    loadCatalog();
  if (
    message.type === "toolResult" &&
    message.requestId === architectureRequestId
  )
    architecture = message.result;
  if (message.type === "referenceAdded") {
    if (dashboard) dashboard.references = message.references;
    selectCodebase(message.codebaseId);
  }
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("reference-remove:") &&
    message.result?.removed === architectureCodebase
  )
    selectCodebase("current");
  if (
    message.type === "restore" &&
    architectureCodebase !== "current" &&
    !dashboard?.references?.some((r) => r.id === architectureCodebase)
  )
    selectCodebase("current");
  if (message.type === "toolResult" && message.requestId === codeRequestId) {
    codeContext = message.result;
    architectureState.contextQuery = codeRequestQuery;
    architectureState.loading = false;
    architectureState.selected =
      codeContext?.symbols.find((s) => s.reason === "query")?.id ??
      codeContext?.symbols[0]?.id ??
      "";
    architectureState.relation = "all";
    architectureState.direction = "both";
  }
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("usage:")
  )
    usageBySpec.set(String(message.requestId).slice(6), message.result);
  if (message.type === "flow" && !relationshipsOnly && !architectureOnly) {
    graph = message.graph;
    screen = "map";
    nodeId = graph?.nodes.some((n) => n.id === nodeId)
      ? nodeId
      : (graph?.nodes[0]?.id ?? "");
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
