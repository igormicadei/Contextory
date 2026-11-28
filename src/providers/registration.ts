import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, isAbsolute } from "node:path";
import { parse as parseToml, stringify } from "smol-toml";
import { parse, modify, applyEdits, type ParseError } from "jsonc-parser";
import { ContextoryError, type Provider } from "../contracts/model";
import { clients, hookEvents } from "./clients";
import { skillFiles } from "./skill-content";
import { replaceFile } from "../storage/atomic";
export interface Registration {
  root: string;
  provider: Provider;
  node: string;
  proxy: string;
  hook: string;
  descriptor: string;
  hookDescriptor: string;
}
export function registrationName(root: string) {
  const canonical = realpathSync(root);
  return `contextory_companion_${createHash("sha256")
    .update(process.platform === "win32" ? canonical.toLowerCase() : canonical)
    .digest("hex")
    .slice(0, 12)}`;
}
function quote(value: string) {
  if (process.platform === "win32") {
    if (/["%!\r\n]/.test(value))
      throw new ContextoryError(
        "UNSUPPORTED_PATH",
        "Native hook command paths cannot contain quotes, percent signs or control characters on Windows.",
      );
    return `"${value.replaceAll("\\", "/")}"`;
  }
  return `'${value.replaceAll("'", "'\\''")}'`;
}
export function hookCommand(r: Registration) {
  return [r.node, r.hook, r.hookDescriptor, r.provider].map(quote).join(" ");
}
type Edit = { path: string; transform(text: string): string | undefined };
async function inspect(root: string, path: string) {
  const rel = relative(root, path);
  if (rel.startsWith("..") || isAbsolute(rel))
    throw new ContextoryError(
      "LINKED_CONFIG",
      "Configuration must stay inside the workspace.",
    );
  let current = root;
  for (const part of rel.split(/[\\/]/)) {
    current = join(current, part);
    const stat = await lstat(current).catch((error) => {
      if (error.code === "ENOENT") return undefined;
      throw error;
    });
    if (stat?.isSymbolicLink())
      throw new ContextoryError(
        "LINKED_CONFIG",
        "Linked provider configuration is preserved; use regular workspace directories.",
      );
    if (stat && (current === path ? !stat.isFile() : !stat.isDirectory()))
      throw new ContextoryError(
        "INVALID_CONFIG",
        "Provider configuration paths must use regular files and directories.",
      );
  }
  return readFile(path, "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
}
// Validate every transformation before writing. Roll back only bytes still owned by this
// operation; never overwrite another editor's intervening change during rollback.
async function applyFiles(root: string, edits: Edit[]) {
  const prepared: (Edit & {
    original: string | undefined;
    next: string | undefined;
  })[] = [];
  for (const edit of edits) {
    const original = await inspect(root, edit.path);
    const next = edit.transform(original ?? "");
    if (next !== original && !(original === undefined && next === ""))
      prepared.push({ ...edit, original, next });
  }
  const applied: typeof prepared = [];
  const replace = async (
    edit: (typeof prepared)[number],
    value: string | undefined,
  ) => {
    if (value === undefined) {
      await unlink(edit.path);
      return;
    }
    await mkdir(dirname(edit.path), { recursive: true });
    await inspect(root, edit.path);
    const temp = `${edit.path}.contextory-${process.pid}-${Date.now()}.tmp`;
    try {
      await writeFile(temp, value, { flag: "wx", mode: 0o600 });
      await replaceFile(temp, edit.path);
    } finally {
      await unlink(temp).catch(() => {});
    }
  };
  try {
    for (const edit of prepared) {
      if ((await inspect(root, edit.path)) !== edit.original)
        throw new ContextoryError(
          "CONFIG_CHANGED",
          "Configuration changed during connection. Retry without overwriting it.",
        );
      await replace(edit, edit.next);
      applied.push(edit);
    }
  } catch (error) {
    for (const edit of applied.reverse())
      if ((await inspect(root, edit.path)) === edit.next)
        await replace(edit, edit.original);
    throw error;
  }
  return prepared.map((edit) => edit.path);
}
function jsonEdit(text: string, changes: { path: string[]; value: unknown }[]) {
  let next = text || "{}\n";
  const errors: ParseError[] = [];
  parse(next, errors, { allowTrailingComma: true });
  if (errors.length)
    throw new ContextoryError(
      "INVALID_CONFIG",
      "Fix the existing provider JSON configuration before connecting.",
    );
  for (const change of changes)
    next = applyEdits(
      next,
      modify(next, change.path, change.value, {
        formattingOptions: {
          insertSpaces: true,
          tabSize: 2,
          eol: text.includes("\r\n") ? "\r\n" : "\n",
        },
      }),
    );
  return next;
}
function skillEdits(root: string, provider: Provider, remove = false): Edit[] {
  return Object.entries(skillFiles)
    .sort(
      ([a], [b]) =>
        Number(b === "contextory-workflow/SKILL.md") -
          Number(a === "contextory-workflow/SKILL.md") || a.localeCompare(b),
    )
    .map(([key, body]) => ({
      path: join(root, clients[provider].skillsPath, key),
      transform: (text: string) => {
        if (text && !text.includes("<!-- contextory-managed-"))
          throw new ContextoryError(
            "CONFIG_CONFLICT",
            `An existing ${key} resource is unowned and was preserved.`,
          );
        return remove ? undefined : body;
      },
    }));
}
// Install only shared resources, leaving MCP, hook and permission configuration alone.
// Preflight all selected clients together so a conflict cannot leave a partial sync.
export async function syncProviderSkills(
  root: string,
  providers: readonly Provider[],
) {
  root = await realpath(root);
  const edits = providers.flatMap((provider) => skillEdits(root, provider));
  await applyFiles(root, edits);
  return edits.map((edit) => edit.path);
}
function ownedHook(command: unknown, r: Registration) {
  if (command === hookCommand(r)) return true;
  if (typeof command !== "string") return false;
  // Recognize only our four quoted positional arguments. A wrapper, another
  // project's descriptor, or a user command that merely mentions us is kept.
  const token = /"([^"]*)"|'((?:[^']|'\\'')*)'/gy;
  const args: string[] = [];
  let offset = 0;
  while (offset < command.length) {
    token.lastIndex = offset;
    const match = token.exec(command);
    if (!match) return false;
    args.push(match[1] ?? match[2].replaceAll("'\\''", "'"));
    offset = token.lastIndex;
    if (offset < command.length && command[offset++] !== " ") return false;
  }
  const pathKey = (path: string) => {
    const normalized = path.replaceAll("\\", "/");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return (
    args.length === 4 &&
    /(?:^|[\\/])node(?:\.exe)?$/i.test(args[0]) &&
    /(?:^|[\\/])contextory-hook\.mjs$/.test(args[1]) &&
    pathKey(args[2]) === pathKey(r.hookDescriptor) &&
    args[3] === r.provider
  );
}
function hooksEdit(r: Registration, remove = false): Edit {
  return {
    path: join(r.root, clients[r.provider].hooksPath),
    transform: (text) => {
      const parsed = parse(text || "{}") as {
        hooks?: Record<
          string,
          { matcher?: string; hooks?: { command?: string }[] }[]
        >;
      };
      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed) ||
        (parsed.hooks !== undefined &&
          (!parsed.hooks ||
            typeof parsed.hooks !== "object" ||
            Array.isArray(parsed.hooks)))
      )
        throw new ContextoryError(
          "INVALID_CONFIG",
          "Existing hook configuration must be an object; it was preserved.",
        );
      const changes: { path: string[]; value: unknown }[] = [];
      for (const event of hookEvents(r.provider)) {
        const rows = parsed.hooks?.[event] ?? [];
        if (!Array.isArray(rows))
          throw new ContextoryError(
            "INVALID_CONFIG",
            `Existing ${event} hooks must be an array; configuration was preserved.`,
          );
        const preserved = rows.flatMap((row) => {
          if (!row || !Array.isArray(row.hooks)) return [row];
          const hooks = row.hooks.filter(
            (hook) => !ownedHook(hook?.command, r),
          );
          return hooks.length === row.hooks.length
            ? [row]
            : hooks.length
              ? [{ ...row, hooks }]
              : [];
        });
        if (!remove)
          preserved.push({
            ...(event.includes("Tool") ? { matcher: "*" } : {}),
            hooks: [
              // Wait for review within the host budget. Expiry still denies;
              // other lifecycle observations remain short-lived.
              {
                type: "command",
                command: hookCommand(r),
                timeout: ["Stop", "PreToolUse"].includes(event) ? 300 : 5,
              } as {
                command: string;
              },
            ],
          });
        changes.push({
          path: ["hooks", event],
          value: preserved.length ? preserved : undefined,
        });
      }
      return jsonEdit(text, changes);
    },
  };
}
// Explicit recovery touches hooks only; it never reinstalls MCP or skills.
export async function rebuildProviderHooks(r: Registration) {
  r = { ...r, root: await realpath(r.root) };
  if (!clients[r.provider].hooksPath)
    throw new ContextoryError(
      "INVALID_PROVIDER",
      "Generic MCP has no native hooks to rebuild.",
    );
  return applyFiles(r.root, [hooksEdit(r)]);
}
export async function configureProvider(r: Registration, remove = false) {
  r = { ...r, root: await realpath(r.root) };
  const edits: Edit[] = [];
  const adapter = clients[r.provider];
  const name = registrationName(r.root);
  const config = {
    type: "stdio",
    command: r.node,
    args: [r.proxy, r.descriptor],
  };
  const command = adapter.hooksPath ? hookCommand(r) : "";
  const mcpFile = join(r.root, adapter.mcpPath);
  if (adapter.mcpFormat === "toml") {
    edits.push({
      path: mcpFile,
      transform: (text) => {
        const parsed = parseToml(text.replace(/^\uFEFF/, ""));
        const begin = `# contextory:begin ${name}`;
        const end = `# contextory:end ${name}`;
        const start = text.indexOf(begin);
        const finish = text.indexOf(end);
        if (start >= 0 && finish < start)
          throw new ContextoryError(
            "INVALID_CONFIG",
            "Contextory configuration markers are incomplete.",
          );
        const stanza = `${begin}\n${stringify({ mcp_servers: { [name]: { command: config.command, args: config.args } } })}${end}\n`;
        let next: string;
        if (start >= 0)
          next =
            text.slice(0, start) +
            (remove ? "" : stanza) +
            text.slice(finish + end.length).replace(/^\r?\n/, "");
        else {
          if (
            (parsed.mcp_servers as Record<string, unknown> | undefined)?.[name]
          )
            throw new ContextoryError(
              "CONFIG_CONFLICT",
              "An unowned server uses the Contextory name; it was preserved.",
            );
          next = remove
            ? text
            : text + (text.endsWith("\n") || !text ? "" : "\n") + stanza;
        }
        parseToml(next.replace(/^\uFEFF/, ""));
        return next;
      },
    });
  } else {
    edits.push({
      path: mcpFile,
      transform: (text) => {
        const parsed = parse(text || "{}") as {
          mcpServers?: Record<string, { command?: string; args?: string[] }>;
        };
        const existing = parsed.mcpServers?.[name];
        if (
          existing &&
          (existing.command !== config.command ||
            existing.args?.[0] !== r.proxy)
        )
          throw new ContextoryError(
            "CONFIG_CONFLICT",
            "An unowned server uses the Contextory name; it was preserved.",
          );
        return remove && !existing
          ? text
          : jsonEdit(text, [
              {
                path: ["mcpServers", name],
                value: remove ? undefined : config,
              },
            ]);
      },
    });
  }
  const hooksFile = adapter.hooksPath ? join(r.root, adapter.hooksPath) : "";
  if (adapter.hooksPath) edits.push(hooksEdit(r, remove));
  const resources = skillEdits(r.root, r.provider, remove);
  edits.push(...resources);
  const changedFiles = await applyFiles(r.root, edits);
  return {
    name,
    changedFiles,
    connectionChanged:
      changedFiles.includes(mcpFile) ||
      Boolean(hooksFile && changedFiles.includes(hooksFile)),
    connectionFingerprint: createHash("sha256")
      .update(
        JSON.stringify({
          name,
          config,
          command,
          events: hookEvents(r.provider),
        }),
      )
      .digest("hex"),
    files: [
      mcpFile,
      ...(hooksFile ? [hooksFile] : []),
      ...resources.map((edit) => edit.path),
    ],
    instruction: remove
      ? "Owned Contextory entries removed. Reload native MCP configuration."
      : r.provider === "generic"
        ? "Generic MCP configuration is in .contextory/mcp.json. Import its server entry into your client. Portable skills are in .contextory/skills; install them in your client's skill discovery directory."
        : "Workspace MCP/hooks are ready. An existing native MCP connection retries workspace startup automatically for up to five minutes. If Contextory tools are missing from the native client, reload its MCP configuration. Hook status is confirmed only after an observed event; review native hook trust if hooks remain unobserved.",
  };
}
