import { ui, tx } from "../i18n";
import type { Entity } from "../contracts/model";
import type { VersionStatus } from "../releases/manager";
import type { GitCommit } from "../releases/git";
import { escape, button, badge } from "./html";

interface Page<T> {
  items: T[];
  total: number;
  nextOffset: number | null;
}
export type VersionsPage = Omit<VersionStatus, "releases"> & {
  releases: Page<VersionStatus["releases"][number]>;
  unreleased: Page<GitCommit>;
};
export interface VersionDetail {
  release: Entity;
  commits: Page<GitCommit>;
  semantic: Page<{ id: string; revision: number; title: string }>;
}
const commits = (items: GitCommit[]) =>
  ui`<ol class="release-commits">${items.map((c) => ui`<li><code>${escape(c.hash)}</code> ${escape(c.subject)}</li>`).join("")}</ol>`;
export function versionsView(
  page: VersionsPage | undefined,
  detail: VersionDetail | undefined,
  plan: Entity | undefined,
  drafts: Record<string, string>,
  offset: number,
) {
  return ui`<section class="versions-view"><div class="section-heading"><h1>Project versions</h1>${button("versionsRefresh", tx("Refresh"), "", "small")}</div><p>Project-wide versions and exact Git commit membership. Git observation runs automatically while the service is active. Applying and publishing are explicit actions.</p>${!page ? ui('<p role="status">Loading versions...</p>') : ui`<p>${page.available ? ui`<strong>Current version ${escape(page.currentVersion)}</strong> &middot; ${escape(page.branch ?? "detached HEAD")} &middot; ${page.dirty ? tx("uncommitted work") : tx("clean worktree")}</p><p><code>${escape(page.head)}</code></p><p>${page.unreleasedCount} unreleased commits &middot; suggested ${escape(tx(page.recommendedBump))} bump (Conventional Commits heuristic).` : escape(page.reason)}</p>${page.gaps.map((g) => ui`<p class="notice">${escape(g)}</p>`).join("")}<form id="release-form"><label>Version bump<select name="releaseBump">${["auto", "patch", "minor", "major"].map((v) => ui`<option value="${v}" ${drafts.releaseBump === v ? "selected" : ""}>${tx(v)}</option>`).join("")}</select></label><label>Exact version (optional)<input name="releaseVersion" value="${escape(drafts.releaseVersion ?? "")}" placeholder="1.2.3"></label><button type="submit" ${!page.available || page.dirty ? "disabled" : ""}>Prepare release plan</button></form><h2>Unreleased commits</h2>${commits(page.unreleased.items)}<h2>Version history</h2>${page.releases.items.map((r) => ui`<article class="record"><h3>${escape(r.version)} ${badge(r.state)}</h3><p>${escape(r.tag)} &middot; ${r.commitCount} commits &middot; ${r.semanticCount} ledger entries</p>${r.error ? ui`<p class="notice">${escape(r.error)}</p>` : ""}${button("versionSelect", tx("Inspect version"), `data-id="${r.id}"`)} ${r.files.length ? button("versionPlan", tx("Review release plan"), `data-id="${r.id}"`) : ""}</article>`).join("") || ui("<p>No version tags or release plans yet.</p>")}<div class="detail-actions">${offset ? button("versionsPrevious", tx("Previous page")) : ""}${page.releases.nextOffset !== null || page.unreleased.nextOffset !== null ? button("versionsNext", tx("Next page")) : ""}</div>`}${detail ? ui`<article class="record"><h2>Version ${escape(detail.release.data.version)} commits</h2><p>${detail.commits.total} exact Git members</p>${commits(detail.commits.items)}<h3>Ledger entries recorded in this interval</h3><p>These are recording-time associations; they do not prove shipped inclusion.</p><ul>${detail.semantic.items.map((e) => ui`<li>${escape(e.id)}@${e.revision}: ${escape(e.title)}</li>`).join("")}</ul>${detail.commits.nextOffset !== null || detail.semantic.nextOffset !== null ? button("versionMore", tx("Next version details page")) : ""}</article>` : ""}${plan ? ui`<article class="record"><h2>Release plan ${escape(plan.data.version)}</h2><p>${escape(plan.id)} &middot; revision ${plan.revision} &middot; ${badge(plan.state)}</p><p>Base HEAD: <code>${escape(plan.data.head)}</code>. Tag: ${escape(plan.data.tag)}. Remote: ${escape(plan.data.remote)}.</p>${((plan.data.files as { path: string; before: string | null; after: string }[]) ?? []).map((f) => ui`<details><summary>${escape(f.path)}</summary><h3>Before</h3><pre>${escape(f.before ?? tx("(new file)"))}</pre><h3>After</h3><pre>${escape(f.after)}</pre></details>`).join("")}<div class="detail-actions">${plan.state === "prepared" ? `${button("releaseChange", tx("Create version commit and tag"), `data-id="${plan.id}" data-revision="${plan.revision}" data-release="apply"`, "primary")}${button("releaseChange", tx("Cancel plan"), `data-id="${plan.id}" data-revision="${plan.revision}" data-release="cancel"`)}` : ""}${plan.state === "tagged" ? button("releaseChange", ui`Publish tag to ${escape(plan.data.remote)}`, `data-id="${plan.id}" data-revision="${plan.revision}" data-release="publish"`, "primary") : ""}${plan.state === "failed" && !plan.data.localStarted ? button("releaseChange", tx("Cancel plan"), `data-id="${plan.id}" data-revision="${plan.revision}" data-release="cancel"`) : ""}${["applying", "failed", "publishing"].includes(plan.state) ? button("releaseChange", tx("Recover interrupted release"), `data-id="${plan.id}" data-revision="${plan.revision}" data-release="recover"`) : ""}</div></article>` : ""}</section>`;
}
