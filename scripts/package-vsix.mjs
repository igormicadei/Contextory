import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version))
  throw new Error("Stable package version required");
await mkdir("artifacts", { recursive: true });
const name = `contextory-workspace-${version}.vsix`;
execFileSync(
  process.execPath,
  [
    resolve("node_modules/@vscode/vsce/vsce"),
    "package",
    "--no-dependencies",
    "--skip-license",
    "-o",
    resolve("artifacts", name),
  ],
  { stdio: "inherit", windowsHide: true },
);
const hash = createHash("sha256")
  .update(await readFile(resolve("artifacts", name)))
  .digest("hex");
await writeFile(
  resolve("artifacts", `contextory-workspace-${version}.sha256`),
  `${hash}  ${name}\n`,
);
console.log(`${hash}  ${name}`);
