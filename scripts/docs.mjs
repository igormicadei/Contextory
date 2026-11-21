/** PT-BR: Executa o gerador portátil com os layouts padrão da skill.
 * EN: Run the portable generator with the skill's default layouts.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const result = spawnSync(
  process.env.DOCUMENTATION_PYTHON || "python",
  [
    fileURLToPath(new URL("./documentation/build.py", import.meta.url)),
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit", windowsHide: true },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
