import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const notices = [
  "Relay bundled runtime dependency notices",
  "",
  "Native Codex, Claude Code and IBM Bob are separately installed and are not included.",
  "Optional semantic search installs @huggingface/transformers 4.3.2 (Apache-2.0) and ONNX Runtime separately in managed local storage. The pinned Xenova/all-MiniLM-L6-v2 model is Apache-2.0: https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/751bff37182d3f1213fa05d7196b954e230abad9. Those optional assets are not included in this VSIX; preparation retains their dependency notices.",
  "",
];
const seen = new Set();
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev || entry.optional) continue;
  const pkg = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
  const id = `${pkg.name}@${pkg.version}`;
  if (seen.has(id)) continue;
  seen.add(id);
  notices.push(
    "=".repeat(72),
    id,
    `License: ${pkg.license ?? "See package license"}`,
    typeof pkg.repository === "object"
      ? (pkg.repository.url ?? "")
      : (pkg.repository ?? ""),
    "",
  );
  const files = (await readdir(path)).filter((name) =>
    /^(?:license|copying|notice)(?:\.|$)/i.test(name),
  );
  for (const file of files)
    notices.push(file, await readFile(join(path, file), "utf8"), "");
}
await writeFile(
  "THIRD_PARTY_NOTICES.txt",
  notices.join("\n").replace(/[\t ]+$/gm, ""),
  "utf8",
);
console.log(`Bundled dependency notices generated for ${seen.size} packages.`);
