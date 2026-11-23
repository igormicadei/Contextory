import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const repo = "igormicadei/Contextory";
const version = JSON.parse(await readFile("package.json", "utf8")).version;
const tag = `v${version}`;
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const api = (path) =>
  JSON.parse(
    execFileSync("gh", ["api", `repos/${repo}/${path}`], { encoding: "utf8" }),
  );
const release = api(`releases/tags/${tag}`);
assert.equal(release.draft, false);
assert.equal(release.prerelease, false);
let ref = api(`git/ref/tags/${tag}`).object;
if (ref.type === "tag") ref = api(`git/tags/${ref.sha}`).object;
assert.equal(
  ref.sha,
  git("rev-parse", `${tag}^{}`),
  "Release tag differs from the local validated commit",
);
assert.equal(
  git("merge-base", ref.sha, "HEAD"),
  ref.sha,
  "Release must be in the current branch history",
);
const sha256 = (data) => createHash("sha256").update(data).digest("hex");
const verifiedAssets = [];
for (const suffix of ["vsix", "sha256"]) {
  const name = `contextory-workspace-${version}.${suffix}`;
  const asset = release.assets.find((a) => a.name === name);
  assert.ok(asset, `Missing release asset ${name}`);
  const local = await readFile(`artifacts/${name}`);
  const response = await fetch(asset.browser_download_url, {
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  assert.equal(response.status, 200, `Cannot download ${name}`);
  const remote = Buffer.from(await response.arrayBuffer());
  assert.equal(
    sha256(remote),
    sha256(local),
    `Published ${name} differs from the local package`,
  );
  assert.equal(asset.size, local.length);
  verifiedAssets.push({ name, bytes: remote.length, sha256: sha256(remote) });
}
const checksum = (
  await readFile(`artifacts/contextory-workspace-${version}.sha256`, "utf8")
).split(/\s+/)[0];
assert.equal(
  checksum,
  verifiedAssets[0].sha256,
  "Checksum file does not match the VSIX",
);
const pages = api("pages");
assert.equal(pages.source.branch, "gh-pages");
assert.equal(pages.source.path, "/");
assert.equal(pages.https_enforced, true);
// Commit metadata avoids downloading large generated-page patches during verification.
const pagesHead = api("git/ref/heads/gh-pages").object.sha;
const pagesCommit = api(`git/commits/${pagesHead}`);
// Follow the first-parent chain; the documentation branch must have its own root.
let root = pagesCommit;
for (let i = 0; root.parents.length; i++) {
  assert.ok(i < 200, "Unexpectedly deep Pages history");
  assert.equal(
    root.parents.length,
    1,
    "Pages history must not merge the source branch",
  );
  root = api(`git/commits/${root.parents[0].sha}`);
}
assert.notEqual(
  root.sha,
  git("rev-list", "--max-parents=0", "main"),
  "gh-pages must be an orphan branch",
);
const response = await fetch(
  `${pages.html_url}documentation.json?release=${ref.sha}`,
  { signal: AbortSignal.timeout(30000), cache: "no-store" },
);
assert.equal(response.status, 200);
const manifest = await response.json();
assert.equal(manifest.version, version);
const corpus = JSON.parse(
  await readFile(".documentation/project.json", "utf8"),
);
const redirects = JSON.parse(
  await readFile(".documentation/redirects.json", "utf8"),
);
const expected = [
  "index.html",
  ...["en", "pt-BR"].flatMap((locale) =>
    corpus.pages.map((page) => `${locale}/${page.id}.html`),
  ),
  ...Object.keys(redirects),
];
assert.equal(manifest.layout, "software-documentation default Carbon");
assert.deepEqual(
  manifest.pages.slice().sort(),
  expected.sort(),
  "Pages must include all canonical documentation",
);
for (const path of [
  "",
  "docs/USER-GUIDE.html",
  "docs/CODEBASE-INTELLIGENCE.html",
  "en/overview.html",
  "pt-BR/overview.html",
  `docs/releases/${tag}.html`,
]) {
  const page = await fetch(pages.html_url + path, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(page.status, 200, `Published page unavailable: ${path}`);
  assert.ok((await page.text()).includes("Contextory"));
}
for (const path of [
  "llms.txt",
  "en/llms-full.txt",
  "pt-BR/llms-full.txt",
  "corpus.json",
  "api.json",
]) {
  const exported = await fetch(pages.html_url + path, {
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(exported.status, 200, `Published export unavailable: ${path}`);
}
console.log(
  JSON.stringify(
    {
      release: release.html_url,
      commit: ref.sha,
      assets: verifiedAssets,
      documentation: pages.html_url,
      pages: expected.length,
      orphanRoot: root.sha,
      pagesCommit: pagesCommit.sha,
      verified: true,
    },
    null,
    2,
  ),
);
