import { DatabaseSync } from "node:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, toNamespacedPath } from "node:path";
import {
  ContextoryError,
  type Actor,
  type Audit,
  type Entity,
  type Kind,
} from "../contracts/model";
export function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export class Ledger {
  readonly db: DatabaseSync;
  readonly projectId: string;
  onChange: () => void = () => {};
  constructor(
    path: string,
    readonly root: string,
  ) {
    mkdirSync(dirname(path), { recursive: true });
    // Editor global-storage paths plus per-reference cache directories can
    // exceed MAX_PATH. SQLite needs the explicit Windows extended path form.
    this.db = new DatabaseSync(toNamespacedPath(path));
    const schema = Number(
      this.db.prepare("PRAGMA user_version").get()!.user_version,
    );
    if (schema > 4) {
      this.db.close();
      throw new ContextoryError(
        "SCHEMA_TOO_NEW",
        "This ledger was created by a newer Contextory version.",
      );
    }
    this.db
      .exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
      CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,kind TEXT NOT NULL,parent_id TEXT REFERENCES entities(id),title TEXT NOT NULL,revision INTEGER NOT NULL,state TEXT NOT NULL,data TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS entities_parent ON entities(parent_id,kind);
      CREATE TABLE IF NOT EXISTS revisions(entity_id TEXT NOT NULL REFERENCES entities(id),revision INTEGER NOT NULL,record TEXT NOT NULL,PRIMARY KEY(entity_id,revision));
      CREATE TABLE IF NOT EXISTS audit(sequence INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,entity_id TEXT NOT NULL,actor TEXT NOT NULL,time TEXT NOT NULL,data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS audit_entity ON audit(entity_id,sequence);
      CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,signature TEXT NOT NULL,result TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS edges(id TEXT PRIMARY KEY,source TEXT NOT NULL,target TEXT NOT NULL,kind TEXT NOT NULL,rationale TEXT NOT NULL,created_at TEXT NOT NULL,UNIQUE(source,target,kind));
      CREATE INDEX IF NOT EXISTS edge_reverse ON edges(target,kind);
      CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(id UNINDEXED,title,body,tokenize='unicode61');
      CREATE TABLE IF NOT EXISTS vectors(id TEXT PRIMARY KEY,revision TEXT NOT NULL,model TEXT NOT NULL,vector BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS hooks(id TEXT PRIMARY KEY,provider TEXT NOT NULL,native_session TEXT NOT NULL,event TEXT NOT NULL,time TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS agent_usage(id TEXT PRIMARY KEY,provider TEXT NOT NULL,native_session TEXT NOT NULL,event TEXT NOT NULL,model TEXT,turn_id TEXT,agent_id TEXT,status TEXT,spec_id TEXT REFERENCES entities(id),time TEXT NOT NULL,tokens TEXT);
      CREATE INDEX IF NOT EXISTS agent_usage_spec ON agent_usage(spec_id,provider,model);
      CREATE INDEX IF NOT EXISTS agent_usage_session ON agent_usage(provider,native_session,agent_id);
      CREATE INDEX IF NOT EXISTS agent_usage_time ON agent_usage(time);
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,state TEXT NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS code_files(path TEXT PRIMARY KEY,hash TEXT NOT NULL,language TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS code_nodes(id TEXT PRIMARY KEY,path TEXT NOT NULL,label TEXT NOT NULL,qualified_name TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS code_node_path ON code_nodes(path);
      CREATE INDEX IF NOT EXISTS code_node_label ON code_nodes(label COLLATE NOCASE);
      CREATE TABLE IF NOT EXISTS code_edges(id TEXT PRIMARY KEY,source TEXT NOT NULL,target TEXT NOT NULL,kind TEXT NOT NULL,data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS code_edge_source ON code_edges(source,kind);
      CREATE INDEX IF NOT EXISTS code_edge_target ON code_edges(target,kind);
      CREATE TABLE IF NOT EXISTS code_imports(id TEXT PRIMARY KEY,data TEXT NOT NULL);
      PRAGMA user_version=4;`);
    if (schema === 1)
      for (const entity of this.list(undefined, 100000)) {
        this.remember(entity);
        this.index(entity.id, entity.title, entity.data);
      }
    const storedRoot = this.meta("root");
    if (storedRoot && storedRoot !== root) {
      this.db.close();
      throw new ContextoryError(
        "WRONG_WORKSPACE",
        "This ledger belongs to a different workspace.",
      );
    }
    this.projectId = this.meta("projectId") ?? randomUUID();
    this.db
      .prepare("INSERT OR IGNORE INTO meta VALUES (?,?)")
      .run("root", root);
    this.db
      .prepare("INSERT OR IGNORE INTO meta VALUES (?,?)")
      .run("projectId", this.projectId);
    this.db
      .prepare("UPDATE jobs SET state='interrupted' WHERE state='running'")
      .run();
  }
  meta(key: string): string | undefined {
    return (
      this.db.prepare("SELECT value FROM meta WHERE key=?").get(key) as
        | { value: string }
        | undefined
    )?.value;
  }
  transaction<T>(
    operationId: string,
    actor: Actor,
    method: string,
    args: unknown,
    operation: () => T,
  ): T {
    const signature = digest({ actor: actor.id, method, args });
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const old = this.db
        .prepare("SELECT signature,result FROM operations WHERE id=?")
        .get(operationId) as { signature: string; result: string } | undefined;
      if (old) {
        if (old.signature !== signature)
          throw new ContextoryError(
            "OPERATION_CONFLICT",
            "operationId was already used with different input or actor.",
          );
        this.db.exec("ROLLBACK");
        return JSON.parse(old.result) as T;
      }
      const result = operation();
      this.db
        .prepare("INSERT INTO operations VALUES (?,?,?)")
        .run(operationId, signature, JSON.stringify(result));
      this.db.exec("COMMIT");
      this.onChange();
      return JSON.parse(JSON.stringify(result)) as T;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }
  private decode(row: Record<string, unknown>): Entity {
    return {
      id: String(row.id),
      kind: row.kind as Kind,
      parentId: row.parent_id ? String(row.parent_id) : undefined,
      title: String(row.title),
      revision: Number(row.revision),
      state: String(row.state),
      data: JSON.parse(String(row.data)),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
  get(id: string, revision?: number): Entity {
    if (revision !== undefined) {
      const row = this.db
        .prepare(
          "SELECT record FROM revisions WHERE entity_id=? AND revision=?",
        )
        .get(id, revision);
      if (!row)
        throw new ContextoryError(
          "NOT_FOUND",
          `Revision ${revision} of ${id} was not found.`,
        );
      return JSON.parse(String(row.record));
    }
    const row = this.db.prepare("SELECT * FROM entities WHERE id=?").get(id);
    if (!row)
      throw new ContextoryError("NOT_FOUND", `Record ${id} was not found.`);
    return this.decode(row);
  }
  list(parentId?: string, limit = 1000, offset = 0): Entity[] {
    const rows = parentId
      ? this.db
          .prepare(
            "SELECT * FROM entities WHERE parent_id=? ORDER BY created_at,id LIMIT ? OFFSET ?",
          )
          .all(parentId, limit, offset)
      : this.db
          .prepare(
            "SELECT * FROM entities ORDER BY created_at,id LIMIT ? OFFSET ?",
          )
          .all(limit, offset);
    return rows.map((row) => this.decode(row));
  }
  all(kind?: Kind): Entity[] {
    const rows = kind
      ? this.db
          .prepare("SELECT * FROM entities WHERE kind=? ORDER BY created_at,id")
          .all(kind)
      : this.db.prepare("SELECT * FROM entities ORDER BY created_at,id").all();
    return rows.map((row) => this.decode(row));
  }
  create(
    kind: Kind,
    title: string,
    data: Record<string, unknown>,
    parentId?: string,
    state = "active",
  ): Entity {
    const prefix: Record<Kind, string> = {
      request: "REQ",
      milestone: "MS",
      spec: "SPEC",
      session: "SES",
      finding: "ISS",
      decision: "DEC",
      evidence: "EV",
      knowledge: "KN",
      knowledge_change: "KCH",
      migration: "MIG",
      release: "REL",
      outcome: "OUT",
    };
    const id = `${prefix[kind]}-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    this.db
      .prepare("INSERT INTO entities VALUES (?,?,?,?,1,?,?,?,?)")
      .run(
        id,
        kind,
        parentId ?? null,
        title,
        state,
        JSON.stringify(data),
        now,
        now,
      );
    this.index(id, title, data);
    if (parentId) this.edge(parentId, id, "contains", "Project hierarchy");
    const entity = this.get(id);
    this.remember(entity);
    return entity;
  }
  update(
    entity: Entity,
    expectedRevision: number | undefined,
    patch: Partial<Pick<Entity, "title" | "state" | "data">>,
  ): Entity {
    if (expectedRevision !== entity.revision)
      throw new ContextoryError(
        "REVISION_CONFLICT",
        `Read ${entity.id} again and use expectedRevision ${entity.revision}.`,
      );
    const next = { ...entity, ...patch };
    this.db
      .prepare(
        "UPDATE entities SET title=?,state=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND revision=?",
      )
      .run(
        next.title,
        next.state,
        JSON.stringify(next.data),
        new Date().toISOString(),
        entity.id,
        entity.revision,
      );
    this.index(entity.id, next.title, next.data);
    const updated = this.get(entity.id);
    this.remember(updated);
    return updated;
  }
  private remember(entity: Entity) {
    this.db
      .prepare("INSERT OR IGNORE INTO revisions VALUES (?,?,?)")
      .run(entity.id, entity.revision, JSON.stringify(entity));
  }
  audit(
    type: string,
    entityId: string,
    actor: Actor,
    data: Record<string, unknown> = {},
  ) {
    this.db
      .prepare(
        "INSERT INTO audit(type,entity_id,actor,time,data) VALUES (?,?,?,?,?)",
      )
      .run(
        type,
        entityId,
        actor.id,
        new Date().toISOString(),
        JSON.stringify(data),
      );
  }
  events(
    limit = 60,
    before = Number.MAX_SAFE_INTEGER,
    entityId?: string,
  ): Audit[] {
    const rows = entityId
      ? this.db
          .prepare(
            `WITH RECURSIVE scope(id) AS (
        SELECT id FROM entities WHERE id=?
        UNION ALL SELECT e.id FROM entities e JOIN scope s ON e.parent_id=s.id
      ) SELECT * FROM audit WHERE sequence<? AND entity_id IN (SELECT id FROM scope) ORDER BY sequence DESC LIMIT ?`,
          )
          .all(entityId, before, limit)
      : this.db
          .prepare(
            "SELECT * FROM audit WHERE sequence<? ORDER BY sequence DESC LIMIT ?",
          )
          .all(before, limit);
    return rows.map((row) => ({
      sequence: Number(row.sequence),
      type: String(row.type),
      entityId: String(row.entity_id),
      actor: String(row.actor),
      time: String(row.time),
      data: JSON.parse(String(row.data)),
    }));
  }
  sequence(): number {
    return Number(
      this.db.prepare("SELECT coalesce(max(sequence),0) AS n FROM audit").get()!
        .n,
    );
  }
  index(id: string, title: string, data: unknown): string[] {
    const fields = data as Record<string, unknown>;
    const prefix = `${id}#`;
    this.db
      .prepare("DELETE FROM search WHERE id=? OR substr(id,1,?)=?")
      .run(id, prefix.length, prefix);
    const text =
      typeof fields.text === "string"
        ? fields.text
        : Object.entries(fields)
            .filter(
              ([key]) =>
                ![
                  "lease",
                  "contract",
                  "generation",
                  "snapshot",
                  "afterSnapshot",
                  "operationId",
                ].includes(key),
            )
            .map(
              ([key, value]) =>
                `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`,
            )
            .join("\n");
    const ids: string[] = [];
    for (let offset = 0; offset < Math.max(1, text.length); offset += 900) {
      const key = offset ? `${id}#${offset / 900}` : id;
      ids.push(key);
      this.db.prepare("INSERT INTO search VALUES (?,?,?)").run(
        key,
        title,
        JSON.stringify({
          text: text.slice(offset, offset + 900),
          entityId: id.startsWith("source:") ? undefined : id,
          source: fields.source,
          hash: fields.hash,
          fileHash: fields.fileHash,
          segment: offset / 900,
        }),
      );
    }
    return ids;
  }
  edge(from: string, to: string, kind: string, rationale: string) {
    const id = digest([from, to, kind]).slice(0, 24);
    this.db
      .prepare(
        "INSERT INTO edges VALUES (?,?,?,?,?,?) ON CONFLICT(source,target,kind) DO UPDATE SET rationale=excluded.rationale",
      )
      .run(id, from, to, kind, rationale, new Date().toISOString());
    return id;
  }
  close() {
    this.db.close();
  }
}
