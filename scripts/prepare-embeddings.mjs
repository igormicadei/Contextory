import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const directory = resolve(process.argv[2] ?? ".contextory-local/embeddings");
if (!isAbsolute(directory))
  throw new Error("Embedding directory must be absolute.");
await mkdir(directory, { recursive: true });
const profile = {
  model: "Xenova/all-MiniLM-L6-v2",
  revision: "751bff37182d3f1213fa05d7196b954e230abad9",
  packageVersion: "4.3.2",
  dimensions: 384,
};
const candidates = [
  process.env.npm_execpath,
  join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
  ...(process.env.PATH ?? "")
    .split(delimiter)
    .flatMap((path) => [
      join(path, "node_modules/npm/bin/npm-cli.js"),
      join(path, "../lib/node_modules/npm/bin/npm-cli.js"),
    ]),
].filter(Boolean);
const npm = candidates.find((path) => existsSync(path));
if (!npm)
  throw new Error(
    "npm is required once to prepare the optional local embedding runtime.",
  );
await writeFile(
  join(directory, "package.json"),
  JSON.stringify(
    {
      name: "contextory-local-embedding-runtime",
      private: true,
      version: "1.0.0",
      dependencies: { "@huggingface/transformers": profile.packageVersion },
    },
    null,
    2,
  ),
);
await new Promise((resolve, reject) => {
  const child = spawn(
    process.execPath,
    [
      npm,
      "install",
      "--prefix",
      directory,
      "--no-audit",
      "--no-fund",
      "--omit=dev",
    ],
    { windowsHide: true, stdio: "inherit", shell: false },
  );
  child.once("error", reject);
  child.once("exit", (code) =>
    code === 0
      ? resolve()
      : reject(new Error(`Optional runtime install failed (${code}).`)),
  );
});
const { env, pipeline } = await import(
  pathToFileURL(
    join(
      directory,
      "node_modules/@huggingface/transformers/dist/transformers.node.mjs",
    ),
  ).href
);
env.cacheDir = join(directory, "models");
const extractor = await pipeline("feature-extraction", profile.model, {
  revision: profile.revision,
  cache_dir: env.cacheDir,
  dtype: "q8",
  device: "cpu",
  session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
});
const check = await extractor("Contextory local semantic search preparation", {
  pooling: "mean",
  normalize: true,
});
if (check.data.length !== profile.dimensions)
  throw new Error("Unexpected embedding dimensions.");
await extractor.dispose();
const notices = [
  "Optional Contextory embedding runtime",
  `Model: ${profile.model}@${profile.revision}`,
  "Model license: Apache-2.0; https://www.apache.org/licenses/LICENSE-2.0",
  "Model source: https://huggingface.co/Xenova/all-MiniLM-L6-v2",
  "",
];
const lock = JSON.parse(
  await readFile(join(directory, "package-lock.json"), "utf8"),
);
for (const [path, entry] of Object.entries(lock.packages)) {
  if (!path || entry.dev) continue;
  notices.push(
    `${path}: ${entry.version}; ${entry.license ?? "See package license"}`,
  );
  const location = join(directory, path);
  const files = await readdir(location).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  for (const file of files.filter((name) =>
    /^(?:license|copying|notice)(?:\.|$)/i.test(name),
  )) {
    const content = await readFile(join(location, file), "utf8").catch(
      () => "",
    );
    notices.push(file, content, "");
  }
}
await writeFile(join(directory, "THIRD_PARTY_NOTICES.txt"), notices.join("\n"));
await writeFile(
  join(directory, "profile.json"),
  JSON.stringify(profile, null, 2) + "\n",
);
console.log(
  "Local semantic search prepared. Runtime queries require no remote model access.",
);
