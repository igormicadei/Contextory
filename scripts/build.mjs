import { build, context } from "esbuild";
import { mkdir, readdir, unlink, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await mkdir("artifacts", { recursive: true });
const requireBanner = {
  js: "import { createRequire as contextoryRequire } from 'node:module'; import { fileURLToPath as contextoryFilePath } from 'node:url'; import { dirname as contextoryDirname } from 'node:path'; const require = contextoryRequire(import.meta.url); const __filename = contextoryFilePath(import.meta.url); const __dirname = contextoryDirname(__filename);",
};
const jobs = [
  {
    entryPoints: ["src/extension.ts"],
    outfile: "dist/extension.js",
    platform: "node",
    format: "cjs",
    external: ["vscode"],
  },
  {
    entryPoints: ["src/webview/main.ts"],
    outfile: "dist/webview.js",
    platform: "browser",
    format: "iife",
  },
  ...[
    ["src/service/main.ts", "service"],
    ["src/analysis/worker.ts", "analysis-worker"],
    ["src/mcp/proxy.ts", "mcp-proxy"],
    ["src/hooks/launcher.ts", "contextory-hook"],
  ].map(([entry, name]) => ({
    entryPoints: [entry],
    outfile: `dist/${name}.mjs`,
    platform: "node",
    format: "esm",
    banner: requireBanner,
  })),
];
const outputs = new Set(
  jobs.flatMap((job) => [
    job.outfile.split("/").pop(),
    job.outfile.split("/").pop() + ".map",
  ]),
);
outputs.add("python-flow.py");
await copyFile("src/analysis/python-flow.py", "dist/python-flow.py");
for (const file of await readdir("dist", { withFileTypes: true }))
  if (file.isFile() && !outputs.has(file.name))
    await unlink(`dist/${file.name}`);
const shared = {
  bundle: true,
  sourcemap: true,
  target: "es2022",
  mainFields: ["module", "main"],
  loader: { ".svg": "text" },
  logLevel: "info",
};
if (process.argv.includes("--watch"))
  for (const job of jobs) await (await context({ ...shared, ...job })).watch();
else await Promise.all(jobs.map((job) => build({ ...shared, ...job })));
