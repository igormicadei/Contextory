import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";
import { ContextoryError } from "../contracts/model";
import { workspacePath } from "../verification/workspace";
import { codeEdge, codeId, type CodeImport, type CodeNode } from "./model";
import { digest } from "../storage/ledger";
import { included, readProjectConfig } from "./config";
import type { CodebaseIndex } from "./index";

const label = z.string().max(4000);
const edgeSchema = z
  .object({
    source: z.union([label, z.number()]),
    target: z.union([label, z.number()]),
    relation: label.optional(),
    confidence: z.enum(["EXTRACTED", "INFERRED", "AMBIGUOUS"]).optional(),
    source_file: label.nullish(),
    source_location: label.nullish(),
  })
  .passthrough();
const schema = z.object({
  graph: z
    .object({
      schema_version: z.union([z.string(), z.number()]).optional(),
      graphify_version: label.optional(),
    })
    .passthrough()
    .optional(),
  nodes: z
    .array(
      z
        .object({
          id: z.union([label, z.number()]),
          label: label.optional(),
          source_file: label.nullish(),
          source_location: label.nullish(),
          file_type: label.optional(),
          kind: label.optional(),
        })
        .passthrough(),
    )
    .max(50000),
  links: z.array(edgeSchema).max(200000).optional(),
  edges: z.array(edgeSchema).max(200000).optional(),
});
const clean = (value: string, length = 500) =>
  value.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").slice(0, length);
export async function importGraphify(index: CodebaseIndex, input: string) {
  const file = await workspacePath(index.ledger.root, input);
  const importId = relative(index.ledger.root, file).replaceAll("\\", "/");
  if ((await stat(file)).size > 16 * 1024 * 1024)
    throw new ContextoryError("IMPORT_LIMIT", "Graphify JSON exceeds 16 MiB.");
  const text = await readFile(file, "utf8");
  if (Buffer.byteLength(text) > 16 * 1024 * 1024)
    throw new ContextoryError("IMPORT_LIMIT", "Graphify JSON exceeds 16 MiB.");
  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(JSON.parse(text));
  } catch (error) {
    throw new ContextoryError(
      "INVALID_GRAPHIFY",
      error instanceof Error ? error.message.slice(0, 1000) : "Invalid graph",
    );
  }
  const version = data.graph?.schema_version;
  if (version !== undefined && ![1, "1", "1.0", "1.0.0"].includes(version))
    throw new ContextoryError(
      "GRAPHIFY_SCHEMA",
      `Unsupported Graphify schema ${version}.`,
    );
  const source = (value?: string | null) => {
    if (!value) return "";
    const path = relative(
      index.ledger.root,
      resolve(index.ledger.root, value),
    ).replaceAll("\\", "/");
    if (
      path.startsWith("../") ||
      isAbsolute(path) ||
      /(^|\/)\.\.(\/|$)/.test(path)
    )
      throw new ContextoryError(
        "INVALID_PATH",
        "Imported sources must belong to this workspace.",
      );
    return path;
  };
  const line = (value?: string | null) => {
    const number = Number(value?.match(/(?:^|L|:)(\d+)/)?.[1] ?? 1);
    return Number.isFinite(number)
      ? Math.max(0, Math.min(number - 1, 10000000))
      : 0;
  };
  const result: CodeImport = {
    nodes: [],
    edges: [],
    sourceHashes: Object.create(null) as Record<string, string>,
    gaps: [
      "Imported Graphify facts retain their supplied provenance; source resolution is limited to the imported graph.",
    ],
  };
  const ids = new Map<string, string>();
  for (const n of data.nodes) {
    const old = String(n.id);
    if (ids.has(old))
      throw new ContextoryError(
        "INVALID_GRAPHIFY",
        "Duplicate imported node ID.",
      );
    const id = codeId("graphify", importId, old),
      path = source(n.source_file),
      name = clean(n.label ?? old);
    ids.set(old, id);
    const kind: CodeNode["kind"] =
      n.file_type === "document" || n.file_type === "rationale"
        ? "section"
        : ["function", "class", "interface", "type", "method", "file"].includes(
              n.kind ?? "",
            )
          ? (n.kind as CodeNode["kind"])
          : path
            ? "function"
            : "contract";
    result.nodes.push({
      id,
      kind,
      label: name,
      qualifiedName: name,
      path,
      line: line(n.source_location),
      endLine: line(n.source_location),
      character: 0,
      language: "graphify-import",
      signature: name,
      text: `Graphify ${clean(data.graph?.graphify_version ?? "unknown", 80)}; original node ${clean(old)}`,
      test: /(^|\/)(tests?|__tests__)(\/|$)/.test(path),
      origin: "graphify",
    });
  }
  const links = data.links ?? data.edges ?? [];
  for (const raw of links) {
    const e = raw as {
      source: string;
      target: string;
      relation?: string;
      confidence?: string;
      source_file?: string;
      source_location?: string;
    };
    const from = ids.get(String(e.source)),
      to = ids.get(String(e.target));
    if (!from || !to)
      throw new ContextoryError(
        "INVALID_GRAPHIFY",
        "An imported edge has a missing endpoint.",
      );
    const edge = codeEdge(
      from,
      to,
      clean(e.relation ?? "related_to", 80),
      source(e.source_file),
      line(e.source_location),
      e.confidence === "EXTRACTED"
        ? "extracted"
        : e.confidence === "AMBIGUOUS"
          ? "ambiguous"
          : "inferred",
      `Graphify provenance: ${clean(e.confidence ?? "unknown", 30)}`,
    );
    edge.extractor = `graphify-${clean(data.graph?.graphify_version ?? "unknown", 80)}`;
    result.edges.push(edge);
  }
  const config = await readProjectConfig(index.ledger.root);
  let bytes = 0;
  for (const path of new Set(
    [
      ...result.nodes.map((n) => n.path),
      ...result.edges.map((e) => e.path),
    ].filter(Boolean),
  )) {
    if (!included(path, config))
      throw new ContextoryError(
        "INVALID_PATH",
        `Imported source is excluded: ${path}`,
      );
    const absolute = await workspacePath(index.ledger.root, path),
      info = await stat(absolute);
    bytes += info.size;
    if (!info.isFile() || info.size > 512 * 1024 || bytes > config.maxBytes)
      throw new ContextoryError(
        "IMPORT_LIMIT",
        "Imported source validation exceeds file/byte limits.",
      );
    result.sourceHashes[path] = digest(await readFile(absolute, "utf8"));
  }
  await index.refresh({ id: importId, data: result });
  return {
    imported: input,
    nodes: result.nodes.length,
    edges: result.edges.length,
    status: index.status(),
  };
}
