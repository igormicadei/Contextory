import { build, context } from "esbuild";
import { mkdir, readdir, unlink, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
await import("./package-skills.mjs");
await mkdir("dist", { recursive: true });
await import("./documentation-resources.mjs");
await mkdir("artifacts", { recursive: true });
const requireBanner = {
  js: "import { createRequire as contextoryRequire } from 'node:module'; import { fileURLToPath as contextoryFilePath } from 'node:url'; import { dirname as contextoryDirname } from 'node:path'; const require = contextoryRequire(import.meta.url); const __filename = contextoryFilePath(import.meta.url); const __dirname = contextoryDirname(__filename);",
};
// Compile the catalog from its single source of truth at build time. Native
// discovery stays independent of service startup without loading another schema
// runtime in every stdio proxy. Watch mode rebuilds it when contracts change.
const toolCatalog = {
  name: "contextory-tool-catalog",
  setup(builder) {
    builder.onResolve({ filter: /^contextory:tool-definitions$/ }, () => ({
      path: "catalog",
      namespace: "contextory",
    }));
    builder.onLoad(
      { filter: /^catalog$/, namespace: "contextory" },
      async () => {
        const compiled = await build({
          entryPoints: ["src/contracts/tools.ts"],
          bundle: true,
          platform: "node",
          format: "esm",
          write: false,
          metafile: true,
          logLevel: "silent",
        });
        const catalog = await import(
          `data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`
        );
        return {
          contents: `export default ${JSON.stringify(catalog.toolDefinitions())};`,
          loader: "js",
          watchFiles: Object.keys(compiled.metafile.inputs)
            .filter((path) => !path.startsWith("node_modules/"))
            .map((path) => resolve(path)),
        };
      },
    );
  },
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
    ["src/codebase/worker.ts", "codebase-worker"],
    ["src/cli.ts", "contextory"],
    ["src/mcp/proxy.ts", "mcp-proxy"],
    ["src/hooks/launcher.ts", "contextory-hook"],
  ].map(([entry, name]) => ({
    entryPoints: [entry],
    outfile: `dist/${name}.mjs`,
    platform: "node",
    format: "esm",
    banner: requireBanner,
    ...(name === "mcp-proxy" ? { plugins: [toolCatalog] } : {}),
  })),
];
const outputs = new Set(
  jobs.flatMap((job) => [
    job.outfile.split("/").pop(),
    job.outfile.split("/").pop() + ".map",
  ]),
);
outputs.add("python-flow.py");
outputs.add("python-index.py");
await copyFile("src/analysis/python-flow.py", "dist/python-flow.py");
await copyFile("src/codebase/python-index.py", "dist/python-index.py");
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
