import {
  ContextoryError,
  type RelationshipGraph,
  type RelationshipRecord,
  type SourceRef,
  type CodebaseInfo,
} from "../contracts/model";
import type { Knowledge, SearchHit } from "../knowledge/search";
import { codeEdge, type CodeEdge, type CodeNode } from "./model";
import type { CodebaseIndex } from "./index";

const words = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .match(/[\p{L}\p{N}_]+/gu) ?? [];
const stop = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "and",
  "or",
  "to",
  "of",
  "in",
  "on",
  "how",
  "what",
  "does",
  "do",
  "this",
  "that",
  "with",
  "for",
  "which",
  "where",
]);
type ViewNode = RelationshipRecord & { code?: CodeNode };
export class CodeQueries {
  constructor(
    readonly index: CodebaseIndex,
    private knowledge: Knowledge,
    private codebase?: CodebaseInfo,
  ) {}
  ranked(query: string, paths: string[] = []) {
    const q = query.trim().toLowerCase(),
      terms = words(query).filter((t) => !stop.has(t));
    return this.index
      .nodes()
      .map((node) => {
        const label = node.label.toLowerCase(),
          qual = node.qualifiedName.toLowerCase();
        const names = new Set(words(node.label + " " + node.qualifiedName));
        const text = node.text.toLowerCase();
        const exact =
          label === q || qual === q || node.id === query || node.path === query;
        const score =
          (exact ? (node.kind === "file" ? 850 : 1200) : 0) +
          terms.reduce(
            (s, t) =>
              s +
              (names.has(t)
                ? 70
                : label.includes(t)
                  ? 30
                  : text.includes(t)
                    ? 4
                    : node.path.toLowerCase().includes(t)
                      ? 3
                      : 0),
            0,
          ) +
          (paths.some(
            (p) =>
              node.path === p ||
              node.path.startsWith(p.replace(/\/$/, "") + "/"),
          )
            ? 120
            : 0);
        return { node, score, exact };
      })
      .filter((n) => n.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(a.node.kind === "file") - Number(b.node.kind === "file") ||
          a.node.path.localeCompare(b.node.path) ||
          a.node.id.localeCompare(b.node.id),
      );
  }
  async search(query: string, mode: string, limit: number) {
    await this.index.fresh();
    if (this.codebase && mode === "semantic")
      throw new ContextoryError(
        "SEMANTIC_UNAVAILABLE",
        "Reference source search uses lexical graph matching; use lexical or hybrid mode.",
      );
    const old = await this.knowledge.search(
      query,
      this.codebase ? "lexical" : mode,
      limit,
    );
    const definitions: SearchHit[] = this.ranked(query)
      .filter((r) => (this.codebase || r.exact) && r.node.kind !== "file")
      .slice(0, limit)
      .map(({ node, score }) => ({
        id: node.id,
        title: `${node.qualifiedName} — ${node.path}`,
        excerpt: node.text.slice(0, 900),
        revision: this.index.status().snapshotId,
        source: {
          path: node.path,
          line: node.line,
          character: node.character,
          symbol: node.qualifiedName,
        },
        score,
        via: ["definition"],
      }));
    return {
      ...old,
      degraded: this.codebase ? mode !== "lexical" : old.degraded,
      hits: [
        ...definitions,
        ...old.hits.filter(
          (h) =>
            !definitions.some(
              (d) =>
                (d.source as SourceRef)?.path === (h.source as SourceRef)?.path,
            ),
        ),
      ].slice(0, limit),
      snapshotId: this.index.status().snapshotId,
    };
  }
  private graph() {
    const nodes = new Map<string, ViewNode>(
      this.index.nodes().map((n) => [
        n.id,
        {
          id: n.id,
          kind: "source",
          title:
            n.kind === "file"
              ? n.path
              : `${n.qualifiedName} in ${n.path || n.language}`,
          description: n.signature,
          sources: n.path
            ? [
                {
                  path: n.path,
                  symbol: n.kind === "file" ? undefined : n.qualifiedName,
                  line: n.line,
                  character: n.character,
                },
              ]
            : [],
          code: n,
        },
      ]),
    );
    const edges = this.index.edges();
    const codeNodes = [...nodes.values()];
    const resolveRef = (ref: SourceRef) =>
      codeNodes.filter(
        (n) =>
          n.code!.path === ref.path.replaceAll("\\", "/") &&
          (ref.symbol
            ? [n.code!.qualifiedName, n.code!.label].includes(ref.symbol)
            : n.code!.kind === "file"),
      );
    for (const record of this.index.ledger.all().slice(0, 5000)) {
      const data = record.data;
      const sources: SourceRef[] = [
        ...(Array.isArray(data.sources) ? data.sources : []),
        ...(Array.isArray(data.paths)
          ? data.paths
              .filter((p) => typeof p === "string")
              .map((path) => ({ path }))
          : []),
      ];
      nodes.set(record.id, {
        id: record.id,
        kind: record.kind,
        title: record.title,
        description: [
          data.summary ??
            data.description ??
            data.choice ??
            data.observation ??
            "",
          record.kind === "decision" ? data.rationale : undefined,
        ]
          .filter((v) => typeof v === "string")
          .join(" ")
          .slice(0, 700),
        state: record.state,
        revision: record.revision,
        sources,
      });
      for (const ref of sources)
        for (const target of resolveRef(ref))
          edges.push(
            codeEdge(
              record.id,
              target.id,
              "references_source",
              ref.path,
              ref.line ?? 0,
              "extracted",
              "Explicit project record source reference",
            ),
          );
    }
    for (const row of this.index.ledger.db
      .prepare("SELECT * FROM edges ORDER BY id LIMIT 20000")
      .all()) {
      let target = String(row.target),
        source = String(row.source);
      const sourceRef = (id: string) => {
        const ref = id.slice(7),
          split = ref.lastIndexOf("#");
        return resolveRef({
          path: split < 0 ? ref : ref.slice(0, split),
          symbol: split < 0 ? undefined : ref.slice(split + 1),
        });
      };
      const froms = source.startsWith("source:")
        ? sourceRef(source).map((n) => n.id)
        : [source];
      const tos = target.startsWith("source:")
        ? sourceRef(target).map((n) => n.id)
        : [target];
      for (source of froms)
        for (target of tos)
          if (nodes.has(source) && nodes.has(target))
            edges.push({
              ...codeEdge(
                source,
                target,
                String(row.kind),
                "",
                0,
                "extracted",
                String(row.rationale),
              ),
              extractor: "contextory-ledger",
            });
    }
    return { nodes, edges: [...new Map(edges.map((e) => [e.id, e])).values()] };
  }
  private resolve(value: string, nodes: Map<string, ViewNode>) {
    if (nodes.has(value)) return value;
    let path = value,
      symbol: string | undefined;
    if (value.startsWith("source:")) path = value.slice(7);
    if (path.includes("#")) {
      const split = path.lastIndexOf("#");
      symbol = path.slice(split + 1);
      path = path.slice(0, split);
    }
    path = path.replaceAll("\\", "/");
    const found = [...nodes.values()].filter(
      (n) =>
        n.code &&
        (symbol
          ? n.code.path === path &&
            [n.code.label, n.code.qualifiedName].includes(symbol)
          : (n.code.path === path && n.code.kind === "file") ||
            n.code.qualifiedName === value ||
            n.code.label === value),
    );
    if (found.length === 1) return found[0].id;
    if (found.length > 1)
      throw new ContextoryError(
        "AMBIGUOUS_SYMBOL",
        `Qualify the symbol with source:path#qualifiedName. Candidates: ${found
          .slice(0, 5)
          .map((n) => n.code!.path + "#" + n.code!.qualifiedName)
          .join(", ")}`,
      );
    throw new ContextoryError(
      "NOT_FOUND",
      `No indexed source or project record matches ${value}.`,
    );
  }
  async impact(
    value: string,
    direction: string,
    depth: number,
    limit: number,
  ): Promise<RelationshipGraph & { snapshotId: string }> {
    await this.index.fresh();
    const { nodes, edges } = this.graph(),
      root = this.resolve(value, nodes),
      seen = new Set([root]);
    const queue = [{ id: root, depth: 0 }],
      selected: (ViewNode & { depth: number })[] = [];
    const selectedEdges: CodeEdge[] = [];
    let partial = this.index.status().partial;
    while (queue.length) {
      const current = queue.shift()!;
      const adjacent = edges.filter(
        (e) =>
          (direction !== "reverse" && e.source === current.id) ||
          (direction !== "forward" && e.target === current.id),
      );
      for (const e of adjacent) {
        const next = e.source === current.id ? e.target : e.source;
        if (!seen.has(next)) {
          if (current.depth >= depth || selected.length >= limit) {
            partial = true;
            continue;
          }
          seen.add(next);
          selected.push({ ...nodes.get(next)!, depth: current.depth + 1 });
          queue.push({ id: next, depth: current.depth + 1 });
        }
        if (selectedEdges.length < limit * 4) selectedEdges.push(e);
        else partial = true;
      }
    }
    const display = ({ code: _code, ...n }: ViewNode) => n;
    return {
      origin: root,
      subject: display(nodes.get(root)!),
      nodes: selected.map((n) => ({ ...display(n), depth: n.depth })),
      edges: [
        ...new Map(
          selectedEdges.map((e) => [
            e.id,
            {
              id: e.id,
              source: e.source,
              target: e.target,
              kind: e.kind,
              rationale: `${e.detail || e.kind} [${e.category}]${e.path ? ` ${e.path}:${e.line + 1}` : ""}`,
            },
          ]),
        ).values(),
      ],
      direction,
      partial,
      limit,
      depth,
      snapshotId: this.index.status().snapshotId,
    };
  }
  async path(
    from: string,
    to: string,
    direction: "forward" | "both",
    maxDepth: number,
  ) {
    await this.index.fresh();
    const { nodes, edges } = this.graph(),
      start = this.resolve(from, nodes),
      end = this.resolve(to, nodes);
    const queue = [{ id: start, nodes: [start], edges: [] as CodeEdge[] }],
      seen = new Set([start]);
    let partial = false;
    while (queue.length) {
      const current = queue.shift()!;
      if (current.id === end)
        return {
          found: true,
          nodes: current.nodes.map((id) => {
            const { code: _code, ...n } = nodes.get(id)!;
            return n;
          }),
          edges: current.edges,
          snapshotId: this.index.status().snapshotId,
          partial: this.index.status().partial,
        };
      if (current.edges.length >= maxDepth) {
        partial = true;
        continue;
      }
      for (const e of edges
        .filter(
          (e) =>
            e.source === current.id ||
            (direction === "both" && e.target === current.id),
        )
        .sort(
          (a, b) =>
            Number(a.category === "inferred") -
              Number(b.category === "inferred") || a.id.localeCompare(b.id),
        )) {
        const id = e.source === current.id ? e.target : e.source;
        if (seen.has(id)) continue;
        if (seen.size >= 1000) {
          partial = true;
          break;
        }
        seen.add(id);
        queue.push({
          id,
          nodes: [...current.nodes, id],
          edges: [...current.edges, e],
        });
      }
    }
    return {
      found: false,
      nodes: [],
      edges: [],
      snapshotId: this.index.status().snapshotId,
      partial,
      reason:
        "No path found within indexed relationships and traversal limits.",
    };
  }
  architecture() {
    const nodes = this.index.nodes(),
      edges = this.index.edges();
    const subsystem = (path: string) => {
      const p = path.split("/");
      return p.length === 1
        ? "."
        : p[0] === "src" && p.length > 2
          ? p.slice(0, 2).join("/")
          : p[0];
    };
    const groups = new Map<
      string,
      { name: string; files: number; symbols: number; paths: string[] }
    >();
    for (const n of nodes) {
      if (!n.path) continue;
      const name = subsystem(n.path),
        g = groups.get(name) ?? { name, files: 0, symbols: 0, paths: [] };
      if (n.kind === "file") {
        g.files++;
        if (g.paths.length < 5) g.paths.push(n.path);
      } else g.symbols++;
      groups.set(name, g);
    }
    const byId = new Map(nodes.map((n) => [n.id, n])),
      deps = new Map<string, { from: string; to: string; count: number }>(),
      degree = new Map<string, number>();
    for (const e of edges) {
      if (
        !["calls", "imports", "extends", "implements", "re_exports"].includes(
          e.kind,
        )
      )
        continue;
      degree.set(e.target, (degree.get(e.target) ?? 0) + 1);
      const a = byId.get(e.source),
        b = byId.get(e.target);
      if (!a?.path || !b?.path) continue;
      const from = subsystem(a.path),
        to = subsystem(b.path),
        key = from + "\0" + to;
      if (from !== to) {
        const d = deps.get(key) ?? { from, to, count: 0 };
        d.count++;
        deps.set(key, d);
      }
    }
    const entries = new Set(this.index.config?.entryPoints ?? []);
    const entryPoints = nodes
      .filter(
        (n) =>
          n.kind === "file" &&
          (entries.has(n.path) ||
            /(^|\/)(main|index|app|extension|__main__)\.[^/]+$/.test(n.path)),
      )
      .slice(0, 20)
      .map((n) => ({ path: n.path, line: n.line }));
    return {
      status: this.index.status(),
      project: this.index.config?.name,
      conventions: this.index.config?.conventions ?? [],
      subsystems: [...groups.values()]
        .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name))
        .slice(0, 40),
      dependencies: [...deps.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 80),
      entryPoints,
      hubs: [...degree]
        .sort((a, b) => b[1] - a[1])
        .map(([id, references]) => ({ node: byId.get(id)!, references }))
        .filter((h) => h.node && h.node.kind !== "file")
        .slice(0, 10)
        .map((h) => ({
          name: h.node.qualifiedName,
          path: h.node.path,
          line: h.node.line,
          references: h.references,
        })),
    };
  }
  async context(
    query: string,
    paths: string[],
    specId: string | undefined,
    budgetTokens: number,
  ) {
    await this.index.fresh();
    const ranked = this.ranked(query, paths),
      exact = ranked.filter((r) => r.exact),
      seeds = (exact.length ? exact : ranked).slice(0, 5).map((r) => r.node);
    const { nodes, edges } = this.graph(),
      visited = new Set(seeds.map((n) => n.id));
    const candidates = [
      ...seeds.map((n) => ({ id: n.id, reason: "query", depth: 0 })),
    ];
    const memory = await this.knowledge.search(
      query,
      this.codebase ? "lexical" : "hybrid",
      5,
    );
    for (const hit of memory.hits)
      if (nodes.has(hit.id) && !visited.has(hit.id)) {
        visited.add(hit.id);
        candidates.push({ id: hit.id, reason: "project-memory", depth: 0 });
      }
    if (specId) {
      if (!nodes.has(specId) || nodes.get(specId)?.kind !== "spec")
        throw new ContextoryError("NOT_FOUND", "Unknown specification.");
      candidates.push({ id: specId, reason: "specification", depth: 0 });
      visited.add(specId);
    }
    for (let i = 0; i < candidates.length && candidates.length < 120; i++) {
      const c = candidates[i];
      if (c.depth >= 2) continue;
      const weight = (edge: CodeEdge) => {
        const next = nodes.get(
          edge.source === c.id ? edge.target : edge.source,
        );
        return !next?.code
          ? 0
          : edge.kind === "tests"
            ? 1
            : ["calls", "imports", "documents", "sends", "handles"].includes(
                  edge.kind,
                )
              ? 2
              : edge.kind === "references" &&
                  ["function", "method", "class"].includes(next.code.kind)
                ? 2
                : edge.kind === "contains"
                  ? next.code.kind === "method"
                    ? 3
                    : next.code.kind === "variable"
                      ? 7
                      : 6
                  : next.code.kind === "variable"
                    ? 5
                    : 4;
      };
      const nearby = edges
        .filter((e) => e.source === c.id || e.target === c.id)
        .sort((a, b) => weight(a) - weight(b) || a.id.localeCompare(b.id));
      for (const e of nearby.slice(0, 20)) {
        const id = e.source === c.id ? e.target : e.source;
        if (visited.has(id)) continue;
        visited.add(id);
        candidates.push({ id, reason: e.kind, depth: c.depth + 1 });
        if (candidates.length >= 120) break;
      }
    }
    const status = this.index.status();
    const output = {
      ...(this.codebase ? { codebase: this.codebase } : {}),
      snapshotId: status.snapshotId,
      indexState: status.state,
      partial: status.partial,
      gaps: status.gaps.slice(0, 3).map((g) => g.slice(0, 180)),
      budgetTokens,
      budgetBytes: budgetTokens * 3,
      estimatedTokens: 0,
      truncated: false,
      symbols: [] as {
        id: string;
        kind: string;
        name: string;
        path: string;
        line: number;
        signature: string;
        excerpt: string;
        origin: string;
        language: string;
        reason: string;
      }[],
      records: [] as {
        id: string;
        title: string;
        description: string;
        reason: string;
      }[],
      relationships: [] as {
        source: string;
        target: string;
        kind: string;
        category: string;
        extractor: string;
        path: string;
        line: number;
      }[],
      semanticFallback: memory.degraded,
    };
    const size = () => Buffer.byteLength(JSON.stringify(output));
    if (size() > output.budgetBytes - 100)
      throw new ContextoryError(
        "CONTEXT_BUDGET",
        "Increase budgetTokens to include this reference's source identity and coverage.",
      );
    const contentLimit =
      output.budgetBytes -
      Math.min(1000, Math.floor(output.budgetBytes * 0.2)) -
      100;
    const accepted = new Set<string>();
    for (const c of candidates) {
      const n = nodes.get(c.id);
      if (!n) continue;
      if (n.code) {
        const s = n.code;
        output.symbols.push({
          id: s.id,
          kind: s.kind,
          name: s.qualifiedName,
          path: s.path,
          line: s.line,
          signature: s.signature,
          excerpt: s.text.slice(0, c.depth ? 240 : 700),
          origin: s.origin,
          language: s.language,
          reason: c.reason,
        });
        if (size() > contentLimit && c.reason === "query")
          output.symbols[output.symbols.length - 1].excerpt = "";
        if (size() > contentLimit) {
          output.symbols.pop();
          output.truncated = true;
          continue;
        }
      } else {
        output.records.push({
          id: n.id,
          title: n.title,
          description: n.description.slice(0, 450),
          reason: c.reason,
        });
        if (size() > contentLimit) {
          output.records.pop();
          output.truncated = true;
          continue;
        }
      }
      accepted.add(n.id);
    }
    for (const e of edges)
      if (accepted.has(e.source) && accepted.has(e.target)) {
        output.relationships.push({
          source: e.source,
          target: e.target,
          kind: e.kind,
          category: e.category,
          extractor: e.extractor,
          path: e.path,
          line: e.line,
        });
        if (size() > output.budgetBytes - 100) {
          output.relationships.pop();
          output.truncated = true;
          break;
        }
      }
    output.estimatedTokens = Math.ceil(size() / 3);
    return output;
  }
}
