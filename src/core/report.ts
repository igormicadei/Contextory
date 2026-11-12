import { RelayError, type Entity } from "../contracts/model";
import { Ledger } from "../storage/ledger";

export function renderReport(
  ledger: Ledger,
  format: string,
  requestId?: string,
): string {
  if (requestId && ledger.get(requestId).kind !== "request")
    throw new RelayError(
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
      "",
    ].join("\n");
  const lines = [
    "# Relay request implementation report",
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
    "Evidence retains its recorded origin and source/contract snapshot. Completed status reflects verification at completion; later edits require fresh verification. Agent-reported evidence is identified separately from independently executed relay-runner checks.",
    "",
  );
  return lines.join("\n");
}
