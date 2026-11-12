import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "../service/rpc";
import { version } from "../contracts/model";
const descriptor = process.argv[2];
if (!descriptor) throw new Error("Relay needs its workspace descriptor path.");
const server = new Server(
  { name: "relay-companion", version },
  {
    capabilities: { tools: {} },
    instructions:
      "Keep conversation in your native chat. Relay stores requests, milestones, specs, issues, fixes, decisions and evidence. Read relay_context_get before tracked implementation. Ordinary questions do not create work. Use relay_search for earlier changes/decisions and relay_flow_trace for affected Python/TS/JS calls and branches. Claim a spec lease, record explanations, run independent checks and submit an outcome. Then call relay_spec_change action=complete with the returned revision and a new operationId; confirm state=completed. Submission alone leaves the spec open. Resolve or explicitly report completion blockers, including missing configured checks. Parent milestones/requests close automatically. Export reports with relay_report_export and requestId. Relay owns no native chat history or agent dispatch. Native permissions and user scope always apply.",
  },
);
server.setRequestHandler(ListToolsRequestSchema, () =>
  rpc(descriptor, "tools/list"),
);
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await rpc(descriptor, "tools/call", request.params, 120000);
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
              error instanceof Error ? error.message : "Relay unavailable",
          }),
        },
      ],
    };
  }
});
await server.connect(new StdioServerTransport());
