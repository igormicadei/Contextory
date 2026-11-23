import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import type { Entity, SourceRef } from "../contracts/model";
import { ContextoryError } from "../contracts/model";
import type { Input } from "../contracts/tools";
import type { Ledger } from "../storage/ledger";
import { workspacePath } from "../verification/workspace";

type Localized = string | Record<string, string>;
interface Section {
  id: string;
  title: Localized;
  blocks: unknown[];
  sources?: SourceRef[];
}
interface Page {
  id: string;
  title: Localized;
  sources: SourceRef[];
  sections: Section[];
}
interface Corpus {
  schemaVersion: number;
  name: string;
  draft?: boolean;
  pages: Page[];
}
export interface DocumentationLink {
  pageId: string;
  sectionId: string;
  corpusFingerprint: string;
  sectionFingerprint: string;
  recordIds: string[];
  recordRevisions?: Record<string, number>;
  recordFingerprints?: Record<string, string>;
  sourceState: Record<string, string>;
  reason: string;
  actor: string;
  time: string;
}
export interface DocumentationSection {
  id: string;
  pageId: string;
  sectionId: string;
  pageTitle: string;
  title: string;
  text: string;
  sources: SourceRef[];
  records: {
    id: string;
    title: string;
    kind: string;
    state: string;
    revision: number;
    linkedRevision?: number;
  }[];
  freshness: { state: "current" | "stale" | "unknown"; changed: string[] };
  association?: { reason: string; time: string; actor: string };
  provenance: string;
  truncated: boolean;
}
const hash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
export const localized = (
  value: Localized | undefined,
  locale: string,
): string => {
  const result =
    typeof value === "string" ? value : (value?.[locale] ?? value?.en);
  return typeof result === "string" ? result : "";
};
const pythonJson = (value: unknown): string => {
  if (Array.isArray(value)) return "[" + value.map(pythonJson).join(", ") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map(
          (k) =>
            JSON.stringify(k) +
            ": " +
            pythonJson((value as Record<string, unknown>)[k]),
        )
        .join(", ") +
      "}"
    );
  return JSON.stringify(value);
};
export const recordFingerprint = (record: Entity) =>
  hash(
    pythonJson({
      kind: record.kind,
      title: record.title,
      state: record.state,
      data: Object.fromEntries(
        Object.entries(record.data).filter(([key]) => key !== "lease"),
      ),
    }),
  );
export function blockText(value: unknown, locale: string): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value
      .map((v) => blockText(v, locale))
      .filter(Boolean)
      .join("\n");
  if (!value || typeof value !== "object") return "";
  const item = value as Record<string, unknown>;
  if (typeof item.en === "string" || typeof item["pt-BR"] === "string")
    return localized(item as Record<string, string>, locale);
  return ["text", "caption", "alt", "code", "items", "headers", "rows"]
    .map((k) => blockText(item[k], locale))
    .filter(Boolean)
    .join("\n");
}
/** PT-BR: Leia explicações locais sem Python e mantenha sua autoridade e atualização explícitas.
 * EN: Read local explanations without Python while preserving authority and freshness. */
export class DocumentationReader {
  constructor(readonly ledger: Ledger) {}
  async json(path: string, max = 8 * 1024 * 1024) {
    const safe = await workspacePath(this.ledger.root, path);
    if ((await stat(safe)).size > max)
      throw new ContextoryError(
        "DOCS_LIMIT",
        "Documentation file exceeds the read limit.",
      );
    return JSON.parse(await readFile(safe, "utf8"));
  }
  async corpus() {
    let value: Corpus;
    try {
      value = await this.json(".documentation/project.json");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new ContextoryError(
        "DOCS_INVALID",
        "Cannot read project documentation: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
    if (![1, 2].includes(value.schemaVersion))
      throw new ContextoryError(
        "DOCS_SCHEMA",
        "Unsupported documentation schema; preserve it and update Contextory.",
      );
    if (!Array.isArray(value.pages) || value.pages.length > 500)
      throw new ContextoryError(
        "DOCS_INVALID",
        "Documentation pages must be an array of at most 500 pages.",
      );
    let count = 0;
    for (const page of value.pages) {
      if (
        !page ||
        typeof page.id !== "string" ||
        !Array.isArray(page.sections) ||
        !Array.isArray(page.sources ?? [])
      )
        throw new ContextoryError(
          "DOCS_INVALID",
          "Invalid documentation page.",
        );
      page.sources ??= [];
      for (const section of page.sections) {
        if (
          !section ||
          typeof section.id !== "string" ||
          !Array.isArray(section.blocks) ||
          ++count > 5000
        )
          throw new ContextoryError(
            "DOCS_INVALID",
            "Invalid or oversized documentation sections.",
          );
      }
    }
    return { value, fingerprint: hash(pythonJson(value)) };
  }
  links(): Record<string, DocumentationLink> {
    return JSON.parse(this.ledger.meta("docs.links") ?? "{}");
  }
  async sourceHash(path: string) {
    const safe = await workspacePath(this.ledger.root, path);
    if ((await stat(safe)).size > 16 * 1024 * 1024)
      throw new ContextoryError(
        "DOCS_LIMIT",
        "Source exceeds documentation hash limit.",
      );
    if (/(^|\/)readme\.md$/i.test(path)) {
      const payload = Buffer.from(
        (await readFile(safe, "utf8"))
          .replace(
            /\s*<!-- software-documentation:start -->[\s\S]*?<!-- software-documentation:end -->\s*/g,
            "",
          )
          .trimEnd(),
      );
      return hash(payload);
    }
    const fingerprint = createHash("sha256");
    let bytes = 0;
    for await (const chunk of createReadStream(safe)) {
      bytes += chunk.length;
      if (bytes > 16 * 1024 * 1024)
        throw new ContextoryError(
          "DOCS_LIMIT",
          "Source grew beyond the documentation hash limit.",
        );
      fingerprint.update(chunk);
    }
    return fingerprint.digest("hex");
  }
  sources(page: Page, section: Section) {
    return [
      ...page.sources,
      ...(Array.isArray(section.sources) ? section.sources : []),
    ]
      .filter((s) => s && typeof s.path === "string")
      .filter(
        (s, i, a) =>
          a.findIndex((x) => x.path === s.path && x.symbol === s.symbol) === i,
      )
      .slice(0, 100)
      .map((s) => ({
        ...s,
        line: typeof s.line === "number" ? Math.max(0, s.line - 1) : undefined,
      }));
  }
  /** PT-BR: Filtre antes de paginar; valide os hashes somente da página retornada.
   * EN: Filter before paging and verify hashes for the returned page only. */
  async get(p: Input<"contextory_docs_get">) {
    const corpus = await this.corpus();
    if (!corpus)
      return {
        state: "missing",
        sections: [] as DocumentationSection[],
        total: 0,
        nextOffset: null,
        note: "No project documentation yet. Use the bundled contextory-documentation skill to map and author it.",
      };
    const links = this.links();
    const relatedIds = new Set<string>();
    if (p.recordId) {
      this.ledger.get(p.recordId);
      relatedIds.add(p.recordId);
      const records = this.ledger.all();
      let changed = true;
      while (changed) {
        changed = false;
        for (const record of records)
          if (
            record.parentId &&
            relatedIds.has(record.parentId) &&
            !relatedIds.has(record.id)
          ) {
            relatedIds.add(record.id);
            changed = true;
          }
      }
    }
    let baseline: Record<string, string> = {};
    try {
      const manifest = await this.json(".documentation/site/manifest.json");
      if (manifest.configHash === corpus.fingerprint)
        baseline = manifest.sourceState ?? {};
    } catch {
      /* An absent/unverified build never proves source freshness. */
    }
    const paths = new Map<string, Promise<string>>();
    const unverified = new Set<string>();
    const currentHash = (path: string) => {
      if (!paths.has(path) && paths.size >= 200) {
        unverified.add(path);
        return Promise.resolve("");
      }
      if (!paths.has(path))
        paths.set(
          path,
          this.sourceHash(path).catch(() => ""),
        );
      return paths.get(path)!;
    };
    const tokens = p.query
      .toLowerCase()
      .split(/[^\p{L}\p{N}_]+/u)
      .filter(Boolean);
    const matches: {
      page: Page;
      section: Section;
      text: string;
      score: number;
      sources: SourceRef[];
      link?: DocumentationLink;
    }[] = [];
    for (const page of corpus.value.pages)
      for (const section of page.sections) {
        const sources = this.sources(page, section),
          link = links[`${page.id}#${section.id}`];
        if (
          (p.pageId && p.pageId !== page.id) ||
          (p.sectionId && p.sectionId !== section.id)
        )
          continue;
        if (
          p.path &&
          !sources.some(
            (s) =>
              s.path === p.path ||
              s.path.startsWith(p.path!.replace(/\/$/, "") + "/"),
          )
        )
          continue;
        if (p.recordId && !link?.recordIds.some((id) => relatedIds.has(id)))
          continue;
        const text = blockText(section.blocks, p.locale);
        const search = [
          localized(page.title, p.locale),
          localized(section.title, p.locale),
          text,
          ...sources.map((s) => s.path),
        ]
          .join(" ")
          .toLowerCase();
        const score = tokens.filter((t) => search.includes(t)).length;
        if (tokens.length && !score) continue;
        matches.push({ page, section, sources, link, text, score });
      }
    matches.sort((a, b) => b.score - a.score);
    const selected = matches.slice(p.offset, p.offset + p.limit);
    const sections: DocumentationSection[] = await Promise.all(
      selected.map(async ({ page, section, sources, link, text }) => {
        const expected = link?.sourceState ?? baseline;
        const changed: string[] = [];
        let known = sources.length > 0;
        for (const s of sources) {
          const current = await currentHash(s.path);
          if (unverified.has(s.path)) {
            known = false;
            continue;
          }
          if (!current || (expected[s.path] && current !== expected[s.path]))
            changed.push(s.path);
          if (!expected[s.path]) known = false;
        }
        if (
          link &&
          link.sectionFingerprint !==
            hash(pythonJson({ pageTitle: page.title, sources, section }))
        )
          changed.push(
            "Documentation text or citations changed since association",
          );
        for (const [id, fingerprint] of Object.entries(
          link?.recordFingerprints ?? {},
        )) {
          try {
            if (recordFingerprint(this.ledger.get(id)) !== fingerprint)
              changed.push(`${id} changed since association`);
          } catch {
            changed.push(`${id} is no longer available`);
          }
        }
        return {
          id: `docs:${page.id}#${section.id}`,
          pageId: page.id,
          sectionId: section.id,
          pageTitle: localized(page.title, p.locale),
          title: localized(section.title, p.locale),
          text: text.slice(0, 12000),
          truncated:
            text.length > 12000 ||
            page.sources.length +
              (Array.isArray(section.sources) ? section.sources.length : 0) >
              100,
          sources,
          records: (link?.recordIds ?? []).flatMap((id) => {
            try {
              const r = this.ledger.get(id);
              return [
                {
                  id: r.id,
                  title: r.title,
                  kind: r.kind,
                  state: r.state,
                  revision: r.revision,
                  linkedRevision: link?.recordRevisions?.[id],
                },
              ];
            } catch {
              return [];
            }
          }),
          freshness: {
            state: changed.length ? "stale" : known ? "current" : "unknown",
            changed,
          },
          association: link
            ? { reason: link.reason, time: link.time, actor: link.actor }
            : undefined,
          provenance: corpus.value.draft
            ? "Authored draft; requires review, not an approved requirement."
            : "Authored documentation; source freshness and record approval are separate.",
        };
      }),
    );
    return {
      state: corpus.value.draft ? "draft" : "available",
      name: corpus.value.name,
      schemaVersion: corpus.value.schemaVersion,
      corpusFingerprint: corpus.fingerprint,
      source: ".documentation/project.json",
      pages: corpus.value.pages.length,
      total: matches.length,
      sections,
      nextOffset:
        p.offset + p.limit < matches.length ? p.offset + p.limit : null,
      note: "Freshness checks the returned page, with at most 100 citations per section and 200 distinct files per page. Narrow filters if the baseline is unknown. Page all sections for coverage; counts and successful builds do not establish behavioral completeness. Associations are observed, not human approval.",
    };
  }
  /** PT-BR: Capture texto/citações atuais para uma associação observada após revisão.
   * EN: Capture current text/citations for an observed association after review. */
  async capture(pageId: string, sectionId: string) {
    const corpus = await this.corpus();
    const page = corpus?.value.pages.find((p) => p.id === pageId),
      section = page?.sections.find((s) => s.id === sectionId);
    if (!corpus || !page || !section)
      throw new ContextoryError(
        "DOCS_NOT_FOUND",
        "Read an existing documentation page/section before linking it.",
      );
    const sources = this.sources(page, section),
      sourceState: Record<string, string> = {};
    for (const s of sources)
      sourceState[s.path] = await this.sourceHash(s.path);
    return {
      corpusFingerprint: corpus.fingerprint,
      sectionFingerprint: hash(
        pythonJson({ pageTitle: page.title, sources, section }),
      ),
      sourceState,
    };
  }
}
