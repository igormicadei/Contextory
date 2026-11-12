import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Ledger, digest } from "../storage/ledger";
import {
  RelayError,
  type RelationshipGraph,
  type RelationshipRecord,
  type SourceRef,
} from "../contracts/model";
import { workspacePath } from "../verification/workspace";
export interface EmbeddingProfile {
  model: string;
  revision: string;
  packageVersion: string;
  dimensions: number;
}
type Extractor = ((
  text: string,
  options: Record<string, unknown>,
) => Promise<{ data: Float32Array }>) & { dispose(): Promise<void> };
export class Embeddings {
  private extractor?: Extractor;
  private loading?: Promise<void>;
  profile?: EmbeddingProfile;
  constructor(readonly directory: string) {}
  status() {
    return {
      ready: existsSync(join(this.directory, "profile.json")),
      model: this.profile?.model ?? "Xenova/all-MiniLM-L6-v2",
      detail: this.extractor
        ? "Local CPU model loaded"
        : existsSync(join(this.directory, "profile.json"))
          ? "Prepared locally; loads on first semantic query"
          : "Not prepared. Lexical search remains available.",
    };
  }
  async load() {
    if (this.extractor) return;
    this.loading ??= (async () => {
      if (!this.status().ready)
        throw new RelayError(
          "SEMANTIC_UNAVAILABLE",
          "Prepare local semantic search from Relay before using semantic mode.",
        );
      this.profile = JSON.parse(
        await readFile(join(this.directory, "profile.json"), "utf8"),
      ) as EmbeddingProfile;
      const moduleUrl = pathToFileURL(
        join(
          this.directory,
          "node_modules/@huggingface/transformers/dist/transformers.node.mjs",
        ),
      ).href;
      const transformer = await import(/* @vite-ignore */ moduleUrl);
      transformer.env.allowRemoteModels = false;
      transformer.env.fetch = async () => {
        throw new Error("Remote model access is disabled for Relay queries.");
      };
      transformer.env.cacheDir = join(this.directory, "models");
      const options = {
        revision: this.profile.revision,
        cache_dir: join(this.directory, "models"),
        local_files_only: true,
        dtype: "q8",
        device: "cpu",
        session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
      };
      // Construct explicitly: the generic v4 pipeline discovers tokenizer files via
      // remote metadata, even when all model files are already in the local cache.
      const modelPath = join(
        this.directory,
        "models",
        this.profile.model,
        this.profile.revision,
      ).replaceAll("\\", "/");
      const [tokenizer, model] = await Promise.all([
        transformer.AutoTokenizer.from_pretrained(modelPath, options),
        transformer.AutoModel.from_pretrained(modelPath, options),
      ]);
      this.extractor = new transformer.FeatureExtractionPipeline({
        task: "feature-extraction",
        tokenizer,
        model,
      });
    })().catch((error) => {
      this.loading = undefined;
      throw new RelayError(
        "SEMANTIC_UNAVAILABLE",
        `Local embedding runtime could not load: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    });
    return this.loading;
  }
  async embed(text: string): Promise<number[]> {
    await this.load();
    const extract = this.extractor!;
    const output = await extract(text, {
      pooling: "mean",
      normalize: true,
      truncation: true,
      max_length: 256,
    });
    return Array.from(output.data);
  }
  identity() {
    return digest(this.profile);
  }
  async close() {
    await this.loading?.catch(() => {});
    await this.extractor?.dispose();
    this.extractor = undefined;
    this.loading = undefined;
  }
}
export interface SearchHit {
  id: string;
  title: string;
  excerpt: string;
  revision: string;
  source?: unknown;
  score: number;
  via: string[];
}
export class Knowledge {
  constructor(
    private ledger: Ledger,
    readonly embeddings: Embeddings,
  ) {}
  private async fresh(hits: SearchHit[], limit: number) {
    const hashes = new Map<string, string>();
    const fresh: SearchHit[] = [];
    let stale = 0;
    for (const hit of hits) {
      if (hit.id.startsWith("source:")) {
        const row = this.ledger.db
          .prepare("SELECT body FROM search WHERE id=?")
          .get(hit.id);
        const data = JSON.parse(String(row?.body ?? "{}"));
        const path = data.source?.path as string;
        if (!hashes.has(path))
          hashes.set(
            path,
            await workspacePath(this.ledger.root, path)
              .then((file) => readFile(file, "utf8"))
              .then(
                (text) => digest(text),
                () => "missing",
              ),
          );
        if (hashes.get(path) !== data.fileHash) {
          stale++;
          continue;
        }
      }
      if (!fresh.some((existing) => existing.id === hit.id)) fresh.push(hit);
      if (fresh.length >= limit) break;
    }
    return {
      hits: fresh,
      staleOmitted: stale,
      ...(stale
        ? {
            reason:
              "Changed or deleted source chunks were omitted. Refresh the workspace index.",
          }
        : {}),
    };
  }
  private hit(
    row: Record<string, unknown>,
    score: number,
    via: string[],
  ): SearchHit {
    const body = String(row.body);
    const data = JSON.parse(body) as Record<string, unknown>;
    const entity = data.entityId
      ? this.ledger.get(String(data.entityId))
      : undefined;
    return {
      id: entity?.id ?? String(row.id),
      title: String(row.title),
      excerpt: String(data.text ?? body).slice(0, 900),
      revision: entity ? String(entity.revision) : String(data.hash),
      source: data.source,
      score,
      via,
    };
  }
  lexical(query: string, limit: number): SearchHit[] {
    const terms = query.match(/[\p{L}\p{N}_]+/gu)?.slice(0, 40) ?? [];
    if (!terms.length) return [];
    const match = terms.map((token) => `"${token}"`).join(" OR ");
    return this.ledger.db
      .prepare(
        "SELECT id,title,body,bm25(search) AS rank FROM search WHERE search MATCH ? ORDER BY rank LIMIT ?",
      )
      .all(match, limit)
      .map((row) => this.hit(row, -Number(row.rank), ["lexical"]));
  }
  async search(query: string, mode: string, limit: number) {
    const lexical = mode === "semantic" ? [] : this.lexical(query, limit * 3);
    if (mode === "lexical")
      return { ...(await this.fresh(lexical, limit)), degraded: false };
    try {
      const vector = await this.embeddings.embed(query);
      const model = this.embeddings.identity();
      const rows = this.ledger.db
        .prepare(
          "SELECT v.*,s.title,s.body FROM vectors v JOIN search s ON s.id=v.id WHERE model=? LIMIT 10001",
        )
        .all(model);
      const semantic = rows
        .slice(0, 10000)
        .flatMap((row) => {
          const current = digest([row.title, row.body]);
          if (row.revision !== current) return [];
          const bytes = row.vector as Uint8Array;
          const embedding = new Float32Array(bytes.slice().buffer);
          if (embedding.length !== vector.length) return [];
          let score = 0;
          for (let i = 0; i < vector.length; i++)
            score += vector[i] * embedding[i];
          return [this.hit(row, score, ["semantic"])];
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, limit * 3);
      if (mode === "semantic")
        return {
          ...(await this.fresh(semantic, limit)),
          partial: rows.length > 10000,
          indexed: rows.length,
          degraded: false,
        };
      const fused = new Map<string, SearchHit>();
      for (const list of [lexical, semantic])
        list.forEach((hit, index) => {
          const old = fused.get(hit.id);
          fused.set(hit.id, {
            ...hit,
            score: (old?.score ?? 0) + 1 / (60 + index),
            via: [...new Set([...(old?.via ?? []), ...hit.via])],
          });
        });
      return {
        ...(await this.fresh(
          [...fused.values()].sort((a, b) => b.score - a.score),
          limit,
        )),
        degraded: false,
        partial: rows.length > 10000,
        indexed: rows.length,
      };
    } catch (error) {
      if (mode === "semantic") throw error;
      return {
        ...(await this.fresh(lexical, limit)),
        degraded: true,
        reason:
          error instanceof Error
            ? error.message
            : "Semantic search unavailable",
      };
    }
  }
  async indexVectors(onProgress?: (done: number, total: number) => void) {
    await this.embeddings.load();
    const model = this.embeddings.identity();
    const rows = this.ledger.db
      .prepare("SELECT id,title,body FROM search LIMIT 10000")
      .all();
    let indexed = 0;
    for (const row of rows) {
      const revision = digest([row.title, row.body]);
      const old = this.ledger.db
        .prepare("SELECT revision,model FROM vectors WHERE id=?")
        .get(String(row.id));
      if (old?.revision === revision && old.model === model) continue;
      const text = `${row.title}\n${JSON.parse(String(row.body)).text}`;
      const vector = new Float32Array(await this.embeddings.embed(text));
      this.ledger.db
        .prepare(
          "INSERT INTO vectors VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,model=excluded.model,vector=excluded.vector",
        )
        .run(String(row.id), revision, model, Buffer.from(vector.buffer));
      indexed++;
      onProgress?.(indexed, rows.length);
      await new Promise((resolve) => setImmediate(resolve));
    }
    this.ledger.db
      .prepare("DELETE FROM vectors WHERE id NOT IN (SELECT id FROM search)")
      .run();
    const total = Number(
      this.ledger.db.prepare("SELECT count(*) AS n FROM search").get()!.n,
    );
    return { indexed, model, capacity: 10000, total, partial: total > 10000 };
  }
  private relatedRecord(id: string): RelationshipRecord {
    if (id.startsWith("source:")) {
      const ref = id.slice(7);
      const split = ref.lastIndexOf("#");
      const path = split < 0 ? ref : ref.slice(0, split);
      const symbol = split < 0 ? undefined : ref.slice(split + 1);
      return {
        id,
        kind: "source",
        title: symbol ? `${symbol} in ${path}` : path,
        description: symbol
          ? `Workspace source symbol ${symbol}.`
          : "Workspace source file.",
        sources: [{ path, symbol }],
      };
    }
    try {
      const entity = this.ledger.get(id);
      const data = entity.data;
      const text = [
        data.description ??
          data.observation ??
          data.summary ??
          data.choice ??
          data.detail,
        entity.kind === "decision" ? data.rationale : undefined,
      ]
        .filter((v) => typeof v === "string")
        .join(" ");
      const sources: SourceRef[] = [
        ...(Array.isArray(data.sources) ? data.sources : []),
        ...(Array.isArray(data.paths)
          ? data.paths
              .filter((p) => typeof p === "string")
              .map((path) => ({ path }))
          : []),
      ];
      return {
        id,
        kind: entity.kind,
        title: entity.title,
        description: text.length > 600 ? text.slice(0, 597) + "..." : text,
        state: entity.state,
        revision: entity.revision,
        sources: sources
          .filter(
            (s, i) =>
              sources.findIndex(
                (other) =>
                  other.path === s.path &&
                  other.symbol === s.symbol &&
                  other.line === s.line,
              ) === i,
          )
          .slice(0, 10),
      };
    } catch (error) {
      if (!(error instanceof RelayError) || error.code !== "NOT_FOUND")
        throw error;
      return {
        id,
        kind: "record",
        title: id,
        description: "This linked record is no longer available.",
        sources: [],
      };
    }
  }
  impact(
    id: string,
    direction: string,
    depth: number,
    limit: number,
  ): RelationshipGraph {
    this.ledger.get(id);
    const seen = new Set([id]);
    const queue = [{ id, depth: 0 }];
    const nodes: { id: string; depth: number }[] = [];
    const edges: RelationshipGraph["edges"] = [];
    const seenEdges = new Set<string>();
    let partial = false;
    while (queue.length) {
      const current = queue.shift()!;
      const rows = this.ledger.db
        .prepare(
          `SELECT * FROM edges WHERE ${direction === "forward" ? "source=?" : direction === "reverse" ? "target=?" : "(source=? OR target=?)"} ORDER BY id LIMIT 1001`,
        )
        .all(
          ...(direction === "both" ? [current.id, current.id] : [current.id]),
        );
      if (rows.length > 1000) partial = true;
      for (const row of rows) {
        const next = String(
          row.source === current.id ? row.target : row.source,
        );
        if (!seen.has(next)) {
          if (current.depth >= depth || nodes.length >= limit) {
            partial = true;
            continue;
          }
          seen.add(next);
          nodes.push({ id: next, depth: current.depth + 1 });
          queue.push({ id: next, depth: current.depth + 1 });
        }
        if (seenEdges.has(String(row.id))) continue;
        if (edges.length >= limit * 4) {
          partial = true;
          continue;
        }
        seenEdges.add(String(row.id));
        edges.push({
          id: String(row.id),
          source: String(row.source),
          target: String(row.target),
          kind: String(row.kind),
          rationale: String(row.rationale),
        });
      }
    }
    return {
      origin: id,
      subject: this.relatedRecord(id),
      nodes: nodes.map((n) => ({
        ...this.relatedRecord(n.id),
        depth: n.depth,
      })),
      edges,
      direction,
      partial,
      limit,
      depth,
    };
  }
}
