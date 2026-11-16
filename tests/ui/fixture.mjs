const time = "2026-11-12T12:00:00Z";
const entity = (id, kind, title, data, parentId, state = "active") => ({
  id,
  kind,
  title,
  data,
  parentId,
  state,
  revision: 1,
  createdAt: time,
  updatedAt: time,
});
const dashboard = {
  root: "C:/Projects/Checkout",
  projectId: "demo",
  sequence: 7,
  connections: ["codex", "claude", "bob"].map((provider) => ({
    provider,
    configured: provider === "codex",
    mcpSeen: provider === "codex" ? time : undefined,
    hookSeen: provider === "codex" ? time : undefined,
    lastEvent: "SessionStart",
  })),
  semantic: {
    ready: false,
    model: "Xenova/all-MiniLM-L6-v2",
    detail: "Lexical search ready. Optional local model not prepared.",
  },
  recipes: [],
  entities: [
    ...Array.from({ length: 7 }, (_, i) =>
      entity(`REQ-open-${i}`, "request", `Workspace improvement ${i + 1}`, {
        description: "Additional authorized work",
      }),
    ),
    entity(
      "REQ-closed",
      "request",
      "Completed cleanup",
      { description: "Old work" },
      undefined,
      "completed",
    ),
    entity("REQ-demo", "request", "Make checkout reliable", {
      description: "Keep customer orders safe when payment services are slow.",
    }),
    entity(
      "MS-demo",
      "milestone",
      "Reliable payment processing",
      {},
      "REQ-demo",
    ),
    entity(
      "SPEC-demo",
      "spec",
      "Retry temporary payment failures",
      {
        description: "Retry safely without charging the customer twice.",
        criteria: [
          {
            id: "AC-1",
            text: "A retry preserves the payment idempotency key.",
          },
        ],
        paths: ["src/payments.ts"],
      },
      "MS-demo",
      "implementing",
    ),
    entity(
      "SPEC-baseline",
      "spec",
      "Validate the payment gateway contract",
      {
        description: "Document the gateway retry guarantees.",
        criteria: [{ id: "AC-1", text: "Gateway guarantees are documented." }],
      },
      "MS-demo",
      "completed",
    ),
    entity(
      "ISS-demo",
      "finding",
      "Retries created duplicate charges",
      {
        observation: "The retry generated a new payment key.",
        impact: "Customers could be charged twice.",
        resolution: "Reuse the original key for every attempt.",
        sources: [{ path: "src/payments.ts", line: 14 }],
      },
      "SPEC-demo",
      "resolved",
    ),
    entity(
      "DEC-demo",
      "decision",
      "Preserve payment identity",
      {
        choice: "Keep one idempotency key per payment.",
        rationale: "Retries must refer to the same transaction.",
        alternatives: "Database locking adds contention.",
        consequences: "Store the key with the order.",
        provenance: "agent-authored",
      },
      "SPEC-demo",
    ),
    entity(
      "EV-demo",
      "evidence",
      "Payment unit tests",
      {
        origin: "contextory-runner",
        detail: "12 tests passed",
        criteria: ["AC-1"],
      },
      "SPEC-demo",
      "passed",
    ),
    entity(
      "OUT-demo",
      "outcome",
      "Safe retries",
      {
        summary: "Preserved transaction identity across retries.",
        issuesSummary: "Fixed duplicate payment keys.",
        decisionsSummary: "One key per payment.",
        limitations: "Third-party failures still return an error.",
        report: "Validated payment behavior.",
      },
      "SPEC-demo",
      "submitted",
    ),
  ],
  events: [
    {
      sequence: 7,
      type: "finding.resolved",
      entityId: "SPEC-demo",
      actor: "codex",
      time,
      data: {},
    },
  ],
};
const context = dashboard.entities
  .filter((e) => ["REQ-demo", "MS-demo", "SPEC-demo"].includes(e.id))
  .map((e) => ({ id: e.id, title: e.title, kind: e.kind }));
const historyEvents = Array.from({ length: 85 }, (_, i) => ({
  sequence: 85 - i,
  type: "decision.created",
  entityId: "DEC-demo",
  actor: "codex",
  time,
  data: {},
  title: `Recorded design decision: Preserve payment identity (${85 - i})`,
  context,
}));
dashboard.events = historyEvents.slice(0, 3);
const graph = {
  id: "graph-demo",
  snapshotId: "snapshot-demo",
  root: { path: "src/payments.ts", symbol: "checkout" },
  view: "flow",
  engine: "typescript",
  partial: false,
  unsaved: false,
  durationMs: 24,
  limits: {
    callDepth: 5,
    nodes: 150,
    edges: 300,
    targetsPerCall: 10,
    timeoutMs: 2000,
  },
  nodes: [
    ["n1", "function", "checkout", 0],
    ["n2", "branch", "payment succeeded?", 0],
    ["n3", "call", "saveOrder()", 1],
    ["n4", "call", "retryPayment()", 1],
  ].map(([id, kind, label, depth], i) => ({
    id,
    kind,
    label,
    depth,
    source: { path: "src/payments.ts", line: 10 + i, character: 0 },
  })),
  edges: [
    { id: "e1", from: "n1", to: "n2", kind: "entry" },
    { id: "e2", from: "n2", to: "n3", kind: "branch", label: "true" },
    { id: "e3", from: "n2", to: "n4", kind: "branch", label: "false" },
  ],
  frontier: [{ nodeId: "n4", reason: "depth", handle: "n4" }],
  gaps: ["Static possible paths only. Runtime dispatch may be unresolved."],
};
const send = (data) => window.postMessage(data, "*");
const related = (entity) => ({
  id: entity.id,
  kind: entity.kind,
  title: entity.title,
  description: entity.data.description ?? entity.data.choice ?? "",
  state: entity.state,
  revision: entity.revision,
  sources:
    entity.data.sources ?? (entity.data.paths ?? []).map((path) => ({ path })),
});
const relationshipGraph = {
  origin: "SPEC-demo",
  subject: related(dashboard.entities.find((e) => e.id === "SPEC-demo")),
  direction: "both",
  partial: false,
  depth: 5,
  limit: 60,
  nodes: dashboard.entities
    .filter((e) =>
      ["REQ-demo", "MS-demo", "DEC-demo", "REQ-open-0"].includes(e.id),
    )
    .map((e) => ({ ...related(e), depth: 1 }))
    .concat([
      {
        id: "source:src/payments.ts#checkout",
        kind: "source",
        title: "checkout in src/payments.ts",
        description: "Workspace source symbol checkout.",
        sources: [{ path: "src/payments.ts", symbol: "checkout" }],
        depth: 1,
      },
    ]),
  edges: [
    {
      id: "r1",
      source: "REQ-demo",
      target: "MS-demo",
      kind: "contains",
      rationale: "Project hierarchy",
    },
    {
      id: "r2",
      source: "MS-demo",
      target: "SPEC-demo",
      kind: "contains",
      rationale: "Project hierarchy",
    },
    {
      id: "r3",
      source: "SPEC-demo",
      target: "DEC-demo",
      kind: "contains",
      rationale: "Payment identity must survive retries.",
    },
    {
      id: "r4",
      source: "SPEC-demo",
      target: "source:src/payments.ts#checkout",
      kind: "implements",
      rationale: "Checkout reuses the order's idempotency key on each attempt.",
    },
    {
      id: "r5",
      source: "SPEC-demo",
      target: "REQ-open-0",
      kind: "related_to",
      rationale: "The follow-up request uses the same payment contract.",
    },
  ],
};
window.contextoryMessages = [];
const automation = {
  enabled: true,
  detected: ["codex", "claude"],
  host: "Visual Studio Code",
};
const architecture = {
  status:{state:"ready",snapshotId:"fixture",indexedAt:time,files:12,symbols:38,edges:82,partial:true,gaps:["Dynamic call targets remain unresolved."],changedFiles:0},
  conventions:["Keep payment retries idempotent."],
  subsystems:[{name:"src/payments",files:4,symbols:16,paths:["src/payments.ts"]},{name:"src/service",files:3,symbols:12,paths:["src/service.ts"]}],
  dependencies:[{from:"src/service",to:"src/payments",count:3}],
  entryPoints:[{path:"src/main.ts",line:0}],
  hubs:[{name:"charge",path:"src/payments.ts",line:14,references:5}],
};
window.acquireVsCodeApi = () => ({
  getState() {},
  setState() {},
  postMessage(message) {
    window.contextoryMessages.push(message);
    queueMicrotask(() => {
      if (message.type === "ready" || message.type === "refresh")
        send({ type: "restore", dashboard, automation });
      if (message.type === "autoConnect") {
        automation.enabled = message.enabled;
        send({ type: "automation", automation });
      }
      if (message.type === "ready" && message.surface === "flow")
        send({ type: "flow", graph });
      if (message.type === "ready" && message.surface === "relationships")
        send({ type: "relationships", graph: relationshipGraph });
      if (message.type === "relationships") {
        if (document.body.dataset.surface === "relationships")
          send({ type: "relationships", graph: relationshipGraph });
        else window.open("/relationships.html", "_blank");
      }
      if (message.type === "openRecord")
        window.opener?.postMessage(
          { type: "selectRecord", id: message.id },
          location.origin,
        );
      if (message.type === "trace" || message.type === "expand")
        send({ type: "flow", graph });
      if(message.type === "architecturePanel") window.open("/architecture.html","_blank");
      if(message.type === "tool" && message.name === "contextory_code_architecture_get") send({type:"toolResult",requestId:message.requestId,result:architecture});
      if(message.type === "tool" && message.name === "contextory_code_context_get") send({type:"toolResult",requestId:message.requestId,result:{snapshotId:"fixture",symbols:message.arguments.query==="missing"?[]:[{id:"code:charge",kind:"function",name:"charge",path:"src/payments.ts",line:14,signature:"export function charge(order: Order)",reason:"query"}],records:message.arguments.query==="missing"?[]:[{id:"DEC-demo",title:"Preserve payment identity",description:"Retries use one idempotency key.",reason:"references_source"}],relationships:[],truncated:false}});
      if (message.type === "tool" && message.name === "contextory_search")
        send({
          type: "toolResult",
          requestId: message.requestId,
          result: {
            hits: [
              {
                id: "DEC-demo",
                title: "Preserve payment identity",
                excerpt: "Retries use one idempotency key.",
                revision: "1",
                via: ["lexical"],
                source: { path: "src/payments.ts", line: 14 },
              },
            ],
          },
        });
      if (message.type === "tool" && message.name === "contextory_usage_get")
        send({
          type: "toolResult",
          requestId: message.requestId,
          result: {
            origin: "native-hook",
            availability: "partial",
            attempts: 3,
            measuredAttempts: 2,
            groups: [
              {
                provider: "codex",
                model: "fixture-model",
                attempts: 3,
                measuredAttempts: 2,
                tokens: {
                  inputTokens: 1000,
                  outputTokens: 200,
                  cachedInputTokens: 600,
                  reasoningTokens: null,
                  totalTokens: 1200,
                },
              },
            ],
            records: [],
            totalRecords: 3,
            nextOffset: null,
            note: "Observed native metadata only; missing counts are unavailable, not zero. No transcripts are read.",
          },
        });
      if (
        message.type === "tool" &&
        message.name === "contextory_history_get"
      ) {
        const events = historyEvents.filter(
          (e) =>
            (!message.arguments.before ||
              e.sequence < message.arguments.before) &&
            (!message.arguments.entityId ||
              e.context.some((c) => c.id === message.arguments.entityId)),
        );
        const page = events.slice(0, message.arguments.limit);
        send({
          type: "toolResult",
          requestId: message.requestId,
          result: {
            events: page,
            nextBefore:
              events.length > page.length ? page.at(-1).sequence : null,
          },
        });
      }
      if (
        message.type === "tool" &&
        message.name === "contextory_request_change"
      ) {
        dashboard.entities.push(
          entity("REQ-created", "request", message.arguments.title, {
            description: message.arguments.description,
          }),
        );
        send({ type: "restore", dashboard });
      }
      if (message.type === "connect") {
        dashboard.connections.find(
          (c) => c.provider === message.provider,
        ).configured = true;
        send({ type: "restore", dashboard });
      }
    });
  },
});
