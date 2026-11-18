import { realpath, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "jsonc-parser";
import { randomUUID } from "node:crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { startService } from "./service/server";
import { rpc, readDescriptor } from "./service/rpc";
import {
  toolDefinitions,
  scopedCodeTools,
  type ToolName,
} from "./contracts/tools";
import { ContextoryError, version } from "./contracts/model";
import { agentInstructions } from "./agents/instructions";

const help = `Contextory ${version} (Node.js 24+)
Usage: node dist/contextory.mjs <command> [arguments] [options]
  index                     Refresh source knowledge
  context <task or symbol>  Retrieve budgeted task context
  impact <source or record> Inspect related source and work records
  path <from> <to>          Find a relationship path
  architecture             Summarize subsystems and entry points
  import <workspace.json>  Import a Graphify graph
  references               List isolated reference codebases
  reference-add <folder>   Register a local reference (optional --name)
  reference-remove <id>    Detach a reference, leaving its source untouched
  versions [release-id]    Current project version, commits and release history
  release-prepare [bump]   Plan auto/patch/minor/major or an exact stable version
  release-apply <id> <rev> Create the planned version commit and annotated tag
  release-publish <id> <rev> Publish only that tag using configured Git auth
  release-recover <id> <rev> Resume an owned interrupted release
  release-cancel <id> <rev> Cancel an untouched release plan
  mcp                      Serve the same tools over stdio until EOF
Options: --root <workspace> --storage <directory> --descriptor <generic.json>
         --budget <512..6000> --depth <1..10> --python <executable>
         --codebase <reference-id> --name <reference-name>
         --offset <n> --limit <1..50> --operation <id> (durable release retries)
Source commands default to the current project. --codebase selects a reference;
paths and citations are relative to its root. Registration never changes source.
Default storage: <root>/.contextory-local/service. Use --descriptor to attach
to an editor service and share its records. No editor or hooks are required.
Workspace checks from .vscode/settings.json run only when explicitly requested
through the workflow tools; indexing parses source without executing modules.
`;
const options = new Map<string, string>(),
  positional: string[] = [];
const allowed = new Set([
  "root",
  "storage",
  "descriptor",
  "budget",
  "depth",
  "python",
  "codebase",
  "name",
  "offset",
  "limit",
  "operation",
]);
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg.startsWith("--")) {
    if (arg === "--help") {
      positional[0] = "help";
      break;
    }
    const key = arg.slice(2),
      value = process.argv[++i];
    if (!allowed.has(key) || !value || value.startsWith("--"))
      throw new Error(`Invalid option ${arg}. Use --help.`);
    options.set(key, value);
  } else positional.push(arg);
}
const [command = "help", ...args] = positional;
let owned: Awaited<ReturnType<typeof startService>> | undefined;
let connecting: Promise<string> | undefined;
let closing = false;
async function close() {
  closing = true;
  await connecting?.catch(() => {});
  await owned?.close();
}
async function connect(): Promise<string> {
  if (closing) throw new ContextoryError("CANCELLED", "Contextory is closing.");
  if (connecting) return connecting;
  connecting = (async () => {
    const root = await realpath(resolve(options.get("root") ?? process.cwd()));
    const supplied = options.get("descriptor");
    if (supplied) {
      const descriptor = resolve(supplied),
        info = await readDescriptor(descriptor);
      if ((await realpath(info.root)) !== root)
        throw new ContextoryError(
          "WORKSPACE_MISMATCH",
          "Descriptor belongs to a different workspace.",
        );
      if (info.role !== "generic")
        throw new ContextoryError(
          "INVALID_DESCRIPTOR",
          "Use the generic MCP descriptor.",
        );
      await rpc(descriptor, "health");
      return descriptor;
    }
    const storage = resolve(
      options.get("storage") ?? join(root, ".contextory-local/service"),
    );
    const descriptor = join(storage, "generic.json");
    try {
      const dist = dirname(fileURLToPath(import.meta.url));
      owned = await startService({
        root,
        storage,
        workerPath: join(dist, "analysis-worker.mjs"),
        embeddingDirectory: join(root, ".contextory-local/embeddings"),
        headless: true,
      });
      const settings =
        parse(
          await readFile(join(root, ".vscode/settings.json"), "utf8").catch(
            () => "{}",
          ),
        ) ?? {};
      await rpc(join(storage, "ui.json"), "configure", {
        recipes: settings["contextory.checks"] ?? [],
        pythonExecutable:
          options.get("python") ??
          settings["contextory.pythonExecutable"] ??
          "python",
      });
    } catch (error) {
      if ((error as { code?: string }).code !== "SERVICE_BUSY") throw error;
      const info = await readDescriptor(descriptor);
      if ((await realpath(info.root)) !== root)
        throw new ContextoryError(
          "WORKSPACE_MISMATCH",
          "Storage belongs to a different workspace.",
        );
      await rpc(descriptor, "health");
    }
    return descriptor;
  })();
  try {
    return await connecting;
  } catch (error) {
    connecting = undefined;
    throw error;
  }
}
async function call(name: string, arguments_: unknown) {
  const descriptor = await connect();
  const scoped = scopedCodeTools.includes(name as ToolName);
  if (
    (options.has("codebase") && name.startsWith("contextory_release")) ||
    (options.has("codebase") && name === "contextory_version_get")
  )
    throw new Error(
      "Project versions belong to the active repository; omit --codebase.",
    );
  return rpc(
    descriptor,
    "tools/call",
    {
      name,
      arguments: {
        ...(arguments_ as object),
        ...(scoped && options.has("codebase")
          ? { codebaseId: options.get("codebase") }
          : {}),
      },
    },
    name.startsWith("contextory_release") || name === "contextory_version_get"
      ? 300000
      : 180000,
  );
}
const required = (i: number) => {
  if (!args[i]) throw new Error(`Missing argument for ${command}. Use --help.`);
  return args[i];
};
async function main() {
  if (command === "help") {
    process.stdout.write(help);
    return;
  }
  if (command === "mcp") {
    const server = new Server(
      { name: "contextory-companion", version },
      {
        capabilities: { tools: {} },
        instructions: agentInstructions,
      },
    );
    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: toolDefinitions(),
    }));
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                await call(request.params.name, request.params.arguments ?? {}),
              ),
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({
                code: (error as { code?: string }).code ?? "ERROR",
                message: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    });
    const transport = new StdioServerTransport();
    transport.onclose = () => {
      void close();
    };
    process.stdin.once("end", () => {
      void server.close().finally(close);
    });
    process.once("SIGINT", () => {
      void server.close().finally(close);
    });
    process.once("SIGTERM", () => {
      void server.close().finally(close);
    });
    await server.connect(transport);
    return;
  }
  let result: unknown;
  try {
    switch (command) {
      case "versions":
        result = await call("contextory_version_get", {
          releaseId: args[0],
          offset: Number(options.get("offset") ?? 0),
          limit: Number(options.get("limit") ?? 20),
        });
        break;
      case "release-prepare": {
        const value = args[0] ?? "auto";
        result = await call("contextory_release_prepare", {
          operationId: options.get("operation") ?? randomUUID(),
          ...(["auto", "patch", "minor", "major"].includes(value)
            ? { bump: value }
            : { version: value }),
        });
        break;
      }
      case "release-apply":
      case "release-publish":
      case "release-recover":
      case "release-cancel":
        result = await call("contextory_release_change", {
          operationId: options.get("operation") ?? randomUUID(),
          id: required(0),
          expectedRevision: Number(required(1)),
          action: command.slice("release-".length),
        });
        break;
      case "references":
        result = await call("contextory_codebase_list", {});
        break;
      case "reference-add":
        result = await call("contextory_codebase_change", {
          action: "add",
          root: resolve(required(0)),
          name: options.get("name"),
          operationId: randomUUID(),
        });
        break;
      case "reference-remove":
        result = await call("contextory_codebase_change", {
          action: "remove",
          codebaseId: required(0),
          operationId: randomUUID(),
        });
        break;
      case "index":
        result = await call("contextory_code_index_refresh", {});
        break;
      case "context":
        result = await call("contextory_code_context_get", {
          query: args.join(" ") || required(0),
          budgetTokens: Number(options.get("budget") ?? 4000),
        });
        break;
      case "impact":
        result = await call("contextory_impact_get", {
          id: required(0),
          depth: Number(options.get("depth") ?? 2),
        });
        break;
      case "path":
        result = await call("contextory_code_path_get", {
          from: required(0),
          to: required(1),
          maxDepth: Number(options.get("depth") ?? 6),
        });
        break;
      case "architecture":
        result = await call("contextory_code_architecture_get", {
          refresh: true,
        });
        break;
      case "import":
        result = await call("contextory_code_index_refresh", {
          graphifyPath: required(0),
        });
        break;
      default:
        throw new Error(`Unknown command ${command}. Use --help.`);
    }
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } finally {
    await close();
  }
}
await main().catch(async (error) => {
  process.stderr.write(
    (error instanceof Error ? error.message : String(error)) + "\n",
  );
  process.exitCode = 1;
  await close();
});
