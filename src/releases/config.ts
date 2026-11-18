import { readFile, realpath, lstat } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname } from "node:path";
import { z } from "zod";
import { parse, modify, applyEdits } from "jsonc-parser";
import { ContextoryError } from "../contracts/model";
import { digest } from "../storage/ledger";

export const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export function parts(version: string) {
  if (
    !stableVersion.test(version) ||
    version.split(".").some((n) => !Number.isSafeInteger(Number(n)))
  )
    throw new ContextoryError(
      "INVALID_VERSION",
      "Use a stable SemVer such as 1.2.3 with safe integer components.",
    );
  return version.split(".").map(Number);
}
export function compare(a: string, b: string) {
  const aa = parts(a),
    bb = parts(b);
  for (let i = 0; i < 3; i++)
    if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
  return 0;
}
export function bumpVersion(
  current: string,
  bump: "patch" | "minor" | "major",
) {
  const value = parts(current),
    position = { major: 0, minor: 1, patch: 2 }[bump];
  value[position]++;
  for (let i = position + 1; i < 3; i++) value[i] = 0;
  const result = value.join(".");
  parts(result);
  return result;
}
const path = z.string().min(1).max(1000);
const adapter = z.discriminatedUnion("format", [
  z
    .object({
      path,
      format: z.literal("json"),
      keys: z
        .array(z.array(z.string().max(200)).min(1).max(10))
        .min(1)
        .max(10),
    })
    .strict(),
  z
    .object({
      path,
      format: z.literal("text"),
      prefix: z.string().min(1).max(200),
      suffix: z.string().min(1).max(200),
    })
    .strict(),
]);
const schema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    initialVersion: z.string().default("0.0.0"),
    tagPrefix: z
      .string()
      .regex(/^[A-Za-z0-9._-]*$/)
      .max(30)
      .default("v"),
    remote: z
      .string()
      .regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/)
      .max(100)
      .default("origin"),
    branch: z.string().min(1).max(200).optional(),
    changelogPath: path.default("CHANGELOG.md"),
    versionFiles: z.array(adapter).min(1).max(30).optional(),
  })
  .strict();
export type VersionFile = z.infer<typeof adapter>;
export type ReleaseConfig = z.infer<typeof schema> & {
  versionFiles: VersionFile[];
  fingerprint: string;
};
export interface PlannedFile {
  path: string;
  before: string | null;
  after: string;
}

export async function releasePath(root: string, path: string) {
  if (
    isAbsolute(path) ||
    path.startsWith("-") ||
    /[\0\r\n]/.test(path) ||
    /(^|[\\/])(?:\.\.|\.git|node_modules|\.contextory-local)([\\/]|$)/i.test(
      path,
    ) ||
    path.includes(":")
  )
    throw new ContextoryError(
      "INVALID_PATH",
      "Release files must be ordinary files inside the repository.",
    );
  const absolute = resolve(root, path),
    base = await realpath(root);
  const parent = await realpath(dirname(absolute));
  const rel = relative(base, parent);
  if (rel.startsWith("..") || isAbsolute(rel))
    throw new ContextoryError(
      "INVALID_PATH",
      "Release file parent leaves this workspace.",
    );
  try {
    if (
      (await lstat(absolute)).isSymbolicLink() ||
      !(await lstat(absolute)).isFile()
    )
      throw new ContextoryError(
        "INVALID_PATH",
        "Release files cannot be symlinks or directories.",
      );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  return absolute;
}
export async function fileText(root: string, path: string) {
  const absolute = await releasePath(root, path);
  try {
    if ((await lstat(absolute)).size > 512 * 1024)
      throw new ContextoryError(
        "RELEASE_LIMIT",
        `Release file ${path} exceeds 512 KiB.`,
      );
    return await readFile(absolute, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}
export async function releaseConfig(root: string): Promise<ReleaseConfig> {
  const raw = await fileText(root, "contextory.release.json");
  const config = schema.parse(raw === null ? {} : JSON.parse(raw));
  parts(config.initialVersion);
  const versionFiles: VersionFile[] = config.versionFiles ?? [];
  if (!config.versionFiles) {
    if ((await fileText(root, "package.json")) !== null) {
      versionFiles.push({
        path: "package.json",
        format: "json",
        keys: [["version"]],
      });
      const lock = await fileText(root, "package-lock.json");
      if (lock !== null) {
        const parsed = JSON.parse(lock);
        const keys = [["version"]];
        if (parsed.packages?.[""]) keys.push(["packages", "", "version"]);
        versionFiles.push({ path: "package-lock.json", format: "json", keys });
      }
    } else
      versionFiles.push({
        path: "contextory.version.json",
        format: "json",
        keys: [["version"]],
      });
  }
  const names = await Promise.all(
    [
      ...versionFiles.map((f) => f.path),
      config.changelogPath,
      "contextory.release.json",
    ].map(async (path) => {
      const absolute = await releasePath(root, path);
      return process.platform === "win32" ? absolute.toLowerCase() : absolute;
    }),
  );
  if (new Set(names).size !== names.length)
    throw new ContextoryError(
      "INVALID_CONFIG",
      "Version files, release configuration and changelog must be distinct.",
    );
  return {
    ...config,
    versionFiles,
    fingerprint: digest({ config, versionFiles }),
  };
}
export function replaceVersion(
  file: VersionFile,
  before: string | null,
  current: string,
  next: string,
): string {
  if (file.format === "json") {
    let text = before ?? "{}\n";
    for (const keys of file.keys) {
      const errors: import("jsonc-parser").ParseError[] = [];
      const data = parse(text, errors),
        found = keys.reduce((value, key) => value?.[key], data);
      if (errors.length || (before !== null && found !== current))
        throw new ContextoryError(
          "VERSION_DRIFT",
          `${file.path} has a missing or different version at ${keys.join(".")}. Configure matching version fields before releasing.`,
        );
      text = applyEdits(
        text,
        modify(text, keys, next, {
          formattingOptions: {
            insertSpaces: true,
            tabSize: 2,
            eol: text.includes("\r\n") ? "\r\n" : "\n",
          },
        }),
      );
    }
    return text;
  }
  const needle = file.prefix + current + file.suffix;
  if (before === null || before.split(needle).length !== 2)
    throw new ContextoryError(
      "VERSION_DRIFT",
      `${file.path} needs exactly one configured current-version marker.`,
    );
  return before.replace(needle, file.prefix + next + file.suffix);
}
export function readVersion(
  file: VersionFile,
  text: string | null,
): string | undefined {
  if (text === null) return undefined;
  if (file.format === "json")
    return file.keys[0].reduce((value, key) => value?.[key], parse(text));
  const start = text.indexOf(file.prefix);
  if (start < 0) return undefined;
  return text.slice(start + file.prefix.length).split(file.suffix)[0];
}
