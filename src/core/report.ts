import { ContextoryError, type Entity } from "../contracts/model";
import { Ledger } from "../storage/ledger";
import { usageReport, usageSummary } from "./usage";

export function renderReport(
  ledger: Ledger,
  format: string,
  requestId?: string,
): string {
  if (requestId && ledger.get(requestId).kind !== "request")
    throw new ContextoryError(
      "WRONG_KIND",
      "Reports must be exported for a request.",
    );
  const all = ledger.all();
  const byParent = new Map<string, Entity[]>();
  for (const e of all)
    if (e.parentId)
      byParent.set(e.parentId, [...(byParent.get(e.parentId) ?? []), e]);
  const records: Entity[] = [];
  const visit = (e: Entity) => {
    records.push(e);
    for (const child of byParent.get(e.id) ?? []) visit(child);
  };
  for (const r of all.filter(
    (e) => e.kind === "request" && (!requestId || e.id === requestId),
  ))
    visit(r);
  if (format === "json")
    return JSON.stringify(
      {
        projectId: ledger.projectId,
        requestId,
        sequence: ledger.sequence(),
        records,
        usage: usageSummary(ledger, { entityId: requestId, limit: 0 }),
      },
      null,
      2,
    );
  if (format === "changelog")
    return [
      "# Changelog",
      "",
      ...records
        .filter((e) => e.kind === "spec" && e.state === "completed")
        .flatMap((s) => {
          const out = records.find((e) => e.id === s.data.latestOutcome);
          return out ? [`- ${out.data.changelog} (${s.id})`] : [];
        }),
      ...records
        .filter((e) =>
          ["knowledge", "knowledge_change", "decision", "migration"].includes(
            e.kind,
          ),
        )
        .map(
          (e) =>
            `- ${e.kind}: ${e.title} (${e.id}; ${e.state}; revision ${e.revision})`,
        ),
      ...ledger
        .events(Number.MAX_SAFE_INTEGER)
        .filter(
          (event) =>
            event.type.startsWith("catalog.") &&
            records.some((e) => e.id === event.entityId),
        )
        .reverse()
        .map(
          (event) =>
            `- ${event.time}: ${event.type} ${event.entityId}; actor ${event.actor}; ${JSON.stringify(event.data)}`,
        ),
      "",
    ].join("\n");
  const lines = [
    "# Contextory request implementation report",
    "",
    `Project: ${ledger.projectId}. Record sequence: ${ledger.sequence()}.`,
    "",
  ];
  const field = (name: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    lines.push(
      `**${name}**`,
      "",
      typeof value === "string" ? value : JSON.stringify(value, null, 2),
      "",
    );
  };
  for (const e of records.filter((e) =>
    ["request", "milestone", "spec"].includes(e.kind),
  )) {
    lines.push(
      `${e.kind === "request" ? "##" : e.kind === "milestone" ? "###" : "####"} ${e.id}: ${e.title}`,
      "",
      `Revision ${e.revision}; status: ${e.state}.`,
      "",
    );
    field(
      e.kind === "request" ? "Current request contract" : "Contract",
      e.data.description,
    );
    if (e.kind === "request") {
      field("Original user intent", e.data.original);
      field("Contract amendments", e.data.amendments);
    }
    if (e.kind === "request" || e.kind === "spec")
      lines.push(
        ...usageReport(usageSummary(ledger, { entityId: e.id, limit: 0 })),
      );
    if (e.kind !== "spec") continue;
    lines.push(
      "**Acceptance criteria**",
      "",
      ...(e.data.criteria as { id: string; text: string }[]).map(
        (c) => `- ${c.id}: ${c.text}`,
      ),
      "",
    );
    field("Scope / files", (e.data.paths as string[])?.join(", "));
    field("Dependencies", (e.data.dependencies as string[])?.join(", "));
    field("Contract fingerprint", e.data.contract);
    const children = byParent.get(e.id) ?? [];
    const sections: [string, string, [string, string][]][] = [
      [
        "knowledge",
        "File, rule, feature and UI definitions",
        [
          ["content", "Definition and source/test links"],
          ["provenance", "Provenance"],
          ["review", "Human review"],
          [
            "maintenanceReview",
            "Compatible agent maintenance (not human approval)",
          ],
          ["fingerprints", "Source fingerprints"],
        ],
      ],
      [
        "knowledge_change",
        "Definition changes and retirements",
        [
          ["before", "Before"],
          ["content", "After / retired definition"],
          ["reason", "Reason"],
          ["targetId", "Target"],
          ["targetRevision", "Original revision"],
          ["beforeFingerprints", "Original source fingerprints"],
          ["fingerprints", "Replacement source fingerprints"],
          ["compatibility", "Compatibility assessment"],
          ["impact", "Change impact"],
          ["decisionIds", "Related decisions"],
          ["review", "Review and approval provenance"],
          ["appliedRevision", "Applied revision"],
        ],
      ],
      [
        "migration",
        "Baseline migration",
        [
          ["cursor", "Scanned files"],
          ["manifestHash", "Manifest fingerprint"],
          ["gaps", "Skipped files and coverage gaps"],
          ["note", "Semantic coverage limits"],
        ],
      ],
      [
        "outcome",
        "Changes and outcomes",
        [
          ["summary", "What changed"],
          ["issuesSummary", "Issues and fixes"],
          ["decisionsSummary", "Decisions"],
          ["report", "Implementation report"],
          ["limitations", "Limitations / remaining work"],
          ["changelog", "Changelog"],
          ["criteria", "Criterion-to-evidence coverage"],
          ["commits", "Commits"],
        ],
      ],
      [
        "finding",
        "Issues found and resolutions",
        [
          ["observation", "Observation"],
          ["impact", "Impact"],
          ["resolution", "How it was solved"],
          ["blocking", "Blocks completion"],
          ["sources", "Source references"],
        ],
      ],
      [
        "decision",
        "Design decisions",
        [
          ["choice", "Decision"],
          ["rationale", "Why"],
          ["alternatives", "Alternatives considered"],
          ["consequences", "Consequences"],
          ["impact", "Decision impact"],
          ["conflictReview", "Conflict review provenance"],
          ["approvalId", "Approved proposal"],
          ["sources", "Source references"],
        ],
      ],
      [
        "evidence",
        "Tests and evidence",
        [
          ["origin", "Evidence origin"],
          ["criteria", "Acceptance criteria"],
          ["recipeId", "Check recipe"],
          ["recipe", "Executed check (executable and arguments)"],
          ["command", "Command"],
          ["detail", "Observed result / test output"],
          ["exitCode", "Exit code"],
          ["snapshot", "Source snapshot"],
          ["afterSnapshot", "Source after check"],
          ["artifact", "Retained output artifact"],
        ],
      ],
    ];
    for (const [kind, heading, fields] of sections) {
      lines.push(`##### ${heading}`, "");
      const items = children.filter((c) => c.kind === kind);
      if (!items.length) lines.push("No records stored.", "");
      for (const item of items) {
        lines.push(
          `**${item.title}** (${item.id}; ${item.state}; revision ${item.revision})`,
          "",
        );
        if (kind === "outcome")
          lines.push(
            item.id === e.data.latestOutcome
              ? "Current submitted outcome."
              : "Historical outcome; retained for evaluation.",
            "",
          );
        for (const [key, label] of fields) field(label, item.data[key]);
      }
    }
  }
  lines.push(
    "Evidence retains its recorded origin and source/contract snapshot. Completed status reflects verification at completion; later edits require fresh verification. Agent-reported evidence is identified separately from independently executed contextory-runner checks.",
    "",
  );
  return lines.join("\n");
}
