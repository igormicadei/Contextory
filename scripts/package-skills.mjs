import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const files = {};
async function walk(dir, prefix = "") {
  for (const entry of (await readdir(dir, { withFileTypes: true })).sort(
    (a, b) => a.name.localeCompare(b.name),
  )) {
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(join(dir, entry.name), key);
    else if (entry.isFile() && entry.name.endsWith(".md"))
      files[key] = (await readFile(join(dir, entry.name), "utf8")).replaceAll(
        "\r\n",
        "\n",
      );
  }
}
await walk(fileURLToPath(new URL("../skills", import.meta.url)));
const output =
  "// Generated from skills/ by scripts/package-skills.mjs.\nexport const skillFiles: Record<string,string> = " +
  JSON.stringify(files, null, 2) +
  ";\n";
const target = new URL("../src/providers/skill-content.ts", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8").catch(() => "")) !== output) {
    process.stderr.write(
      "Portable skill bundle differs from skills/. Run npm run skills:package.\n",
    );
    process.exitCode = 1;
  }
} else await writeFile(target, output, "utf8");
