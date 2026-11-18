import { writeFile, open, readFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { ContextoryError, type Actor, type Entity } from "../contracts/model";
import type { Input } from "../contracts/tools";
import { Ledger, digest } from "../storage/ledger";
import { ReleaseGit, type GitCommit, redactGit } from "./git";
import {
  releaseConfig,
  releasePath,
  fileText,
  readVersion,
  replaceVersion,
  compare,
  bumpVersion,
  stableVersion,
  parts,
  type ReleaseConfig,
  type PlannedFile,
} from "./config";

const observer: Actor = { id: "git-observer", human: false };
type Bump = "patch" | "minor" | "major";
interface SemanticChange {
  id: string;
  revision: number;
  kind: string;
  title: string;
  state: string;
  relation: "recorded-in-interval";
}
interface ReleaseData extends Record<string, unknown> {
  version: string;
  tag: string;
  head: string;
  base?: string;
  branch?: string;
  commits: GitCommit[];
  semantic: SemanticChange[];
  cutoff: number;
  config?: string;
  remote?: string;
  remoteIdentity?: string;
  files?: PlannedFile[];
  tagObject?: string;
  releaseCommit?: string;
  error?: string;
}
export interface VersionStatus {
  available: boolean;
  reason?: string;
  currentVersion?: string;
  latestTag?: string;
  branch?: string;
  head?: string;
  dirty?: boolean;
  shallow?: boolean;
  recommendedBump?: Bump;
  unreleasedCount?: number;
  gaps: string[];
  releases: {
    id: string;
    revision: number;
    state: string;
    version: string;
    tag: string;
    commitCount: number;
    semanticCount: number;
    head: string;
    remote?: string;
    error?: string;
    files: string[];
  }[];
}
function recommendation(commits: GitCommit[]): Bump {
  if (
    commits.some(
      (c) =>
        c.breaking ||
        /^[\w-]+(?:\([^\n]+\))?!:/.test(c.subject) ||
        /^BREAKING[ -]CHANGE:/m.test(c.body),
    )
  )
    return "major";
  return commits.some((c) => /^feat(?:\([^\n]+\))?:/.test(c.subject))
    ? "minor"
    : "patch";
}
function data(e: Entity) {
  return e.data as ReleaseData;
}
function fail(code: string, message: string): never {
  throw new ContextoryError(code, message);
}
const page = <T>(items: T[], offset: number, limit: number) => ({
  items: items.slice(offset, offset + limit),
  total: items.length,
  offset,
  nextOffset: offset + limit < items.length ? offset + limit : null,
});

/** One serialized controller per service. Git mutations also take a repository lock. */
export class ReleaseManager {
  readonly git: ReleaseGit;
  private queue: Promise<unknown> = Promise.resolve();
  private unreleased: GitCommit[] = [];
  private cached: VersionStatus;
  constructor(readonly ledger: Ledger) {
    this.git = new ReleaseGit(ledger.root);
    this.cached = JSON.parse(
      ledger.meta("release.status") ??
        '{"available":false,"reason":"Git observation pending","gaps":[],"releases":[]}',
    );
  }
  status() {
    return this.cached;
  }
  private serial<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.queue.then(fn);
    this.queue = next.catch(() => {});
    return next;
  }
  async close() {
    await this.queue;
  }
  observe() {
    return this.serial(() => this.sync());
  }
  private rows() {
    return this.ledger.all("release");
  }
  private summaries() {
    return this.rows()
      .reverse()
      .map((e) => ({
        id: e.id,
        revision: e.revision,
        state: e.state,
        version: data(e).version,
        tag: data(e).tag,
        head: data(e).releaseCommit ?? data(e).head,
        commitCount: data(e).commits.length,
        semanticCount: data(e).semantic.length,
        remote: data(e).remote,
        error: data(e).error,
        files: (data(e).files ?? []).map((f) => f.path),
      }));
  }
  private saveStatus(status: VersionStatus) {
    const value = JSON.stringify(status);
    this.cached = status;
    if (value !== this.ledger.meta("release.status")) {
      this.ledger.db
        .prepare(
          "INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        )
        .run("release.status", value);
      this.ledger.onChange();
    }
    return status;
  }
  private async sync() {
    try {
      await this.git.assertRoot();
      const config = await releaseConfig(this.ledger.root);
      const head = await this.git.head();
      const branch = await this.git.branch().catch(() => undefined);
      const dirty = Boolean(await this.git.dirty());
      const shallow =
        (await this.git.run(["rev-parse", "--is-shallow-repository"])) ===
        "true";
      const raw = await this.git.run([
        "for-each-ref",
        "--count=1001",
        "--format=%(refname:strip=2)%09%(objectname)",
        "refs/tags/",
      ]);
      const tagLines = raw ? raw.split("\n") : [];
      if (tagLines.length > 1000)
        fail(
          "RELEASE_LIMIT",
          "More than 1000 Git tags; narrow the repository before managing releases.",
        );
      const tags: {
        tag: string;
        version: string;
        object: string;
        head: string;
      }[] = [];
      for (const line of tagLines) {
        const [tag, object] = line.split("\t");
        if (!tag.startsWith(config.tagPrefix)) continue;
        const version = tag.slice(config.tagPrefix.length);
        if (!stableVersion.test(version)) continue;
        parts(version);
        const commit = await this.git
          .run(["rev-parse", "--verify", `refs/tags/${tag}^{commit}`])
          .catch(() => undefined);
        if (commit) tags.push({ tag, version, object, head: commit });
      }
      tags.sort((a, b) => compare(a.version, b.version));
      const gaps: string[] = [];
      if (shallow)
        gaps.push(
          "Shallow Git history: commit membership may be incomplete. Fetch full history before preparing a release.",
        );
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        const known = this.rows().find(
          (e) => data(e).tag === tag.tag && e.state !== "cancelled",
        );
        if (known) {
          const drift =
            data(known).tagObject &&
            (data(known).tagObject !== tag.object ||
              (data(known).releaseCommit ?? data(known).head) !== tag.head);
          if (
            data(known).tagObject &&
            (data(known).tagObject !== tag.object ||
              (data(known).releaseCommit ?? data(known).head) !== tag.head)
          )
            gaps.push(
              `Tag ${tag.tag} moved; retained historical membership was not overwritten.`,
            );
          if (!drift && !shallow && data(known).membershipComplete === false) {
            let base: string | undefined;
            for (const previous of tags.slice(0, i).reverse())
              if (await this.git.ancestor(previous.head, tag.head)) {
                base = previous.head;
                break;
              }
            const commits = await this.git.commits(tag.head, base);
            this.ledger.transaction(
              `git-complete:${known.id}:${tag.object}`,
              observer,
              "release.reconcile",
              { tag },
              () => {
                const next = this.ledger.update(known, known.revision, {
                  data: {
                    ...known.data,
                    base,
                    commits,
                    membershipComplete: true,
                  },
                });
                this.ledger.audit("release.reconciled", known.id, observer, {
                  tag: tag.tag,
                  head: tag.head,
                });
                return next;
              },
            );
          }
          continue;
        }
        const previous = tags.slice(0, i).reverse();
        let base: string | undefined;
        for (const item of previous)
          if (await this.git.ancestor(item.head, tag.head)) {
            base = item.head;
            break;
          }
        const commits = await this.git.commits(tag.head, base);
        this.ledger.transaction(
          `git-import:${digest(tag)}`,
          observer,
          "release.observe",
          tag,
          () => {
            const record = this.ledger.create(
              "release",
              `Version ${tag.version}`,
              {
                version: tag.version,
                tag: tag.tag,
                head: tag.head,
                tagObject: tag.object,
                base,
                commits,
                semantic: [],
                cutoff: 0,
                provenance: "existing-local-git-tag",
                membershipComplete: !shallow,
              },
              undefined,
              "observed",
            );
            this.ledger.audit("release.observed", record.id, observer, {
              tag: tag.tag,
              head: tag.head,
            });
            return record;
          },
        );
      }
      for (const e of this.rows().filter((e) => data(e).tagObject)) {
        const tag = tags.find((t) => t.tag === data(e).tag);
        if (!tag)
          gaps.push(
            `Recorded tag ${data(e).tag} is absent from local Git refs; its record is retained.`,
          );
      }
      let latest: (typeof tags)[number] | undefined;
      for (const tag of [...tags].reverse())
        if (await this.git.ancestor(tag.head, head)) {
          latest = tag;
          break;
        }
      const manifest = readVersion(
        config.versionFiles[0],
        await fileText(this.ledger.root, config.versionFiles[0].path),
      );
      const currentVersion =
        manifest ?? latest?.version ?? config.initialVersion;
      parts(currentVersion);
      if (latest && compare(currentVersion, latest.version) < 0)
        gaps.push(
          "Manifest version is behind the latest reachable version tag.",
        );
      this.unreleased = await this.git.commits(head, latest?.head);
      const observed = digest({ head, tags });
      if (observed !== this.ledger.meta("release.git")) {
        this.ledger.transaction(
          `git-snapshot:${randomUUID()}`,
          observer,
          "release.snapshot",
          { observed },
          () => {
            this.ledger.db
              .prepare(
                "INSERT INTO meta VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
              )
              .run("release.git", observed);
            this.ledger.audit(
              "release.git_changed",
              this.ledger.projectId,
              observer,
              {
                head,
                latestTag: latest?.tag,
                unreleased: this.unreleased.length,
              },
            );
            return true;
          },
        );
      }
      return this.saveStatus({
        available: true,
        currentVersion,
        latestTag: latest?.tag,
        branch,
        head,
        dirty,
        shallow,
        recommendedBump: recommendation(this.unreleased),
        unreleasedCount: this.unreleased.length,
        gaps,
        releases: this.summaries(),
      });
    } catch (error) {
      this.unreleased = [];
      return this.saveStatus({
        available: false,
        reason: redactGit((error as Error).message),
        gaps: [],
        releases: this.summaries(),
      });
    }
  }
  get(p: Input<"contextory_version_get">) {
    return this.serial(async () => {
      const status = await this.sync();
      if (p.releaseId) {
        const e = this.ledger.get(p.releaseId);
        if (e.kind !== "release")
          fail("INVALID_RELEASE", "Select a project release record.");
        const d = data(e);
        return {
          release: {
            ...e,
            data: {
              ...d,
              commits: undefined,
              semantic: undefined,
              files: (d.files ?? []).map((f) => ({
                path: f.path,
                beforeHash: digest(f.before),
                afterHash: digest(f.after),
              })),
            },
          },
          commits: page(d.commits, p.offset, p.limit),
          semantic: page(d.semantic, p.offset, p.limit),
          provenance:
            "Commits are Git membership; semantic entries were recorded in the ledger interval and are not proof of shipped inclusion.",
        };
      }
      return {
        ...status,
        releases: page(status.releases, p.offset, p.limit),
        unreleased: page(this.unreleased, p.offset, p.limit),
        recommendationBasis:
          "Conventional Commit feat => minor; ! or BREAKING CHANGE => major; otherwise patch. Heuristic, review required.",
      };
    });
  }
  private async remoteIdentity(remote: string) {
    const urls = await this.git
      .run(["remote", "get-url", "--push", "--all", remote])
      .catch(() => "");
    if (urls.split("\n").length > 1)
      fail(
        "INVALID_REMOTE",
        "Release publication requires a remote with exactly one push URL.",
      );
    return digest(urls);
  }
  prepare(p: Input<"contextory_release_prepare">, actor: Actor) {
    return this.serial(async () => {
      // Validate operation identity even on an exact retry, before any Git effects.
      const old = this.ledger.db
        .prepare("SELECT signature,result FROM operations WHERE id=?")
        .get(p.operationId);
      if (old)
        return this.ledger.transaction(
          p.operationId,
          actor,
          "release.prepare",
          p,
          () => null,
        );
      return this.lock(async () => {
        const status = await this.sync();
        if (!status.available) fail("GIT_UNAVAILABLE", status.reason!);
        if (status.dirty)
          fail(
            "DIRTY_WORKTREE",
            "Commit or stash existing work before preparing a release.",
          );
        if (!status.branch)
          fail(
            "DETACHED_HEAD",
            "Check out the release branch before preparing a release.",
          );
        if (status.shallow || status.gaps.length)
          fail("INCOMPLETE_HISTORY", status.gaps.join(" "));
        const config = await releaseConfig(this.ledger.root);
        if (config.branch && config.branch !== status.branch)
          fail("WRONG_BRANCH", `Release branch must be ${config.branch}.`);
        if (
          this.rows().some((e) =>
            ["prepared", "applying", "failed", "publishing"].includes(e.state),
          )
        )
          fail(
            "RELEASE_PENDING",
            "Finish, recover or cancel the pending release before preparing another.",
          );
        const current = status.currentVersion!;
        const version =
          p.version ??
          bumpVersion(
            current,
            p.bump === "auto" ? status.recommendedBump! : p.bump,
          );
        parts(version);
        if (compare(version, current) <= 0)
          fail(
            "INVALID_VERSION",
            "Next version must be greater than the current version.",
          );
        const tag = config.tagPrefix + version;
        await this.git.run(["check-ref-format", `refs/tags/${tag}`]);
        if (await this.tagObject(tag))
          fail("TAG_EXISTS", `Tag ${tag} already exists.`);
        const previous = this.rows()
          .filter((e) => ["tagged", "published"].includes(e.state))
          .sort((a, b) => data(b).cutoff - data(a).cutoff)[0];
        const cutoff = this.ledger.sequence();
        const events = this.ledger.db
          .prepare(
            "SELECT DISTINCT entity_id FROM audit WHERE sequence>? AND sequence<=? ORDER BY entity_id LIMIT 2001",
          )
          .all(previous ? data(previous).cutoff : 0, cutoff);
        if (events.length > 2000)
          fail(
            "RELEASE_LIMIT",
            "More than 2000 changed ledger records in this interval; export the history before preparing this release.",
          );
        const semantic = events
          .map((row) => {
            try {
              return this.ledger.get(String(row.entity_id));
            } catch {
              return undefined;
            }
          })
          .filter((e): e is Entity =>
            Boolean(
              e &&
                [
                  "decision",
                  "knowledge",
                  "knowledge_change",
                  "finding",
                  "spec",
                  "outcome",
                  "request",
                ].includes(e.kind),
            ),
          )
          .map((e) => ({
            id: e.id,
            revision: e.revision,
            kind: e.kind,
            title: e.title,
            state: e.state,
            relation: "recorded-in-interval" as const,
          }));
        const section = this.changelog(version, this.unreleased, semantic);
        const files: PlannedFile[] = [];
        for (const adapter of config.versionFiles) {
          const before = await fileText(this.ledger.root, adapter.path);
          if (before === null && adapter.path !== "contextory.version.json")
            fail("VERSION_DRIFT", `${adapter.path} is missing.`);
          files.push({
            path: adapter.path,
            before,
            after: replaceVersion(adapter, before, current, version),
          });
        }
        const before = await fileText(this.ledger.root, config.changelogPath);
        files.push({
          path: config.changelogPath,
          before,
          after: before?.startsWith("# ")
            ? before.replace(/^(#[^\r\n]*\r?\n)/, `$1\n${section}\n`)
            : `# Changelog\n\n${section}\n${before ?? ""}`,
        });
        const remoteIdentity = await this.remoteIdentity(config.remote);
        return this.ledger.transaction(
          p.operationId,
          actor,
          "release.prepare",
          p,
          () => {
            const record = this.ledger.create(
              "release",
              `Version ${version}`,
              {
                version,
                tag,
                head: status.head!,
                branch: status.branch,
                base: (() => {
                  const previous = this.rows().find(
                    (e) =>
                      data(e).tag === status.latestTag && data(e).tagObject,
                  );
                  return (
                    previous &&
                    (data(previous).releaseCommit ?? data(previous).head)
                  );
                })(),
                commits: this.unreleased,
                semantic,
                cutoff,
                config: config.fingerprint,
                remote: config.remote,
                remoteIdentity,
                files,
                changelog: section,
                provenance: "contextory-prepared",
              },
              undefined,
              "prepared",
            );
            this.ledger.audit("release.prepared", record.id, actor, {
              version,
              tag,
              head: status.head,
              files: files.map((f) => f.path),
              cutoff,
            });
            return record;
          },
        );
      });
    });
  }
  private changelog(
    version: string,
    commits: GitCommit[],
    semantic: SemanticChange[],
  ) {
    const clean = (text: string) =>
      text.replace(/[\r\n]/g, " ").replace(/[\\`*_<>\[\]#]/g, "\\$&");
    return `## ${version} (${new Date().toISOString().slice(0, 10)})\n\n### Commits\n\n${commits.map((c) => `- ${c.hash}: ${clean(c.subject)}`).join("\n") || "- No source commits since the previous version."}\n\n### Project decisions, features and rules recorded in this interval\n\nThese ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.\n\n${semantic.map((e) => `- ${e.id}@${e.revision} (${e.kind}, ${e.state}): ${clean(e.title)}`).join("\n") || "- No ledger definitions recorded in this interval."}\n`;
  }
  change(p: Input<"contextory_release_change">, actor: Actor) {
    return this.serial(() =>
      this.lock(async () => {
        const method = "release.change";
        const resultKey = `${p.operationId}:result`;
        const finished = this.ledger.db
          .prepare("SELECT id FROM operations WHERE id=?")
          .get(resultKey);
        if (finished)
          return this.ledger.transaction(
            resultKey,
            actor,
            method,
            p,
            () => null,
          );
        const retry = Boolean(
          this.ledger.db
            .prepare("SELECT id FROM operations WHERE id=?")
            .get(p.operationId),
        );
        if (p.action === "cancel") {
          const current = this.ledger.get(p.id),
            d = data(current);
          if (
            !["prepared", "failed"].includes(current.state) ||
            (d.localStarted &&
              ((await this.git.head()) !== d.head ||
                (await this.git.dirty()) ||
                (await this.tagObject(d.tag))))
          )
            fail(
              "INVALID_RELEASE_STATE",
              "Only untouched release plans can be cancelled.",
            );
        }
        let record = this.ledger.transaction(
          p.operationId,
          actor,
          method,
          p,
          () => {
            const current = this.ledger.get(p.id);
            if (current.kind !== "release")
              fail("INVALID_RELEASE", "Select a project release record.");
            if (current.revision !== p.expectedRevision)
              fail(
                "REVISION_CONFLICT",
                `Read ${p.id} again and use expectedRevision ${current.revision}.`,
              );
            const d = data(current);
            if (p.action === "cancel") {
              if (!["prepared", "failed"].includes(current.state))
                fail(
                  "INVALID_RELEASE_STATE",
                  "Only untouched prepared plans can be cancelled.",
                );
              return this.update(current, "cancelled", {}, actor);
            }
            const publishing =
              p.action === "publish" ||
              (p.action === "recover" && current.state === "publishing");
            if (
              publishing &&
              !["tagged", "publishing", "published"].includes(current.state)
            )
              fail(
                "INVALID_RELEASE_STATE",
                "Apply and tag this release before publishing.",
              );
            if (
              !publishing &&
              !(p.action === "apply"
                ? current.state === "prepared"
                : ["applying", "failed"].includes(current.state))
            )
              fail(
                "INVALID_RELEASE_STATE",
                "Use recover for an interrupted release or apply for a prepared plan.",
              );
            if (!d.files)
              fail(
                "INVALID_RELEASE_STATE",
                "Observed external tags cannot be applied or published as Contextory plans.",
              );
            if (publishing && current.state === "published") return current;
            return this.update(
              current,
              publishing ? "publishing" : "applying",
              { error: undefined },
              actor,
            );
          },
        ) as Entity;
        try {
          if (p.action !== "cancel" && record.state !== "published") {
            record =
              record.state === "publishing"
                ? await this.publish(this.ledger.get(record.id), actor)
                : await this.apply(
                    this.ledger.get(record.id),
                    actor,
                    p.action === "apply" && !retry,
                  );
          }
          const final = this.ledger.transaction(
            resultKey,
            actor,
            method,
            p,
            () => record,
          );
          await this.sync();
          return final;
        } catch (error) {
          const current = this.ledger.get(record.id);
          this.ledger.transaction(
            `${p.operationId}:error:${current.revision}`,
            actor,
            "release.error",
            p,
            () =>
              this.update(
                current,
                current.state === "publishing" ? "publishing" : "failed",
                { error: redactGit((error as Error).message) },
                actor,
              ),
          );
          await this.sync();
          throw error;
        }
      }),
    );
  }
  private update(
    e: Entity,
    state: string,
    patch: Partial<ReleaseData>,
    actor: Actor,
  ) {
    const next = this.ledger.update(e, e.revision, {
      state,
      data: { ...e.data, ...patch },
    });
    this.ledger.audit(`release.${state}`, e.id, actor, {
      version: data(next).version,
      tag: data(next).tag,
      error: patch.error,
    });
    return next;
  }
  private tagObject(tag: string) {
    return this.git
      .run(["rev-parse", "--verify", `refs/tags/${tag}`])
      .catch(() => undefined);
  }
  private async validateConfig(d: ReleaseData): Promise<ReleaseConfig> {
    await this.git.assertRoot();
    const config = await releaseConfig(this.ledger.root);
    if (
      config.fingerprint !== d.config ||
      (await this.git.branch()) !== d.branch
    )
      fail(
        "STALE_RELEASE",
        "Release configuration or branch changed; the prepared plan cannot be applied.",
      );
    return config;
  }
  private async validateCommit(hash: string, d: ReleaseData) {
    const parents = (
      await this.git.run(["rev-list", "--parents", "-n", "1", hash])
    ).split(" ");
    if (parents.length !== 2 || parents[1] !== d.head)
      fail(
        "STALE_RELEASE",
        "The release commit must have exactly the prepared HEAD as parent.",
      );
    const changed = (
      await this.git.run([
        "diff-tree",
        "--no-commit-id",
        "--name-only",
        "-r",
        "-z",
        hash,
      ])
    )
      .split("\0")
      .filter(Boolean)
      .sort();
    if (
      JSON.stringify(changed) !==
      JSON.stringify(d.files!.map((f) => f.path.replaceAll("\\", "/")).sort())
    )
      fail(
        "RELEASE_COMMIT_CHANGED",
        "A Git hook or concurrent operation changed the release commit paths. Inspect it before recovery.",
      );
    for (const f of d.files!) {
      const blob = await this.git.run([
        "rev-parse",
        `${hash}:${f.path.replaceAll("\\", "/")}`,
      ]);
      // Compare Git's normalized blob to the staged planned file (handles CRLF).
      const expected = await this.hashText(f.path, f.after);
      if (
        blob !== expected ||
        (await fileText(this.ledger.root, f.path)) !== f.after
      )
        fail(
          "RELEASE_COMMIT_CHANGED",
          `Committed ${f.path} differs from the prepared contents.`,
        );
    }
  }
  private hashText(path: string, text: string) {
    return this.git.run(
      ["hash-object", `--path=${path}`, "--stdin"],
      15000,
      text,
    );
  }
  private async apply(record: Entity, actor: Actor, initial = false) {
    const d = data(record);
    await this.validateConfig(d);
    let head = await this.git.head();
    if (initial && (head !== d.head || (await this.git.dirty())))
      fail(
        "STALE_RELEASE",
        "HEAD or worktree changed after preparation. No release files were written.",
      );
    const existing = await this.tagObject(d.tag);
    if (head === d.head) {
      if (existing)
        fail(
          "TAG_EXISTS",
          `Tag ${d.tag} already exists; it will not be overwritten.`,
        );
      // Recovery may own a mixture of unchanged, written and staged plan files.
      const changed = (
        await this.git.run([
          "status",
          "--porcelain=v1",
          "-z",
          "--untracked-files=all",
        ])
      )
        .split("\0")
        .filter(Boolean);
      const allowed = new Set(
        d.files!.map((f) => f.path.replaceAll("\\", "/")),
      );
      if (
        changed.some(
          (line) =>
            !allowed.has(line.slice(3)) ||
            (/^[RCU?]./.test(line) && !line.startsWith("??")),
        )
      )
        fail(
          "DIRTY_WORKTREE",
          "Unexpected work or renamed files block release recovery; no files were removed.",
        );
      for (const f of d.files!) {
        const current = await fileText(this.ledger.root, f.path);
        if (current !== f.before && current !== f.after)
          fail("STALE_RELEASE", `${f.path} changed after release preparation.`);
        // Index content must also belong to this plan; never replace someone's staged edits.
        const stage = await this.git
          .run(["rev-parse", "--verify", `:${f.path.replaceAll("\\", "/")}`])
          .catch(() => null);
        if (
          stage !== null &&
          (f.before === null ||
            stage !== (await this.hashText(f.path, f.before))) &&
          stage !== (await this.hashText(f.path, f.after))
        )
          fail("DIRTY_INDEX", `Staged ${f.path} differs from the plan.`);
      }
      if (!d.localStarted)
        this.ledger.transaction(
          `release-local-start:${record.id}`,
          actor,
          "release.local_start",
          { id: record.id },
          () =>
            this.update(
              this.ledger.get(record.id),
              "applying",
              { localStarted: true },
              actor,
            ),
        );
      for (const f of d.files!)
        await writeFile(
          await releasePath(this.ledger.root, f.path),
          f.after,
          "utf8",
        );
      await this.git.run(["add", "--", ...d.files!.map((f) => f.path)]);
      if ((await this.git.head()) !== d.head)
        fail("STALE_RELEASE", "HEAD changed while staging the release.");
      const staged = (
        await this.git.run(["diff", "--cached", "--name-only", "-z"])
      )
        .split("\0")
        .filter(Boolean)
        .sort();
      if (JSON.stringify(staged) !== JSON.stringify([...allowed].sort()))
        fail(
          "DIRTY_INDEX",
          "Unexpected staged paths block the release commit.",
        );
      await this.git.run(
        [
          "commit",
          "-m",
          `chore(release): ${d.version}\n\nContextory-Release: ${record.id}`,
        ],
        120000,
      );
      head = await this.git.head();
    } else {
      const message = await this.git.run(["log", "-1", "--format=%B", head]);
      if (!message.split(/\r?\n/).includes(`Contextory-Release: ${record.id}`))
        fail(
          "STALE_RELEASE",
          "HEAD changed and is not this plan's release commit.",
        );
    }
    await this.validateCommit(head, d);
    if (await this.git.dirty())
      fail(
        "DIRTY_WORKTREE",
        "Git hooks or concurrent work changed files; inspect before tagging.",
      );
    if (existing) {
      const peeled = await this.git.run([
        "rev-parse",
        `refs/tags/${d.tag}^{commit}`,
      ]);
      const message = await this.git.run([
        "for-each-ref",
        "--format=%(contents)",
        `refs/tags/${d.tag}`,
      ]);
      if (
        peeled !== head ||
        !message.split(/\r?\n/).includes(`Contextory-Release: ${record.id}`)
      )
        fail("TAG_EXISTS", "Existing tag is not owned by this release plan.");
    } else
      await this.git.run([
        "tag",
        "-a",
        d.tag,
        head,
        "-m",
        `Version ${d.version}\n\nContextory-Release: ${record.id}`,
      ]);
    const tagObject = await this.tagObject(d.tag);
    const commits = await this.git.commits(head, d.base);
    return this.ledger.transaction(
      `release-tagged:${record.id}:${tagObject}:${this.ledger.get(record.id).revision}`,
      actor,
      "release.tagged",
      { head, tagObject },
      () =>
        this.update(
          this.ledger.get(record.id),
          "tagged",
          { releaseCommit: head, tagObject, commits, error: undefined },
          actor,
        ),
    );
  }
  private async publish(record: Entity, actor: Actor) {
    const d = data(record);
    await this.git.assertRoot();
    if ((await this.remoteIdentity(d.remote!)) !== d.remoteIdentity)
      fail(
        "REMOTE_CHANGED",
        "The configured push destination changed after preparation; publication is blocked.",
      );
    if (!d.tagObject || (await this.tagObject(d.tag)) !== d.tagObject)
      fail(
        "TAG_CHANGED",
        "The local tag differs from the recorded release tag.",
      );
    const urls = await this.git.run([
      "remote",
      "get-url",
      "--push",
      "--all",
      d.remote!,
    ]);
    // Use the captured push destination for both inspection and push (fetch URL may differ).
    const ref = `refs/tags/${d.tag}`;
    let remote = await this.git.run(
      ["ls-remote", "--tags", "--refs", "--", urls, ref],
      60000,
    );
    if (remote && remote.split(/\s/)[0] !== d.tagObject)
      fail(
        "REMOTE_TAG_CONFLICT",
        `Remote tag ${d.tag} already has a different object; no force push is allowed.`,
      );
    if (!remote)
      await this.git.run(["push", "--", urls, `${ref}:${ref}`], 120000);
    remote = await this.git.run(
      ["ls-remote", "--tags", "--refs", "--", urls, ref],
      60000,
    );
    if (remote.split(/\s/)[0] !== d.tagObject)
      fail(
        "REMOTE_VERIFICATION_FAILED",
        "Remote tag was not verified; retry publish/recover to reconcile it.",
      );
    return this.ledger.transaction(
      `release-published:${record.id}:${d.tagObject}:${record.revision}`,
      actor,
      "release.published",
      { tagObject: d.tagObject },
      () =>
        this.update(
          this.ledger.get(record.id),
          "published",
          { publishedAt: new Date().toISOString(), error: undefined },
          actor,
        ),
    );
  }
  private async lock<T>(fn: () => Promise<T>) {
    await this.git.assertRoot();
    const gitDir = resolve(
      this.ledger.root,
      await this.git.run(["rev-parse", "--git-common-dir"]),
    );
    const path = join(gitDir, "contextory-release.lock");
    try {
      const old = JSON.parse(await readFile(path, "utf8")) as { pid: number };
      if (!Number.isInteger(old.pid) || old.pid <= 0)
        fail("RELEASE_BUSY", "An unrecognized repository release lock exists.");
      try {
        process.kill(old.pid, 0);
        fail(
          "RELEASE_BUSY",
          "Another Contextory release operation owns this repository.",
        );
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
      }
      await unlink(path);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
    const handle = await open(path, "wx", 0o600);
    try {
      await handle.writeFile(JSON.stringify({ pid: process.pid }));
      await handle.close();
      return await fn();
    } finally {
      await handle.close().catch(() => {});
      await unlink(path);
    }
  }
}
