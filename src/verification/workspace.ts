import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { ContextoryError, type SourceSnapshot } from "../contracts/model";
const exec = promisify(execFile);
const blocked =
  /(^|[\\/])(?:\.git|node_modules|\.contextory-local|\.venv|venv|__pycache__)(?:[\\/]|$)/;
export async function workspacePath(
  root: string,
  input: string,
): Promise<string> {
  if (!input || isAbsolute(input) || /(^|[\\/])\.\.(?:[\\/]|$)/.test(input))
    throw new ContextoryError(
      "INVALID_PATH",
      "Use a workspace-relative path without parent traversal.",
    );
  const base = await realpath(root);
  const path = await realpath(resolve(base, input));
  const rel = relative(base, path);
  if (rel.startsWith("..") || isAbsolute(rel) || blocked.test(rel))
    throw new ContextoryError(
      "INVALID_PATH",
      "Path is outside the authorized source workspace.",
    );
  return path;
}
export async function workspaceFiles(
  root: string,
  limit = 100000,
): Promise<string[]> {
  try {
    const result = await exec(
      "git",
      [
        "-C",
        root,
        "ls-files",
        "--cached",
        "--others",
        "--exclude-standard",
        "-z",
      ],
      { maxBuffer: 32 * 1024 * 1024, windowsHide: true, timeout: 10000 },
    );
    const files = [
      ...new Set(
        result.stdout.split("\0").filter((path) => path && !blocked.test(path)),
      ),
    ].sort();
    if (files.length > limit)
      throw new ContextoryError(
        "SOURCE_LIMIT",
        `Source manifest exceeds ${limit} files; narrow the workspace.`,
      );
    return files;
  } catch (error) {
    if (error instanceof ContextoryError) throw error;
  }
  const found: string[] = [];
  const walk = async (directory: string) => {
    for (const entry of await readdir(resolve(root, directory), {
      withFileTypes: true,
    })) {
      const name = directory ? `${directory}/${entry.name}` : entry.name;
      if (
        entry.isSymbolicLink() ||
        blocked.test(name) ||
        /(^|\/)(?:dist|build|coverage|artifacts|test-results|playwright-report|\.next)(\/|$)/.test(
          name,
        )
      )
        continue;
      if (entry.isDirectory()) await walk(name);
      else if (entry.isFile()) found.push(name);
      if (found.length > limit)
        throw new ContextoryError(
          "SOURCE_LIMIT",
          `Source manifest exceeds ${limit} files; narrow the workspace.`,
        );
    }
  };
  await walk("");
  return found.sort();
}
export async function sourceSnapshot(root: string): Promise<SourceSnapshot> {
  const hash = createHash("sha256");
  const files = await workspaceFiles(root);
  let count = 0;
  for (const name of files) {
    const path = resolve(root, name);
    try {
      const stat = await lstat(path);
      if (stat.isSymbolicLink()) {
        hash.update(name).update("symlink");
        continue;
      }
      if (!stat.isFile()) continue;
      if (stat.size > 20 * 1024 * 1024)
        throw new ContextoryError(
          "SOURCE_LIMIT",
          `Source file ${name} exceeds snapshot limits.`,
        );
      const contents = await readFile(await workspacePath(root, name));
      hash
        .update(name.replaceAll("\\", "/"))
        .update("\0")
        .update(createHash("sha256").update(contents).digest());
      count++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        hash.update(name).update("deleted");
        continue;
      }
      throw error;
    }
  }
  const gitHead = await exec("git", ["-C", root, "rev-parse", "HEAD"], {
    windowsHide: true,
    timeout: 3000,
  }).then(
    (r) => r.stdout.trim(),
    () => undefined,
  );
  hash.update(gitHead ?? "no-head");
  return {
    hash: hash.digest("hex"),
    files: count,
    gitHead,
    capturedAt: new Date().toISOString(),
  };
}
