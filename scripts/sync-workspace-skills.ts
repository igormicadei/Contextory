import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { clientIds, clients } from "../src/providers/clients";
import { skillFiles } from "../src/providers/skill-content";
import { syncProviderSkills } from "../src/providers/registration";

async function main() {
  const { values } = parseArgs({
    options: {
      check: { type: "boolean", default: false },
      root: { type: "string", default: process.cwd() },
    },
  });
  const root = resolve(values.root);
  if (values.check) {
    const mismatches: string[] = [];
    for (const id of clientIds)
      for (const [resource, body] of Object.entries(skillFiles)) {
        const path = join(root, clients[id].skillsPath, resource);
        if ((await readFile(path, "utf8").catch(() => undefined)) !== body)
          mismatches.push(path);
      }
    if (mismatches.length) {
      process.stderr.write(
        `Workspace skills differ from the portable bundle. Run npm run skills:sync.\n${mismatches.join("\n")}\n`,
      );
      process.exitCode = 1;
    } else
      process.stdout.write(
        "All workspace client skills match the portable bundle.\n",
      );
  } else {
    const files = await syncProviderSkills(root, clientIds);
    process.stdout.write(
      `Synchronized ${files.length} skill resources across ${clientIds.length} client adapters.\n`,
    );
  }
}
main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
