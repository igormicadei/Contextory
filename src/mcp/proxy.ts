import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "../service/rpc";
import { version } from "../contracts/model";
import { agentInstructions } from "../agents/instructions";
import definitions from "contextory:tool-definitions";
import { setTimeout as delay } from "node:timers/promises";
const descriptor = process.argv[2];
if (!descriptor)
  throw new Error("Contextory needs its workspace descriptor path.");
const shutdown = new AbortController();
process.stdin.once("end", () => shutdown.abort());
let readiness: Promise<void> | undefined;
function waitForWorkspace(): Promise<void> {
  return (readiness ??= (async () => {
    const deadline = Date.now() + 15000;
    let pause = 100;
    while (!shutdown.signal.aborted) {
      try {
        await rpc(
          descriptor,
          "tools/list",
          {},
          Math.min(1000, Math.max(1, deadline - Date.now())),
        );
        return;
      } catch (error) {
        if (Date.now() >= deadline) throw error;
        await delay(Math.min(pause, deadline - Date.now()), undefined, {
          signal: shutdown.signal,
        });
        pause = Math.min(1000, pause * 2);
      }
    }
    throw new Error("Native MCP connection closed.");
  })().catch((error) => {
    readiness = undefined;
    throw error;
  }));
}
const server = new Server(
  { name: "contextory-companion", version },
  {
    capabilities: { tools: {} },
    instructions: agentInstructions,
  },
);
server.setRequestHandler(ListToolsRequestSchema, () => {
  // Native clients may start before the editor's service. Keep discovery usable
  // during that race; only the read-only handshake retries, never a mutation.
  void waitForWorkspace().catch(() => {
    if (!shutdown.signal.aborted)
      process.stderr.write(
        "Contextory workspace service is still starting. Tools remain registered; retry after workspace startup.\n",
      );
  });
  return { tools: definitions };
});
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    await waitForWorkspace();
    const result = await rpc(descriptor, "tools/call", request.params, 120000);
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    readiness = undefined;
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
