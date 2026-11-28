import { ui, tx, setLanguage, language } from "../i18n";
import type {
  RelationshipGraph,
  Audit,
  HistoryPage,
  Dashboard,
  AgentAutomation,
  Entity,
  FlowGraph,
  SourceRef,
  WorkspaceInfo,
  WorkspaceRequest,
  WorkspaceRequestStatus,
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
import { documentationView, type DocumentationPage } from "./documentation";
import {
  approvalsView,
  catalogView,
  type ApprovalsPage,
  type CatalogPage,
  type CatalogFeedback,
} from "./catalog";
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
import { specProgress } from "./progress";
import contextoryIcon from "../../media/contextory.svg";
import type { UsageSummary } from "../contracts/usage";
declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};
const host = acquireVsCodeApi();
setLanguage(document.documentElement.lang);
const app = document.querySelector<HTMLDivElement>("#app")!;
let dashboard: Dashboard | undefined;
let workspace: WorkspaceInfo | undefined;
let currentProjectId = "";
let projectPending = false;
let expectedProjectId = "";
const requestProjects = new Set<string>();
const workspaceRequests = new Map<string, WorkspaceRequestStatus>();
let automation: AgentAutomation | undefined;
let entitiesById = new Map<string, Entity>();
let childrenById = new Map<string, Entity[]>();
let searchableRequests = new Map<string, string>();
function indexDashboard(value: Dashboard) {
  value = {
    ...value,
    entities: value.entities.filter(
      (e) => !e.projectId || e.projectId === value.projectId,
    ),
  };
  dashboard = value;
  currentProjectId = value.projectId;
  workspace = value.workspace;
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
let focusedRequest = "";
let serviceConnection = {
  state: "connecting",
  text: tx("Connecting to your workspace"),
  checkedAt: "",
  nextRetryAt: 0,
};
let detailTab = "contract";
const usageBySpec = new Map<string, UsageSummary>();
let notice = "";
let busy = false;
let catalogPage: CatalogPage | undefined;
let documentationPage: DocumentationPage | undefined;
let documentationOffset = 0;
let documentationSequence = 0;
let documentationRequestId = "";
let documentationError = "";
let documentationLoading = false;
let documentationJob: Parameters<typeof documentationView>[5];
let documentationJobId = "";
let documentationJobRequest = "";
let documentationPoll: ReturnType<typeof setTimeout> | undefined;
let catalogOffset = 0;
let catalogRequestId = "";
let catalogSequence = 0;
let approvalsPage: ApprovalsPage | undefined;
let approvalsOffset = 0;
let approvalsRequestId = "";
const catalogStatuses: Record<string, CatalogFeedback> = {};
const catalogReviews = new Map<
  string,
  { id: string; revision: number; action: string; linked: boolean }
>();
let catalogReviewSequence = 0;
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
function resetProject() {
  dashboard = undefined;
  entitiesById.clear();
  childrenById.clear();
  searchableRequests.clear();
  selected = "";
  focusedRequest = "";
  detailTab = "contract";
  hits = [];
  notice = "";
  busy = false;
  graph = undefined;
  nodeId = "";
  relationships = undefined;
  history = { events: [], nextBefore: null };
  historyScope = "";
  historyLoaded = false;
  openMilestones.clear();
  usageBySpec.clear();
  workspaceRequests.clear();
  requestProjects.clear();
  catalogPage = undefined;
  documentationPage = undefined;
  documentationOffset = 0;
  documentationRequestId = "";
  documentationError = "";
  documentationLoading = false;
  documentationJob = undefined;
  documentationJobId = "";
  documentationJobRequest = "";
  clearTimeout(documentationPoll);
  catalogOffset = 0;
  catalogRequestId = "";
  approvalsPage = undefined;
  approvalsOffset = 0;
  approvalsRequestId = "";
  for (const id of Object.keys(catalogStatuses)) delete catalogStatuses[id];
  catalogReviews.clear();
  versionsPage = undefined;
  versionDetail = undefined;
  releasePlan = undefined;
  releaseActionPending = false;
  versionsOffset = 0;
  versionDetailOffset = 0;
  versionsRequestId = "";
  versionDetailRequestId = "";
  versionPlanRequestId = "";
  architecture = undefined;
  architectureCodebase = "current";
  architectureRequestId = "";
  codeContext = undefined;
  architectureState = initialArchitectureState();
  architectureHistory.length = 0;
  codeRequestId = "";
  codeRequestQuery = "";
  renderedView = "";
  for (const key of Object.keys(drafts)) delete drafts[key];
}
function projectName(project: WorkspaceInfo["projects"][number]) {
  return workspace?.projects.some(
    (p) => p.id !== project.id && p.name === project.name,
  )
    ? `${project.name} (${project.id.slice(-8)})`
    : project.name;
}
function projectBadge() {
  const project = workspace?.projects.find((p) => p.id === currentProjectId);
  return dashboard
    ? ui`<span class="project-badge" title="${escape(project?.root ?? dashboard.root)}">${escape(project ? projectName(project) : dashboard.root.split(/[\\/]/).pop())}</span>`
    : "";
}
function projectSelector() {
  return workspace && workspace.projects.length > 1
    ? ui`<div class="project-selector"><label for="workspaceProject">Project</label><select id="workspaceProject" name="workspaceProject">${workspace.projects.map((p) => ui`<option value="${escape(p.id)}" ${p.id === (expectedProjectId || currentProjectId) ? "selected" : ""}>${escape(projectName(p))}</option>`).join("")}</select><span class="muted" title="Requests, knowledge, source, checks and versions are scoped to this project">${workspace.projects.length} projects</span></div>`
    : "";
}
function workspaceRequestView(request: Entity) {
  const group = request.data.workspaceRequest as WorkspaceRequest | undefined;
  if (!group) return "";
  const status = workspaceRequests.get(group.id);
  const branches: WorkspaceRequestStatus["branches"] =
    status?.branches ??
    group.projectIds.map((id) => ({
      project: workspace?.projects.find((p) => p.id === id) ?? {
        id,
        name: id,
        root: "",
      },
    }));
  return ui`<section class="workspace-request" aria-label="Cross-project request"><div class="section-heading"><strong>Across projects</strong>${status ? badge(status.state) : ui('<span class="muted">Loading branches...</span>')}</div><small class="record-id">${escape(group.id)}</small>${status?.error ? ui`<p class="muted">${escape(status.error)}</p>` : ""}<div class="project-branches">${branches.map((b) => (b.request ? button("projectBranch", `${escape(projectName(b.project))} &middot; ${escape(b.request.state)}${b.specs ? ui` &middot; ${b.specs.filter((s) => s.state === "completed").length}/${b.specs.length} specs` : ""}`, ui`data-project-id="${escape(b.project.id)}" data-record-id="${escape(b.request.id)}" title="${escape(b.project.root)}"`, "small") : ui`<span class="muted" title="${escape(b.error ?? tx("Loading branch"))}">${escape(projectName(b.project))} &middot; ${escape(b.error ?? "waiting")}</span>`)).join("")}</div>${status?.partial ? ui`<p class="muted">Some project branches are missing or unavailable. This request is incomplete.</p>${group.ownerProjectId === currentProjectId && group.creation ? button("retryWorkspaceRequest", tx("Retry missing branches"), `data-id="${escape(request.id)}"`, "small") : ""}` : ""}</section>`;
}
function loadWorkspaceRequests() {
  for (const entity of dashboard?.entities ?? []) {
    const group = entity.data.workspaceRequest as WorkspaceRequest | undefined;
    if (entity.kind === "request" && group)
      send({
        type: "tool",
        name: "contextory_workspace_get",
        requestId: `workspace-request:${group.id}`,
        arguments: { groupId: group.id },
      });
  }
}
const empty = (title: string, body: string, action = "") =>
  ui`<div class="empty"><div class="empty-symbol" aria-hidden="true">◇</div><h2>${title}</h2><p>${body}</p>${action}</div>`;
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
  return ui`<div class="connections" role="group" aria-label="Native agents">${clientIds
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
        ? ui`Disconnect ${name}`
        : c?.configured
          ? ui`Retry ${name} connection`
          : ui`Connect ${name}`;
      return ui`<button class="connection" data-action="${online ? "disconnect" : "connect"}" data-provider="${provider}" aria-label="${label}" title="${name}: ${online ? tx("MCP observed in this service. Click to disconnect.") : c?.configured ? tx("Configured; waiting for native traffic in this service. Click to retry connection setup.") : tx("Disconnected. Click to connect.")}"><strong>${name}</strong><span class="status-dot ${online ? "online" : ""}" role="img" aria-label="${online ? tx("MCP observed") : tx("Waiting for MCP traffic")}"></span></button>`;
    })
    .join("")}</div>`;
}
function autoConnectSwitch() {
  const enabled = automation?.enabled ?? true;
  return ui`<button class="automation-toggle" role="switch" aria-checked="${enabled}" aria-label="Auto-connect" data-action="autoConnect" ${automation ? "" : "disabled"} title="${enabled ? tx("Pause automatic agent connections") : tx("Resume automatic agent connections")}. Existing connections stay available."><span>Auto-connect</span><span class="toggle-track" aria-hidden="true"></span></button>`;
}
function rebuildHooksButton() {
  return button(
    "rebuildHooks",
    tx("Rebuild hooks"),
    ui`title="Restore Contextory hooks for this project" ${!dashboard || busy || projectPending ? "disabled" : ""}`,
    "text-button hook-rebuild",
  );
}
function requestProgress(request: Entity) {
  const specs = requestSpecs(request.id);
  const done = specs.filter((s) => s.state === "completed").length;
  return ui`<small class="muted">${done} / ${specs.length} specs complete${specs.some((s) => s.state === "implementing") ? " · Work in progress" : ""}</small>`;
}
function reviewCount() {
  const catalog =
    screen === "approvals"
      ? (approvalsPage ?? dashboard?.catalog)
      : screen === "catalog"
        ? (catalogPage ?? dashboard?.catalog)
        : (dashboard?.catalog ?? catalogPage);
  return catalog
    ? catalog.pendingChanges
    : (dashboard?.entities.filter(
        (e) => e.kind === "knowledge_change" && e.state === "pending",
      ).length ?? 0);
}
function timeSince(time: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(time).getTime()) / 1000),
  );
  return seconds < 60
    ? tx("just now")
    : seconds < 3600
      ? ui`${Math.floor(seconds / 60)}m ago`
      : seconds < 86400
        ? ui`${Math.floor(seconds / 3600)}h ago`
        : ui`${Math.floor(seconds / 86400)}d ago`;
}
function workStatus(spec: Entity, compact = false) {
  const progress = specProgress(
    spec,
    dashboard?.entities ?? [],
    dashboard?.checks,
  );
  const startedAt = dashboard?.attemptStartedAt?.[spec.id];
  return ui`<section class="work-status ${compact ? "compact" : ""}" aria-label="Specification progress"><div class="phase-line"><span class="phase-dot ${progress.blockers.length ? "blocked" : ""}"></span><strong>${escape(progress.phase)}</strong>${startedAt ? ui`<time datetime="${escape(startedAt)}" title="This attempt started ${escape(new Date(startedAt).toLocaleString(language()))}">Started ${timeSince(startedAt)}</time>` : ""}</div><p class="evidence-count"><strong>${progress.covered} / ${progress.criteria.length}</strong> criteria with passing checks</p><div class="criterion-segments" aria-hidden="true">${progress.criteria.map((c) => ui`<span class="${c.status}"></span>`).join("")}</div>${compact ? "" : ui`<ul class="criterion-checklist">${progress.criteria.map((c) => ui`<li class="${c.status}"><span aria-hidden="true">${c.status === "check" ? "✓" : c.status === "reported" ? "◒" : "○"}</span><div>${escape(c.text)}<small>${c.status === "check" ? tx("Passing independent check recorded") : c.status === "reported" ? tx("Agent reported · independent check pending") : tx("Evidence pending")}</small></div></li>`).join("")}</ul>`}${progress.running.length ? ui`<div class="running-checks"><strong>Checking now</strong>${progress.running.map((c) => ui`<p>${escape(c.name)}</p>`).join("")}</div>` : ""}${progress.blockers.map((b) => ui`<p class="work-blocker"><strong>Needs attention:</strong> ${escape(b.title)}</p>`).join("")}${progress.latest ? ui`<p class="latest-work"><span>Latest update · <time datetime="${escape(progress.latest.updatedAt)}">${timeSince(progress.latest.updatedAt)}</time></span>${escape(progress.latest.title)}</p>` : ui('<p class="muted latest-work">Waiting for the agent’s next work record.</p>')}${compact ? "" : ui('<p class="progress-note">Recorded evidence, not a time estimate. Source freshness and completion are checked separately.</p>')}</section>`;
}
function activity(events: Audit[], full = false) {
  return ui`<ol class="activity">${events.map((e) => ui`<li><span class="activity-dot"></span><div><strong>${escape(e.presentation ? (e.presentation.native ? `${e.presentation.subject} ${tx(e.presentation.action)}${e.presentation.detail ? `: ${e.presentation.detail}` : ""}` : `${tx(e.presentation.action)}: ${e.presentation.subject}`) : (e.title ?? e.type.replaceAll(".", " ")))}</strong>${e.context?.length ? ui`<div class="history-links">${e.context.map((c) => button("select", escape(c.title), ui`data-id="${escape(c.id)}" title="${escape(c.kind)} ${escape(c.id)}"`, "text-button")).join(ui('<span aria-hidden="true"> / </span>'))}</div>` : ui`<span class="muted">${escape(e.entityId)}</span>`}<span class="muted">${escape(e.actor)}${full ? ui` \u00b7 event ${e.sequence}` : ""}</span></div><time datetime="${e.time}">${new Date(e.time).toLocaleString(language(), full ? {} : { hour: "2-digit", minute: "2-digit" })}</time></li>`).join("") || ui('<li class="muted">No project activity yet.</li>')}</ol>`;
}
function overview() {
  const specs = dashboard?.entities.filter((e) => e.kind === "spec") ?? [];
  const requests =
    dashboard?.entities.filter((e) => e.kind === "request") ?? [];
  const open = requests.filter(
    (r) => !["completed", "cancelled"].includes(requestState(r)),
  );
  const current =
    specs.find((s) => s.state === "implementing") ??
    specs.find((s) => s.state === "blocked") ??
    specs.find((s) => s.state === "submitted");
  return ui`<div class="workbench"><section class="focus-work" data-scroll="focus" aria-label="Current specification" tabindex="0"><div class="section-heading"><span class="eyebrow">Happening now</span>${current ? badge(current.state) : ""}</div>${current ? ui`<p class="focus-request">${escape(requestOf(current.id)?.title)}</p><h1>${escape(current.title)}</h1>${workStatus(current, true)}${button("select", tx("Open work details →"), `data-id="${current.id}"`, "primary")}` : ui`<h1>Room for your next idea.</h1><p>Describe a change in your native conversation, or create a request to plan the work.</p>${button("newRequest", tx("+ New request"), "", "primary")}`}</section><section class="overview-work"><div class="section-heading"><div><span class="eyebrow">Work queue</span><h2 id="work-heading">${open.length} open requests</h2></div>${button("navigate", tx("All requests"), 'data-screen="requests"', "text-button")}</div><div class="work-list" data-scroll="work" role="region" aria-labelledby="work-heading" tabindex="0">${open.map((r) => ui`<button class="work-row" data-action="select" data-id="${r.id}"><div><strong>${escape(r.title)}</strong>${requestProgress(r)}</div>${badge(requestState(r))}<span aria-hidden="true">›</span></button>`).join("") || ui('<p class="muted">Your queue is clear.</p>')}</div></section></div>`;
}
function requestCard(r: Entity) {
  const inline = !horizontalLayout();
  return ui`<article class="request-card ${requestOf(selected)?.id === r.id ? "selected-request" : ""}" id="record-${r.id}">
    <div class="section-heading"><div class="request-title"><span class="eyebrow">Request</span>${(workspace?.projects.length ?? 0) > 1 ? projectBadge() : ""}<h2>${escape(r.title)}</h2></div>${badge(requestState(r))}</div>
    ${requestProgress(r)}
    ${workspaceRequestView(r)}
    <details class="request-brief" ${drafts.requestBriefOpen === "true" ? "open" : ""}><summary>Brief & actions</summary><p>${escape(r.data.description)}</p><small class="record-id">${r.id} · revision ${r.revision}</small>
    <div class="request-actions">${button("report", tx("Export request report"), `data-id="${r.id}"`, "small")}${button("history", tx("Request history"), `data-id="${r.id}"`, "text-button")}${button("openDocumentation", tx("Related documentation"), `data-id="${r.id}"`, "text-button")}</div></details>
    ${
      children(r.id, "milestone")
        .map(
          (
            m,
          ) => ui`<details class="milestone" data-milestone="${m.id}" ${openMilestones.has(m.id) ? "open" : ""}>
      <summary><span>${escape(m.title)}</span>${badge(m.state)}</summary>
      <div class="milestone-detail"><span class="record-id">${m.id} &middot; revision ${m.revision}</span><p>${escape(m.data.description || tx("Milestone specifications"))}</p>${button("history", tx("Milestone history"), `data-id="${m.id}"`, "text-button")}
      ${
        children(m.id, "spec")
          .map(
            (s) =>
              ui`<button class="spec-row ${selected === s.id ? "selected" : ""}" aria-expanded="${selected === s.id}" ${selected === s.id ? `aria-controls="detail-${s.id}"` : ""} data-action="toggleSpec" data-id="${s.id}"><span class="spec-indicator ${s.state}"></span><div><strong>${escape(s.title)}</strong><small>${specProgress(s, dashboard?.entities ?? [], dashboard?.checks).phase}</small>${(workspace?.projects.length ?? 0) > 1 ? projectBadge() : ""}</div>${badge(s.state)}</button>${inline && selected === s.id ? specDetails(s) : ""}`,
          )
          .join("") || ui('<p class="muted">Waiting for specifications.</p>')
      }
      </div></details>`,
        )
        .join("") ||
      ui(
        '<p class="muted">The native agent can add milestones and specifications through Contextory.</p>',
      )
    }
  </article>`;
}
function requestInspector(spec: Entity | undefined) {
  if (!spec)
    return empty(
      tx("Select a specification"),
      tx(
        "Expand a milestone in the request list to review its contract, issues, decisions and evidence.",
      ),
    );
  const request = requestOf(spec.id);
  const milestone = entitiesById.get(spec.parentId ?? "");
  return ui`<header class="inspector-heading"><p class="muted">${escape(request?.title)} / ${escape(milestone?.title)}</p><h2>${escape(spec.title)}</h2></header>${specDetails(spec)}`;
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
  const currentRequest =
    matching.find((r) => r.id === focusedRequest) ??
    matching.find((r) => r.id === requestOf(selected)?.id) ??
    matching.find((r) => requestState(r) === "implementing") ??
    matching[0];
  const picker = matching.length
    ? ui`<label class="request-picker">Request<select name="requestSelection">${matching.map((r) => ui`<option value="${r.id}" ${r.id === currentRequest?.id ? "selected" : ""}>${escape(r.title)} · ${escape(requestState(r))}</option>`).join("")}</select></label>`
    : "";
  const visibleSpec = matching.some((r) => r.id === requestOf(selected)?.id)
    ? entitiesById.get(selected)
    : undefined;
  return ui`<div class="requests-view"><div class="requests-toolbar"><div class="section-heading"><h1>Requests</h1>${button("newRequest", tx("+ New request"), "", "primary")}</div><form id="search-form"><label class="sr-only" for="query">Filter requests and their history</label><div class="search-box"><input type="search" id="query" name="query" placeholder="Search requests, changes, decisions..." value="${escape(drafts.query)}"><button type="submit" class="small">Search history</button></div></form><p class="muted search-hint">${matching.length} of ${requests.length} requests &middot; Includes milestones, specs, issues and decisions.</p></div><div class="requests-layout"><div class="request-list" data-scroll="requests" role="region" aria-label="Request list" tabindex="0"><form id="request-form" class="new-request ${drafts.showRequest === "true" ? "" : "hidden"}"><label>Title<input id="requestTitle" name="requestTitle" maxlength="300" required value="${escape(drafts.requestTitle)}"></label><label>What should change?<textarea id="requestDescription" name="requestDescription" maxlength="12000" required>${escape(drafts.requestDescription)}</textarea></label>${workspace && workspace.projects.length > 1 ? ui`<fieldset class="request-projects"><legend>Projects affected</legend>${workspace.projects.map((p) => ui`<label><input type="checkbox" name="requestProject" value="${escape(p.id)}" ${p.id === currentProjectId || requestProjects.has(p.id) ? "checked" : ""} ${p.id === currentProjectId ? "disabled" : ""}>${escape(projectName(p))}</label>`).join("")}<small class="muted">Each project keeps its own specifications and evidence.</small></fieldset>` : ""}<button type="submit" class="primary">Create request</button></form>${
    !requests.length
      ? empty(
          tx("A clear plan starts here"),
          tx(
            "Create a request from your native conversation. Contextory keeps milestones, specs and their history together.",
          ),
        )
      : !matching.length
        ? ui('<p class="muted">No matching requests.</p>')
        : picker + (currentRequest ? requestCard(currentRequest) : "")
  }</div>${horizontalLayout() ? ui`<aside class="request-inspector" data-scroll="inspector" aria-label="Specification inspector" tabindex="0">${requestInspector(visibleSpec)}</aside>` : ""}</div></div>`;
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
  return ui`<div class="history-view"><div class="history-toolbar"><div class="section-heading"><h1>History</h1>${button("historyRefresh", tx("Refresh"), "", "small")}</div><label>Request<select id="historyFilter" name="historyFilter"><option value="">All project history</option>${dashboard?.entities
    .filter((e) => e.kind === "request")
    .map(
      (r) =>
        ui`<option value="${r.id}" ${historyScope === r.id || requestOf(historyScope)?.id === r.id ? "selected" : ""}>${escape(r.title)}</option>`,
    )
    .join(
      "",
    )}</select></label>${scope ? ui`<p class="muted">History for ${escape(scope.title)} and its descendants. ${button("history", tx("Show all"), "", "text-button")}</p>` : ui('<p class="muted">Requests, milestones, specifications and native sessions, with links to their context.</p>')}</div><div class="history-feed" data-scroll="history" role="region" aria-label="Project history" tabindex="0">${activity(history.events, true)}${history.nextBefore ? button("olderHistory", tx("Load older activity"), "", "small") : historyLoaded ? ui('<p class="muted">Beginning of history.</p>') : ui('<p class="muted">Loading history...</p>')}</div></div>`;
}
function specDetails(s: Entity) {
  const records = children(s.id);
  const criteria = s.data.criteria as { id: string; text: string }[];
  let body = "";
  if (detailTab === "contract")
    body = ui`<p>${escape(s.data.description)}</p>${(s.data.conversation as { nativeSessionId?: string } | undefined)?.nativeSessionId ? button("openConversation", tx("Reopen conversation"), `data-id="${s.id}"`) : ""}<h3>Acceptance criteria</h3><ul class="criteria">${criteria.map((c) => ui`<li><span>${escape(c.id)}</span>${escape(c.text)}</li>`).join("")}</ul><h3>Scope</h3><p class="muted">${escape((s.data.paths as string[])?.join(", ") || tx("Defined by the specification"))}</p>`;
  if (detailTab === "issues")
    body =
      records
        .filter((e) => e.kind === "finding")
        .map(
          (e) =>
            ui`<article class="record"><div class="section-heading"><h3>${escape(e.title)}</h3>${badge(e.state)}</div><p>${escape(e.data.observation)}</p><p><strong>Impact:</strong> ${escape(e.data.impact)}</p>${e.data.resolution ? ui`<p><strong>Resolution:</strong> ${escape(e.data.resolution)}</p>` : ""}${((e.data.sources as SourceRef[]) ?? []).map(sourceButton).join("")}</article>`,
        )
        .join("") ||
      ui(
        '<p class="muted">No findings recorded. The outcome will state whether issues were found.</p>',
      );
  if (detailTab === "decisions")
    body =
      records
        .filter((e) => e.kind === "decision")
        .map(
          (e) =>
            ui`<article class="record"><h3>${escape(e.title)}</h3><p>${escape(e.data.choice)}</p><p><strong>Why:</strong> ${escape(e.data.rationale)}</p><p><strong>Tradeoffs:</strong> ${escape(e.data.alternatives)}</p><p><strong>Consequences:</strong> ${escape(e.data.consequences)}</p><small class="muted">${escape(e.data.provenance)}</small></article>`,
        )
        .join("") ||
      ui(
        '<p class="muted">Choices and their rationale will remain here for future work.</p>',
      );
  if (detailTab === "evidence")
    body =
      records
        .filter((e) => e.kind === "evidence")
        .map(
          (e) =>
            ui`<article class="record"><div class="section-heading"><h3>${escape(e.title)}</h3>${badge(e.state)}</div><p class="muted">${e.data.origin === "contextory-runner" ? tx("Independent Contextory check") : tx("Agent-reported observation")} · ${escape((e.data.criteria as string[])?.join(", "))}</p><pre>${escape(e.data.detail)}</pre><small class="muted">Bound to the recorded source, contract and attempt. Completion rechecks eligibility.</small></article>`,
        )
        .join("") ||
      ui(
        '<p class="muted">No evidence yet. Native agents can run your configured independent checks.</p>',
      );
  if (detailTab === "outcome")
    body =
      records
        .filter((e) => e.kind === "outcome")
        .map(
          (e) =>
            ui`<article class="record"><h3>What changed</h3><p>${escape(e.data.summary)}</p><h3>Issues and fixes</h3><p>${escape(e.data.issuesSummary)}</p><h3>Decisions</h3><p>${escape(e.data.decisionsSummary)}</p><h3>Remaining limits</h3><p>${escape(e.data.limitations)}</p><h3>Report</h3><p>${escape(e.data.report)}</p></article>`,
        )
        .join("") ||
      ui(
        '<p class="muted">The agent submits a durable explanation before completion.</p>',
      );
  if (detailTab === "history")
    body = ui`<p>Explore all events for this specification and its records.</p>${button("history", tx("Open specification history"), `data-id="${s.id}"`, "small")}`;
  if (detailTab === "usage") {
    const usage = usageBySpec.get(s.id);
    const count = (value: number | null | undefined) =>
      value === null || value === undefined
        ? tx("Unavailable")
        : value.toLocaleString(language());
    body = ui`<div class="section-heading"><h3>Agent models and usage</h3>${button("refreshUsage", tx("Refresh usage"), "", "small")}</div>${usage ? ui`<p>${usage.attempts} native request attempts observed; ${usage.measuredAttempts} with token counts.</p>${usage.groups.map((g) => ui`<article class="record"><h3>${escape(g.provider)} &middot; ${escape(g.model ?? tx("Model unavailable"))}</h3><p>Input: ${count(g.tokens.inputTokens)} &middot; Output: ${count(g.tokens.outputTokens)} &middot; Total: ${count(g.tokens.totalTokens)}</p><p class="muted">Cached input (included in input): ${count(g.tokens.cachedInputTokens)}<br>Reasoning (included in output): ${count(g.tokens.reasoningTokens)}</p></article>`).join("") || ui('<p class="muted">No native model or usage records linked to this specification.</p>')}${usage.groupsTruncated ? ui('<p class="muted">Only the first 100 model groups are shown. Filter with contextory_usage_get.</p>') : ""}<p class="muted">${escape(tx(usage.note))}</p>` : ui('<p class="muted">Loading native usage records...</p>')}`;
  }
  return ui`<section id="detail-${s.id}" class="spec-detail" aria-label="${escape(s.title)} details"><div class="section-heading"><span class="record-id">${s.id}</span>${projectBadge()}${badge(s.state)}</div><label class="spec-section">Specification details<select id="detailSection" name="detailSection" aria-label="Specification details">${["contract", "issues", "decisions", "evidence", "outcome", "usage", "history"].map((tab) => ui`<option value="${tab}" ${detailTab === tab ? "selected" : ""}>${tab === "contract" ? tx("Plan & progress") : tx(tab[0].toUpperCase() + tab.slice(1))}</option>`).join("")}</select></label>${detailTab === "contract" ? workStatus(s) : ""}<div class="spec-section-body">${body}</div><div class="detail-actions">${button("impact", tx("Explore relationships"), `data-id="${s.id}"`)}${s.state === "submitted" ? button("complete", tx("Check completion"), `data-id="${s.id}" data-revision="${s.revision}"`, "primary") : ""}</div></section>`;
}
function nativeDiagnostics() {
  const configured = dashboard?.connections.filter((c) => c.configured) ?? [];
  return configured.length
    ? ui`<section class="native-diagnostics"><strong>Native observations</strong>${configured.map((c) => ui`<p><b>${escape(clients[c.provider].label)}</b><span>MCP: ${c.mcpCurrent ? tx("observed in this service") : tx("waiting for native traffic")}</span>${c.provider !== "generic" ? ui`<span>Hooks: ${c.hookCurrent ? tx("observed in this service") : tx("waiting for a trusted native event")}</span>` : ""}</p>`).join("")}<small>These are observations, not a live probe of the agent. Contextory checks its own service every 20 seconds.</small><p class="tools-help">Hook files update immediately. If Codex has not loaded them, review /hooks in that session and resume it after restarting extensions. Native trust stays with Codex.</p></section>`
    : "";
}
function workspaceNavigation() {
  const tools = [
    ["documentation", tx("Documentation")],
    ["catalog", tx("Knowledge")],
    ["versions", tx("Versions")],
    ["history", tx("History")],
    ["map", tx("Code map")],
    ["architecture", tx("Architecture")],
  ];
  return ui`<nav class="main-nav" aria-label="Contextory views">${[
    ["overview", tx("Work")],
    ["requests", tx("Requests")],
    ["approvals", tx("Approvals")],
  ]
    .map(([id, label]) =>
      button(
        "navigate",
        id === "approvals" && reviewCount()
          ? ui`${label}<span class="approval-count" aria-hidden="true">${reviewCount()}</span>`
          : label,
        ui`data-screen="${id}" aria-label="${label}" ${id === "approvals" ? ui`title="${reviewCount()} items awaiting review"` : ""} aria-current="${screen === id ? "page" : "false"}"`,
        screen === id ? "active" : "",
      ),
    )
    .join(
      "",
    )}<details class="workspace-tools" ${drafts.toolsOpen === "true" ? "open" : ""}><summary>Tools <span aria-hidden="true">⌄</span></summary><div class="tools-menu">${tools.map(([id, label]) => button("navigate", label, `data-screen="${id}" aria-current="${screen === id ? "page" : "false"}"`)).join("")}<hr>${nativeDiagnostics()}${button("checkConnections", tx("Check connections"))}${button("restartAgents", tx("Restart agent extensions"), ui('title="Restarts the Extension Host and interrupts active extension tasks"'))}</div></details></nav>`;
}
function attentionStrip() {
  const count = reviewCount();
  return ui`<div class="attention-strip">${count && screen !== "approvals" ? button("navigate", ui`<span class="review-count">${count}</span><span>Knowledge ${count === 1 ? tx("item needs") : tx("items need")} review</span><span aria-hidden="true">→</span>`, ui('data-screen="approvals" aria-label="Review pending knowledge"'), "review-alert") : ""}${serviceConnection.state === "reconnecting" ? ui`<div class="connection-alert" role="status"><strong>Reconnecting automatically</strong><span>${escape(serviceConnection.text)}</span>${dashboard ? ui("<small>Showing the last received workspace data.</small>") : ""}${button("refresh", tx("Retry now"), "", "small")}</div>` : ""}${dashboard?.configurationError ? ui`<div class="configuration-alert" role="status"><span>${escape(dashboard.configurationError)}</span>${button("checkSettings", tx("Fix check settings"), "", "small")}</div>` : ""}${automation?.reloadRequired ? ui`<div class="reload-alert"><span>Agent setup changed. Reload integrations to use it.</span>${button("restartAgents", tx("Restart extensions"), ui('title="Interrupts active extension tasks"'), "small")}</div>` : ""}</div>`;
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
    tx("No workspace open");
  const workspacePath =
    document.body.dataset.workspacePath || dashboard?.root || workspaceName;
  app.classList.toggle("workspace-console", surface === "sidebar");
  app.innerHTML = ui`<header class="app-header"><div class="brand"><span class="brand-mark" aria-hidden="true">${contextoryIcon}</span><div class="brand-copy"><strong>Contextory</strong><span class="workspace-name" aria-label="Workspace" title="${escape(workspacePath)}">${escape(workspaceName)}</span></div></div>${button("refresh", "&#8635;", ui('aria-label="Refresh workspace" title="Refresh workspace"'), "icon-button")}</header>${projectSelector()}${surface === "sidebar" ? workspaceNavigation() + attentionStrip() : ""}${notice ? ui`<div class="notice" role="status"><span>${escape(notice)}</span>${button("dismiss", "?", ui('aria-label="Dismiss notification"'), "icon-button")}</div>` : ""}${busy ? ui('<div class="loading-line" role="progressbar" aria-label="Contextory is working"></div>') : ""}<main>${projectPending ? empty(tx("Switching project"), tx("Loading this project's records...")) : !dashboard && screen !== "map" && screen !== "relationships" ? empty(serviceConnection.state === "reconnecting" ? tx("Restoring your workspace") : tx("Your workspace, connected"), tx("Contextory keeps trying automatically while the service starts. Your project records stay in place."), button("refresh", tx("Retry now"), "", "primary")) : screen === "documentation" ? documentationView(documentationPage, drafts, documentationOffset, documentationError, documentationLoading, documentationJob) : screen === "versions" ? versionsView(versionsPage, versionDetail, releasePlan, drafts, versionsOffset) : screen === "catalog" ? catalogView(catalogPage, drafts, catalogOffset) : screen === "approvals" ? approvalsView(approvalsPage, drafts, approvalsOffset, catalogStatuses) : screen === "architecture" ? architectureView(architecture, codeContext, drafts.codeQuery ?? "", architectureOnly, architectureState, dashboard?.references ?? [], architectureCodebase) : screen === "relationships" ? relationshipView(relationships) : screen === "requests" ? requestTree() : screen === "history" ? historyView() : screen === "map" ? map() : overview()}</main><footer>${surface === "sidebar" ? connections() : ""}<div class="workspace-status"><span class="status-dot ${serviceConnection.state === "connected" ? "online" : ""}"></span><span class="service-state" title="${escape(serviceConnection.checkedAt ? ui`Last connection check: ${new Date(serviceConnection.checkedAt).toLocaleString(language())}` : serviceConnection.text)}">${serviceConnection.state === "connected" ? tx("Service connected") : serviceConnection.state === "reconnecting" ? tx("Reconnecting?") : tx("Connecting?")}</span>${surface === "sidebar" ? rebuildHooksButton() + autoConnectSwitch() : ui('<span class="footer-label">Native conversation &middot; durable context</span>')}</div></footer>`;
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
const send = (message: Record<string, unknown>) =>
  host.postMessage({
    ...message,
    ...(currentProjectId ? { projectId: currentProjectId } : {}),
  });
function chooseProject(projectId: string, recordId?: string) {
  send({ type: "selectProject", targetProjectId: projectId, recordId });
  expectedProjectId = projectId;
  projectPending = true;
  resetProject();
  render();
}
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
function loadDocumentation() {
  documentationLoading = true;
  documentationError = "";
  documentationRequestId = `documentation:${++documentationSequence}`;
  send({
    type: "tool",
    name: "contextory_docs_get",
    requestId: documentationRequestId,
    arguments: {
      section: "sections",
      query: drafts.docsQuery ?? "",
      path: drafts.docsPath || undefined,
      recordId: drafts.docsRecord || undefined,
      locale: drafts.docsLocale || language(),
      offset: documentationOffset,
      limit: 10,
    },
  });
}
function pollDocumentationJob() {
  if (!documentationJobId) return;
  documentationJobRequest = `documentation-job:${++documentationSequence}`;
  send({
    type: "tool",
    name: "contextory_docs_get",
    requestId: documentationJobRequest,
    arguments: { section: "job", jobId: documentationJobId },
  });
}
function loadCatalog(
  target: "catalog" | "approvals" = screen === "approvals"
    ? "approvals"
    : "catalog",
) {
  const pending = target === "approvals";
  const requestId = `${target}:${++catalogSequence}`;
  if (pending) approvalsRequestId = requestId;
  else catalogRequestId = requestId;
  send({
    type: "tool",
    name: "contextory_catalog_get",
    requestId,
    arguments: {
      inventory: !pending,
      pendingOnly: pending,
      offset: pending ? approvalsOffset : catalogOffset,
      limit: 20,
      query: pending ? undefined : drafts.catalogQuery || undefined,
      path: pending ? undefined : drafts.catalogPath || undefined,
      category: pending ? undefined : drafts.catalogCategory || undefined,
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
  focusedRequest = r?.id ?? focusedRequest;
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
    case "restartAgents":
    case "checkConnections":
    case "checkSettings":
      send({ type: data.action });
      break;
    case "projectBranch":
      chooseProject(data.projectId!, data.recordId);
      break;
    case "retryWorkspaceRequest": {
      const group = entitiesById.get(data.id!)?.data.workspaceRequest as
        | WorkspaceRequest
        | undefined;
      if (group?.creation)
        send({
          type: "tool",
          name: "contextory_workspace_request_create",
          requestId: `workspace-create:${group.id}`,
          arguments: { ...group.creation, projectIds: group.projectIds },
        });
      break;
    }
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
      drafts.toolsOpen = "false";
      screen = data.screen!;
      if (screen === "history") loadHistory();
      if (screen === "architecture") loadArchitecture();
      if (screen === "requests") preparePanelSelection();
      if (screen === "catalog" || screen === "approvals") loadCatalog();
      if (screen === "versions") loadVersions();
      if (screen === "documentation") loadDocumentation();
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
      if (screen === "approvals") approvalsOffset += 20;
      else catalogOffset += 20;
      loadCatalog();
      break;
    case "catalogPrevious":
      if (screen === "approvals")
        approvalsOffset = Math.max(0, approvalsOffset - 20);
      else catalogOffset = Math.max(0, catalogOffset - 20);
      loadCatalog();
      break;
    case "catalogReview": {
      if (!data.id || !data.review) break;
      if (catalogStatuses[data.id]?.state === "pending") break;
      const reason = drafts[`catalogReason-${data.id}`]?.trim();
      if (data.review === "feedback" && !reason) {
        const text = tx("Describe the update you want the agent to make.");
        notice = text;
        catalogStatuses[data.id] = {
          state: "error",
          text,
          revision: Number(data.revision),
        };
        render();
        break;
      }
      const requestId = `catalog-review:${++catalogReviewSequence}`;
      const item =
        approvalsPage?.proposals.find((r) => r.id === data.id) ??
        approvalsPage?.records.find((r) => r.id === data.id);
      catalogReviews.set(requestId, {
        id: data.id,
        revision: Number(data.revision),
        action: data.review,
        linked: Boolean(
          (item?.data.origin as { nativeSessionId?: string } | undefined)
            ?.nativeSessionId,
        ),
      });
      catalogStatuses[data.id] = {
        state: "pending",
        text: tx("Saving your review…"),
        revision: Number(data.revision),
      };
      render();
      send({
        type: "tool",
        name: "contextory_catalog_review",
        requestId,
        arguments: {
          operationId: crypto.randomUUID(),
          id: data.id,
          expectedRevision: Number(data.revision),
          action: data.review,
          reason: reason ?? "",
        },
      });
      break;
    }
    case "openConversation":
      send({ type: "openConversation", id: data.id });
      break;
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
    case "openDocumentation":
      if (surface !== "sidebar") {
        send({ type: "documentationOpen", path: data.path });
        break;
      }
      drafts.docsQuery = "";
      drafts.docsPath = data.path ?? "";
      drafts.docsRecord = data.id ?? "";
      documentationOffset = 0;
      screen = "documentation";
      loadDocumentation();
      render();
      break;
    case "docsRefresh":
      loadDocumentation();
      render();
      break;
    case "docsClearRecord":
      drafts.docsRecord = "";
      documentationOffset = 0;
      loadDocumentation();
      render();
      break;
    case "docsNext":
      documentationOffset += 10;
      loadDocumentation();
      render();
      break;
    case "docsPrevious":
      documentationOffset = Math.max(0, documentationOffset - 10);
      loadDocumentation();
      render();
      break;
    case "docsOperation":
      if (
        documentationJob &&
        ["queued", "running"].includes(documentationJob.state)
      )
        break;
      documentationJob = { state: "queued", data: { action: data.operation } };
      documentationJobRequest = `documentation-start:${++documentationSequence}`;
      send({
        type: "tool",
        name: "contextory_docs_run",
        requestId: documentationJobRequest,
        arguments: { operationId: crypto.randomUUID(), action: data.operation },
      });
      render();
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
    case "rebuildHooks":
      send({ type: "rebuildHooks" });
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
  if (event.key === tx("Enter") || event.key === " ") {
    const element = (event.target as Element).closest("g[data-action]");
    if (element) {
      event.preventDefault();
      action(element);
    }
  }
});
app.addEventListener("keydown", (event) => {
  const tab = (event.target as Element).closest('[role="tab"]');
  if (
    !tab ||
    !["ArrowLeft", "ArrowRight", tx("Home"), tx("End")].includes(event.key)
  )
    return;
  event.preventDefault();
  const tabs = [...app.querySelectorAll<HTMLElement>('[role="tab"]')];
  const index = tabs.indexOf(tab as HTMLElement);
  const next =
    event.key === tx("Home")
      ? 0
      : event.key === tx("End")
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
  if (input.name === "detailSection") {
    detailTab = input.value;
    if (detailTab === "usage") loadUsage();
    render();
    return;
  }
  if (input.name === "requestSelection") {
    focusedRequest = input.value;
    selected = "";
    openMilestones.clear();
    children(focusedRequest, "milestone").forEach((m) =>
      openMilestones.add(m.id),
    );
    preparePanelSelection(focusedRequest);
    render();
    return;
  }
  if (input.name === "workspaceProject") {
    chooseProject(input.value);
    return;
  }
  if (input.name === "requestProject") {
    if (input.checked) requestProjects.add(input.value);
    else requestProjects.delete(input.value);
    return;
  }
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
    const projectIds = [...new Set([currentProjectId, ...requestProjects])];
    const coordinated = projectIds.length > 1;
    send({
      type: "tool",
      name: coordinated
        ? "contextory_workspace_request_create"
        : "contextory_request_change",
      requestId: coordinated ? "workspace-create:new" : "request-create:new",
      arguments: {
        operationId: crypto.randomUUID(),
        ...(!coordinated ? { action: "create" } : {}),
        title: drafts.requestTitle,
        description: drafts.requestDescription,
        ...(coordinated ? { projectIds } : {}),
      },
    });
    drafts.showRequest = "false";
    drafts.requestTitle = "";
    drafts.requestDescription = "";
    requestProjects.clear();
  }
  if (form.id === "catalog-form") {
    catalogOffset = 0;
    loadCatalog();
  }
  if (form.id === "documentation-form") {
    documentationOffset = 0;
    loadDocumentation();
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
  if (message.type === "serviceConnection") {
    serviceConnection = { ...serviceConnection, ...message };
    render();
    return;
  }
  if (message.type === "projectChanging") {
    expectedProjectId = message.targetProjectId ?? expectedProjectId;
    projectPending = true;
    resetProject();
    render();
    return;
  }
  if (
    message.type !== "restore" &&
    message.projectId &&
    message.projectId !== currentProjectId
  )
    return;
  if (projectPending && message.type !== "restore" && message.type !== "notice")
    return;
  if (message.automation) automation = message.automation;
  if (message.type === "restore") {
    if (expectedProjectId && message.dashboard.projectId !== expectedProjectId)
      return;
    if (
      workspace?.projects.length &&
      !projectPending &&
      currentProjectId &&
      message.dashboard.projectId !== currentProjectId
    )
      return;
    if (currentProjectId && currentProjectId !== message.dashboard.projectId)
      resetProject();
    projectPending = false;
    expectedProjectId = "";
    const previousVersions = JSON.stringify(dashboard?.versioning);
    const previousCatalog = JSON.stringify(dashboard?.catalog);
    indexDashboard(message.dashboard);
    if (
      screen === "documentation" &&
      !documentationPage &&
      !documentationLoading &&
      !documentationError
    )
      loadDocumentation();
    if (previousCatalog !== JSON.stringify(dashboard?.catalog)) {
      if (screen === "approvals") loadCatalog("approvals");
      else approvalsPage = undefined;
      if (screen === "catalog") loadCatalog("catalog");
      else catalogPage = undefined;
    }
    serviceConnection = {
      ...serviceConnection,
      state: "connected",
      checkedAt: new Date().toISOString(),
    };
    loadWorkspaceRequests();
    if (
      screen === "versions" &&
      previousVersions !== JSON.stringify(dashboard?.versioning)
    )
      loadVersions();
  }
  if (
    message.type === "toolResult" &&
    message.requestId === "request-create:new" &&
    message.result?.id
  ) {
    focusedRequest = message.result.id;
    selected = "";
  }
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("workspace-request:")
  )
    workspaceRequests.set(message.result.id, message.result);
  if (
    message.type === "toolResult" &&
    String(message.requestId).startsWith("workspace-create:")
  ) {
    workspaceRequests.set(message.result.id, message.result);
    if (message.result.partial)
      notice = tx(
        "Some project branches could not be created. The request is incomplete; retry its missing branches when the projects are available.",
      );
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
  if (
    surface === "sidebar" &&
    message.type === "navigate" &&
    typeof message.screen === "string"
  ) {
    screen = message.screen;
    if (screen === "catalog" || screen === "approvals") loadCatalog();
    if (screen === "documentation") {
      drafts.docsPath = message.path ?? "";
      drafts.docsRecord = message.recordId ?? "";
      drafts.docsQuery = "";
      documentationOffset = 0;
      loadDocumentation();
    }
  }
  if (message.type === "busy") busy = message.value;
  if (
    message.requestId === documentationRequestId &&
    ["toolResult", "toolError"].includes(message.type)
  ) {
    documentationLoading = false;
    if (message.type === "toolResult") documentationPage = message.result;
    else
      documentationError =
        message.error?.message ??
        message.text ??
        tx("Could not load documentation.");
  }
  if (
    message.requestId === documentationJobRequest &&
    ["toolResult", "toolError"].includes(message.type)
  ) {
    if (message.type === "toolError")
      documentationJob = {
        state: "failed",
        data: {
          error:
            message.error?.message ??
            message.text ??
            tx("Documentation operation failed."),
        },
      };
    else if (message.result.jobId) {
      documentationJobId = message.result.jobId;
      pollDocumentationJob();
    } else {
      documentationJob = message.result;
      if (["queued", "running"].includes(message.result.state)) {
        clearTimeout(documentationPoll);
        documentationPoll = setTimeout(pollDocumentationJob, 1000);
      }
    }
  }
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
    message.requestId === approvalsRequestId
  ) {
    approvalsPage = message.result;
    if (
      approvalsPage &&
      approvalsOffset &&
      !approvalsPage.records.length &&
      !approvalsPage.proposals.length
    ) {
      const remaining = Math.max(
        approvalsPage.total,
        approvalsPage.proposalsTotal ?? approvalsPage.pendingChanges,
      );
      approvalsOffset = remaining ? Math.floor((remaining - 1) / 20) * 20 : 0;
      loadCatalog("approvals");
    }
  }
  if (message.type === "toolResult" || message.type === "toolError") {
    const review = catalogReviews.get(String(message.requestId));
    if (review) {
      catalogReviews.delete(String(message.requestId));
      const failed = message.type === "toolError";
      const text = failed
        ? String(
            message.text || tx("The review could not be saved. Try again."),
          )
        : review.action === "feedback"
          ? review.linked
            ? tx(
                "Update requested. Your instructions are queued for the originating conversation.",
              )
            : tx("Resume the agent and ask it to read this item's feedback.")
          : review.action === "approve"
            ? ui`Approved ${review.id}.`
            : ui`Rejected ${review.id}.`;
      catalogStatuses[review.id] = {
        state: failed ? "error" : "success",
        text,
        revision: review.revision,
      };
      if (!failed) {
        notice = text;
        delete drafts[`catalogReason-${review.id}`];
      }
      // Preserve the reason and reconcile stale revisions without replaying a review.
      catalogPage = undefined;
      loadCatalog("approvals");
      if (screen === "catalog") loadCatalog("catalog");
    }
  }
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
    if (d.classList.contains("catalog-search"))
      drafts.catalogSearchOpen = String(d.open);
    if (d.classList.contains("baseline-review"))
      drafts.baselineReviewOpen = String(d.open);
    if (d.classList.contains("workspace-tools"))
      drafts.toolsOpen = String(d.open);
    if (d.classList.contains("request-brief"))
      drafts.requestBriefOpen = String(d.open);
    if (d.classList.contains("documentation-maintenance"))
      drafts.docsMaintenanceOpen = String(d.open);
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
