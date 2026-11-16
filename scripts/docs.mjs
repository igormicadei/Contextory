import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  cp,
  rm,
  stat,
} from "node:fs/promises";
import { resolve, relative, dirname, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "vitepress";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const content = resolve(root, ".contextory-local/docs-content");
const output = resolve(root, ".contextory-local/docs-site");
// Only these generated directories can be replaced, never the workspace or ledger.
for (const directory of [content, output]) {
  if (!directory.startsWith(resolve(root, ".contextory-local") + sep))
    throw new Error("Unsafe documentation output path");
  await rm(directory, { recursive: true, force: true });
}
const pages = new Map([
  ["README.md", "overview.md"],
  ["CHANGELOG.md", "changelog.md"],
  ["docs-site/index.md", "index.md"],
]);
async function collect(directory) {
  for (const item of await readdir(resolve(root, directory), {
    withFileTypes: true,
  })) {
    const path = `${directory}/${item.name}`;
    if (item.isDirectory()) await collect(path);
    else if (item.name.endsWith(".md")) pages.set(path, path);
  }
}
await collect("docs");
await collect("skills");
for (const [source, target] of pages) {
  let text = await readFile(resolve(root, source), "utf8");
  if (source.startsWith("skills/") && /SKILL\.md$/.test(source)) {
    const title = source.includes("contextory-codebase")
      ? "Codebase skill"
      : "Workflow skill";
    text =
      `# ${title}\n\n` + text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  }
  const rewrite = (url) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(url)) return url;
    const [path, fragment] = url.split("#");
    const absolute = resolve(root, dirname(source), path);
    const local = relative(root, absolute).replaceAll("\\", "/");
    if (pages.has(local))
      return (
        relative(dirname(target), pages.get(local)).replaceAll("\\", "/") +
        (fragment ? `#${fragment}` : "")
      );
    if (/^(media|artifacts)\//.test(local))
      return `/${local}` + (fragment ? `#${fragment}` : "");
    return (
      `https://github.com/igormicadei/Contextory/blob/v0.3.0/${local}` +
      (fragment ? `#${fragment}` : "")
    );
  };
  text = text.replace(
    /(\]\()([^\s)]+)(\))/g,
    (_, a, url, b) => a + rewrite(url) + b,
  );
  text = text.replace(
    /(<img\s[^>]*src=")([^"]+)(")/g,
    (_, a, url, b) => a + rewrite(url) + b,
  );
  const destination = resolve(content, target);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, text);
}
await mkdir(resolve(content, "public"), { recursive: true });
await cp(
  resolve(root, "media/contextory-icon.png"),
  resolve(content, "public/media/contextory-icon.png"),
  { recursive: true },
);
await mkdir(resolve(content, "public/artifacts"), { recursive: true });
for (const file of await readdir(resolve(root, "artifacts"))) {
  if (
    [".png", ".json", ".sha256"].includes(extname(file)) &&
    !file.startsWith("probe")
  )
    await cp(
      resolve(root, "artifacts", file),
      resolve(content, "public/artifacts", file),
    );
}
await build(resolve(root, "docs-site"));
await writeFile(resolve(output, ".nojekyll"), "");
const manifest = {
  version: JSON.parse(await readFile(resolve(root, "package.json"), "utf8"))
    .version,
  pages: [...pages.values()].map((p) => p.replace(/\.md$/, ".html")).sort(),
};
await writeFile(
  resolve(output, "documentation.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
// Catch missing relative page/asset links in the actual generated HTML, including base paths.
const missing = new Set();
for (const page of manifest.pages) {
  const html = await readFile(resolve(output, page), "utf8");
  for (const match of html.matchAll(
    /(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g,
  )) {
    let path = match[1];
    if (/^(?:[a-z]+:|\/\/)/i.test(path)) continue;
    path = path.startsWith("/Contextory/")
      ? path.slice("/Contextory/".length)
      : path.startsWith("/")
        ? path.slice(1)
        : relative(output, resolve(dirname(resolve(output, page)), path));
    if (!path || path.endsWith("/")) path += "index.html";
    try {
      await stat(resolve(output, decodeURIComponent(path)));
    } catch {
      missing.add(`${page}: ${match[1]}`);
    }
  }
}
if (missing.size)
  throw new Error(`Broken documentation links:\n${[...missing].join("\n")}`);
console.log(
  `Built and checked ${manifest.pages.length} documentation pages at ${relative(root, output)}.`,
);
