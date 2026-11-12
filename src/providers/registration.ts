import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import {
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join, relative, isAbsolute } from "node:path";
import { parse as parseToml, stringify } from "smol-toml";
import { parse, modify, applyEdits, type ParseError } from "jsonc-parser";
import { RelayError, type Provider } from "../contracts/model";
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
  return `relay_companion_${createHash("sha256")
    .update(process.platform === "win32" ? canonical.toLowerCase() : canonical)
    .digest("hex")
    .slice(0, 12)}`;
}
function quote(value: string) {
  if (process.platform === "win32") {
    if (/["%!\r\n]/.test(value))
      throw new RelayError(
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
    throw new RelayError(
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
      throw new RelayError(
        "LINKED_CONFIG",
        "Linked provider configuration is preserved; use regular workspace directories.",
      );
    if (stat && (current === path ? !stat.isFile() : !stat.isDirectory()))
      throw new RelayError(
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
    const temp = `${edit.path}.relay-${process.pid}-${Date.now()}.tmp`;
    try {
      await writeFile(temp, value, { flag: "wx", mode: 0o600 });
      await rename(temp, edit.path);
    } finally {
      await unlink(temp).catch(() => {});
    }
  };
  try {
    for (const edit of prepared) {
      if ((await inspect(root, edit.path)) !== edit.original)
        throw new RelayError(
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
}
function jsonEdit(text: string, changes: { path: string[]; value: unknown }[]) {
  let next = text || "{}\n";
  const errors: ParseError[] = [];
  parse(next, errors, { allowTrailingComma: true });
  if (errors.length)
    throw new RelayError(
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
const skill = `---
name: relay-workflow
description: Track authorized software implementation in the connected Relay companion. Use for requests, milestones, specs, issues, design decisions, evidence and continuing tracked work; ordinary questions need no new request.
---
<!-- relay-managed-workflow -->
Keep conversation and editing in this native agent. Read relay_context_get before tracked implementation. Use relay_search to recover earlier requests, changes and decisions, relay_impact_get for relationships and relay_flow_trace for affected Python/TS/JS source calls and branches. These tools are part of implementation, even if the user never opens search or Code map.
Create/update the authorized request, milestones and specs through Relay MCP. Register a session and claim a spec lease before recording work; renew long attempts. Preserve user scope and native permissions. Record issues, their impact and fixes with relay_finding_record; record concise choices, rationale and tradeoffs with relay_decision_record. Run configured relay_check_run recipes for independent evidence and poll the returned job with relay_entity_get. External results remain reported evidence.
When finished, submit relay_outcome_submit explaining changes, issues, decisions, validation and remaining limits; map every criterion to evidence. THEN call relay_spec_change with action=complete, id=specId, expectedRevision=the returned revision and a new operationId. Confirm state=completed. Outcome submission alone does not mark a spec done. Completion validates current evidence and resolved issues. If no recipes exist, configure the project's existing test/check command in relay.checks workspace settings using native editing, then reread context. If blocked, resolve the blocker or explicitly tell the user what is pending. Never silently leave finished work open, claim unperformed verification or grant yourself approval for new scope. Milestones and requests close automatically when all their children complete. Use relay_report_export with requestId for the complete request report.
`;
export async function configureProvider(r: Registration, remove = false) {
  r = { ...r, root: await realpath(r.root) };
  const edits: Edit[] = [];
  const name = registrationName(r.root);
  const config = {
    type: "stdio",
    command: r.node,
    args: [r.proxy, r.descriptor],
  };
  const command = hookCommand(r);
  const mcpFile =
    r.provider === "codex"
      ? join(r.root, ".codex/config.toml")
      : r.provider === "claude"
        ? join(r.root, ".mcp.json")
        : join(r.root, ".bob/mcp.json");
  if (r.provider === "codex") {
    edits.push({
      path: mcpFile,
      transform: (text) => {
        const parsed = parseToml(text.replace(/^\uFEFF/, ""));
        const begin = `# relay:begin ${name}`;
        const end = `# relay:end ${name}`;
        const start = text.indexOf(begin);
        const finish = text.indexOf(end);
        if (start >= 0 && finish < start)
          throw new RelayError(
            "INVALID_CONFIG",
            "Relay configuration markers are incomplete.",
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
            throw new RelayError(
              "CONFIG_CONFLICT",
              "An unowned server uses the Relay name; it was preserved.",
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
          throw new RelayError(
            "CONFIG_CONFLICT",
            "An unowned server uses the Relay name; it was preserved.",
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
  const hooksFile = join(
    r.root,
    r.provider === "codex"
      ? ".codex/hooks.json"
      : r.provider === "claude"
        ? ".claude/settings.local.json"
        : ".bob/settings.json",
  );
  edits.push({
    path: hooksFile,
    transform: (text) => {
      const parsed = parse(text || "{}") as {
        hooks?: Record<
          string,
          { matcher?: string; hooks?: { command?: string }[] }[]
        >;
      };
      const changes: { path: string[]; value: unknown }[] = [];
      for (const event of [
        "SessionStart",
        "UserPromptSubmit",
        "PreToolUse",
        "PostToolUse",
        "PreCompact",
        "PostCompact",
        "Stop",
      ]) {
        const rows = parsed.hooks?.[event] ?? [];
        if (!Array.isArray(rows))
          throw new RelayError(
            "INVALID_CONFIG",
            `Existing ${event} hooks must be an array; configuration was preserved.`,
          );
        const preserved = rows.flatMap((row) => {
          if (!row || !Array.isArray(row.hooks)) return [row];
          const hooks = row.hooks.filter((hook) => hook.command !== command);
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
              { type: "command", command, timeout: 2 } as { command: string },
            ],
          });
        changes.push({
          path: ["hooks", event],
          value: preserved.length ? preserved : undefined,
        });
      }
      return jsonEdit(text, changes);
    },
  });
  const skillFile = join(
    r.root,
    r.provider === "codex"
      ? ".agents/skills/relay-workflow/SKILL.md"
      : r.provider === "claude"
        ? ".claude/skills/relay-workflow/SKILL.md"
        : ".bob/skills/relay-workflow/SKILL.md",
  );
  edits.push({
    path: skillFile,
    transform: (text) => {
      if (text && !text.includes("<!-- relay-managed-workflow -->"))
        throw new RelayError(
          "CONFIG_CONFLICT",
          "An existing relay-workflow skill is unowned and was preserved.",
        );
      return remove ? undefined : skill;
    },
  });
  await applyFiles(r.root, edits);
  return {
    name,
    files: [mcpFile, hooksFile, skillFile],
    instruction: remove
      ? "Owned Relay entries removed. Reload native MCP configuration."
      : "Reload native MCP configuration and review/trust the Relay hooks in the native client. Keep chatting there; Relay will display project records. Hook visibility becomes confirmed after an observed event.",
  };
}
