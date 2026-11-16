import { readFile, stat } from "node:fs/promises";
import { matchesGlob } from "node:path";
import { z } from "zod";
import { ContextoryError } from "../contracts/model";
import { workspacePath } from "../verification/workspace";

const path = z
  .string()
  .min(1)
  .max(1000)
  .refine(
    (p) => !/^(?:[A-Za-z]:|[\\/])|(^|[\\/])\.\.([\\/]|$)/.test(p),
    "Use project-relative paths",
  );
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    name: z.string().max(200).optional(),
    include: z.array(path).max(100).default(["**/*"]),
    exclude: z.array(path).max(100).default([]),
    entryPoints: z.array(path).max(100).default([]),
    conventions: z.array(z.string().max(1000)).max(50).default([]),
    maxFiles: z.number().int().min(1).max(10000).default(2000),
    maxBytes: z
      .number()
      .int()
      .min(1024)
      .max(64 * 1024 * 1024)
      .default(16 * 1024 * 1024),
  })
  .strict();
export type ProjectConfig = z.infer<typeof projectSchema>;
export const indexExcludes = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.contextory-local/**",
  "**/.venv/**",
  "**/venv/**",
  "**/__pycache__/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/artifacts/**",
  "**/test-results/**",
  "**/playwright-report/**",
  "**/.agents/**",
  "**/.codex/**",
  "**/.claude/**",
  "**/.bob/**",
  "**/package-lock.json",
  "**/*.min.js",
];
export async function readProjectConfig(root: string): Promise<ProjectConfig> {
  const file = await workspacePath(root, "contextory.project.json").catch(
    (error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    },
  );
  if (!file) return projectSchema.parse({});
  try {
    if ((await stat(file)).size > 128 * 1024)
      throw new Error("Manifest exceeds 128 KiB");
    const text = await readFile(file, "utf8");
    if (text.length > 128 * 1024) throw new Error("Manifest exceeds 128 KiB");
    return projectSchema.parse(JSON.parse(text));
  } catch (error) {
    throw new ContextoryError(
      "INVALID_PROJECT_CONFIG",
      `contextory.project.json: ${error instanceof Error ? error.message : "Invalid manifest"}`,
    );
  }
}
export function included(path: string, config: ProjectConfig) {
  if (/(^|\/)(?:\.contextory|\.mcp\.json)(\/|$)/.test(path)) return false;
  return (
    !/(^|\/)(?:\.env(?:\.|$)|secrets?(?:[./]|$)|credentials(?:[./]|$))/i.test(
      path,
    ) &&
    config.include.some((p) => matchesGlob(path, p)) &&
    ![...indexExcludes, ...config.exclude].some((p) => matchesGlob(path, p))
  );
}
