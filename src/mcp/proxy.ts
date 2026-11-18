import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "../service/rpc";
import { ContextoryError, version } from "../contracts/model";
import { agentInstructions } from "../agents/instructions";
import definitions from "contextory:tool-definitions";
import { WorkspaceReadiness } from "./readiness";
const descriptor = process.argv[2];
if (!descriptor)
  throw new Error("Contextory needs its workspace descriptor path.");
const shutdown = new AbortController();
process.stdin.once("end", () => shutdown.abort());
const readiness = new WorkspaceReadiness(async (timeoutMs) => {
  const catalog = await rpc<{ tools: unknown[] }>(
    descriptor,
    "tools/list",
    {},
    timeoutMs,
  );
  if (JSON.stringify(catalog.tools) !== JSON.stringify(definitions))
    throw new ContextoryError(
      "SERVICE_RESTART_REQUIRED",
      "Contextory's service and this native MCP connection expose different tool contracts. Run Contextory: Restart Agent Extensions and resume the chat. If it persists, close this project's editors for 65 seconds and reopen them.",
    );
}, shutdown.signal);
let observing = false;
function observeWorkspace() {
  if (observing || shutdown.signal.aborted) return;
  observing = true;
  void readiness
    .observe()
    .catch((error: Error) => {
      if (!shutdown.signal.aborted)
        process.stderr.write(
          (error as { code?: string }).code === "SERVICE_RESTART_REQUIRED"
            ? `${error.message}\n`
            : "Contextory workspace service was not ready after five minutes. Tools remain registered; check Contextory output and retry.\n",
        );
    })
    .finally(() => {
      observing = false;
    });
}
const server = new Server(
  { name: "contextory-companion", version },
  {
    capabilities: { tools: {} },
    instructions: agentInstructions,
  },
);
server.onclose = () => shutdown.abort();
server.setRequestHandler(ListToolsRequestSchema, () => {
  // Native clients may start before the editor's service. Keep discovery usable
  // during that race; only the read-only handshake retries, never a mutation.
  observeWorkspace();
  return { tools: definitions };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    observeWorkspace();
    await readiness.wait();
    const release =
      request.params.name.startsWith("contextory_release") ||
      request.params.name === "contextory_version_get";
    const result = await rpc(
      descriptor,
      "tools/call",
      request.params,
      release ? 300000 : 120000,
    );
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify({
            code: (error as { code?: string }).code ?? "SERVICE_UNAVAILABLE",
            message:
              error instanceof Error ? error.message : "Contextory unavailable",
          }),
        },
      ],
    };
  }
});
await server.connect(new StdioServerTransport());
