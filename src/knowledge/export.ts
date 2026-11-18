import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join } from "node:path";
import type { Input } from "../contracts/tools";
import { ContextoryError } from "../contracts/model";
import type { Application } from "../service/application";

const tables = {
  records: "entities",
  revisions: "revisions",
  history: "audit",
  relationships: "edges",
  code_files: "code_files",
  code_nodes: "code_nodes",
  code_edges: "code_edges",
  code_imports: "code_imports",
  jobs: "jobs",
  usage: "agent_usage",
} as const;

export async function projectExport(
  app: Application,
  p: Input<"contextory_project_export">,
) {
  const db = app.ledger.db;
  const context = {
    projectId: app.ledger.projectId,
    root: app.ledger.root,
    sequence: app.ledger.sequence(),
    snapshotId: app.codebase.status().snapshotId,
    section: p.section,
  };
  if (p.section === "overview") {
    return {
      ...context,
      datasets: [
        ...Object.entries(tables).map(([section, table]) => ({
          section,
          count: Number(
            db.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n,
          ),
        })),
        { section: "artifacts", count: (await artifacts(app.storage)).length },
      ],
      brief: app.brief(),
      architecture: app.codeQueries.architecture(),
      semantic: app.knowledge.embeddings.status(),
      coverage: app.codebase.status(),
      pagination:
        "Read each section with offset/limit and follow nextOffset. Capture sequence and snapshotId; restart changed datasets to obtain a consistent document. entity_get reads individual records/revisions; catalog_get adds current source freshness. Exported rows are stored observations, not newly verified execution or human-approved requirements.",
      privacy:
        "Native conversations, service descriptors, credentials and unrelated files are outside this export. Search indexes and numeric embeddings are rebuildable retrieval implementation data, rather than additional application definitions. Transient flow graphs can be read with flow_trace/flow_expand while their handles remain valid.",
    };
  }
  if (p.artifact && p.section !== "artifacts")
    throw new ContextoryError(
      "INVALID_ARGUMENT",
      "artifact requires section=artifacts.",
    );
  if (p.section === "artifacts") {
    const names = await artifacts(app.storage);
    if (p.artifact) {
      if (basename(p.artifact) !== p.artifact || !names.includes(p.artifact))
        throw new ContextoryError(
          "INVALID_PATH",
          "Choose an artifact name returned by the manifest.",
        );
      const content = await readFile(
        join(app.storage, "artifacts", p.artifact),
        "utf8",
      );
      const start = p.offset * 400;
      return {
        ...context,
        artifact: p.artifact,
        content: content.slice(start, start + p.limit * 400),
        offset: p.offset,
        nextOffset:
          start + p.limit * 400 < content.length ? p.offset + p.limit : null,
        totalCharacters: content.length,
        unit: "400 characters",
      };
    }
    const page = names.slice(p.offset, p.offset + p.limit);
    return {
      ...context,
      items: await Promise.all(
        page.map(async (name) => ({
          name,
          bytes: (await stat(join(app.storage, "artifacts", name))).size,
        })),
      ),
      total: names.length,
      offset: p.offset,
      nextOffset:
        p.offset + page.length < names.length ? p.offset + page.length : null,
    };
  }
  const table = tables[p.section];
  // Identifiers come only from this closed map; all caller values remain bound.
  const filters: Partial<Record<keyof typeof tables, string>> = {
    records: "id=?",
    revisions: "entity_id=?",
    history: "entity_id=?",
    relationships: "(source=? OR target=?)",
    jobs: "json_extract(data,'$.specId')=?",
    usage: "spec_id=?",
  };
  if (p.entityId && !filters[p.section])
    throw new ContextoryError(
      "INVALID_ARGUMENT",
      "This dataset does not support entityId.",
    );
  const where = p.entityId ? ` WHERE ${filters[p.section]}` : "";
  const args = p.entityId
    ? p.section === "relationships"
      ? [p.entityId, p.entityId]
      : [p.entityId]
    : [];
  const total = Number(
    db.prepare(`SELECT count(*) AS n FROM ${table}${where}`).get(...args)!.n,
  );
  const order =
    p.section === "revisions"
      ? "entity_id,revision"
      : p.section === "history"
        ? "sequence"
        : p.section === "code_files"
          ? "path"
          : "id";
  const rows = db
    .prepare(
      `SELECT * FROM ${table}${where} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .all(...args, p.limit, p.offset);
  const items = rows.map((row) => {
    const value = { ...row };
    for (const key of ["data", "record", "tokens"])
      if (typeof value[key] === "string")
        value[key] = JSON.parse(value[key] as string);
    return value;
  });
  return {
    ...context,
    items,
    total,
    offset: p.offset,
    nextOffset: p.offset + rows.length < total ? p.offset + rows.length : null,
  };
}
async function artifacts(storage: string) {
  return (
    await readdir(join(storage, "artifacts"), { withFileTypes: true }).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return [];
        throw error;
      },
    )
  )
    .filter(
      (entry) => entry.isFile() && /\.(?:json|md|txt|log)$/.test(entry.name),
    )
    .map((entry) => entry.name)
    .sort();
}
