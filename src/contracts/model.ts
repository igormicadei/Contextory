export const version = "0.5.1";
export type Provider = import("../providers/clients").ClientId;
export type Kind =
  | "request"
  | "milestone"
  | "spec"
  | "session"
  | "finding"
  | "decision"
  | "evidence"
  | "knowledge"
  | "knowledge_change"
  | "migration"
  | "release"
  | "outcome";
export interface Entity {
  projectId?: string;
  id: string;
  kind: Kind;
  parentId?: string;
  title: string;
  revision: number;
  state: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
export interface Actor {
  id: string;
  provider?: Provider;
  human: boolean;
}
export interface Audit {
  sequence: number;
  type: string;
  entityId: string;
  actor: string;
  time: string;
  data: Record<string, unknown>;
  title?: string;
  context?: { id: string; title: string; kind: Kind }[];
}
export interface HistoryPage {
  events: Audit[];
  nextBefore: number | null;
}
export interface CheckRecipe {
  id: string;
  name: string;
  executable: string;
  args: string[];
  timeoutMs?: number;
}
export interface CodebaseInfo {
  id: string;
  name: string;
  root: string;
  role: "current" | "reference";
}
export interface SourceRef {
  projectId?: string;
  codebaseId?: string;
  path: string;
  line?: number;
  character?: number;
  symbol?: string;
}
export interface RelationshipRecord {
  id: string;
  kind: Kind | "source" | "record";
  title: string;
  description: string;
  state?: string;
  revision?: number;
  sources: SourceRef[];
}
export interface RelationshipGraph {
  origin: string;
  subject: RelationshipRecord;
  nodes: (RelationshipRecord & { depth: number })[];
  edges: {
    id: string;
    source: string;
    target: string;
    kind: string;
    rationale: string;
  }[];
  direction: string;
  partial: boolean;
  limit: number;
  depth: number;
}
export interface SourceSnapshot {
  hash: string;
  files: number;
  gitHead?: string;
  capturedAt: string;
}
export interface Descriptor {
  schema: 1;
  url: string;
  token: string;
  root: string;
  role: string;
  instance: string;
}
export interface Connection {
  provider: Provider;
  configured: boolean;
  hookSeen?: string;
  mcpSeen?: string;
  lastEvent?: string;
  nativeSession?: string;
  mcpCurrent?: boolean;
  hookCurrent?: boolean;
}
export interface Dashboard {
  workspace?: WorkspaceInfo;
  versioning?: import("../releases/manager").VersionStatus;
  references?: CodebaseInfo[];
  codebase?: import("../codebase/model").CodeStatus;
  root: string;
  projectId: string;
  sequence: number;
  entities: Entity[];
  events: Audit[];
  connections: Connection[];
  recipes: CheckRecipe[];
  semantic: { ready: boolean; model: string; detail: string };
}
export interface WorkspaceProject {
  id: string;
  name: string;
  root: string;
}
export interface WorkspaceInfo {
  id?: string;
  projects: WorkspaceProject[];
  contexts: { id: string; projects: WorkspaceProject[] }[];
}
export interface WorkspaceRequest {
  id: string;
  ownerProjectId: string;
  projectIds: string[];
  creation?: { operationId: string; title: string; description: string };
}
export interface WorkspaceRequestStatus extends WorkspaceRequest {
  error?: string;
  state: "active" | "completed" | "incomplete";
  partial: boolean;
  branches: {
    project: WorkspaceProject;
    request?: { id: string; title: string; state: string };
    specs?: { id: string; title: string; state: string }[];
    error?: string;
  }[];
}
export interface AgentAutomation {
  enabled: boolean;
  detected: Provider[];
  host: string;
}
export interface FlowRoot {
  path: string;
  position?: { line: number; character: number };
  symbol?: string;
  start?: "cursor" | "function";
}
export interface FlowLimits {
  callDepth: number;
  nodes: number;
  edges: number;
  targetsPerCall: number;
  timeoutMs: number;
}
export interface FlowInput {
  codebaseId?: string;
  root: FlowRoot;
  view?: "calls" | "flow";
  direction?: "outgoing" | "incoming";
  limits?: Partial<FlowLimits>;
  overlays?: Record<string, string>;
}
export interface FlowNode {
  id: string;
  label: string;
  kind:
    | "function"
    | "statement"
    | "branch"
    | "call"
    | "return"
    | "throw"
    | "loop"
    | "exit"
    | "gap";
  source?: SourceRef;
  depth: number;
  detail?: string;
}
export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  kind: string;
  label?: string;
  source?: SourceRef;
}
export interface Frontier {
  nodeId: string;
  reason: string;
  handle?: string;
  target?: FlowRoot;
}
export interface FlowGraph {
  codebase?: CodebaseInfo;
  id: string;
  snapshotId: string;
  root: FlowRoot;
  view: string;
  engine: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  frontier: Frontier[];
  gaps: string[];
  limits: FlowLimits;
  partial: boolean;
  unsaved: boolean;
  durationMs: number;
}
export const flowDefaults: FlowLimits = {
  callDepth: 5,
  nodes: 150,
  edges: 300,
  targetsPerCall: 10,
  timeoutMs: 2000,
};
export class ContextoryError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ContextoryError";
  }
}
export function requireValue<T>(
  value: T | undefined | null | false,
  message: string,
): T {
  if (value === undefined || value === null || value === false)
    throw new ContextoryError("INVALID_ARGUMENT", message);
  return value;
}
