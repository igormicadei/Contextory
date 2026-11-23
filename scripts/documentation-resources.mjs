import { readFile, mkdir, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

// Verify every vendored byte before shipping it. The self-documentation renderer
// in scripts/documentation/vendor remains independently pinned at schema 1.
const source = "resources/documentation";
const manifest = JSON.parse(
  await readFile(join(source, "PROVENANCE.json"), "utf8"),
);
for (const [path, expected] of Object.entries(manifest.files)) {
  const payload = await readFile(join(source, path));
  if (createHash("sha256").update(payload).digest("hex") !== expected)
    throw new Error("Bundled documentation resource changed: " + path);
  const target = join("dist/documentation", path);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(join(source, path), target);
}
await copyFile(
  join(source, "PROVENANCE.json"),
  "dist/documentation/PROVENANCE.json",
);
await copyFile("src/documentation/bridge.py", "dist/documentation/bridge.py");
