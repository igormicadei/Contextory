import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { rpc } from "../service/rpc";
import { version } from "../contracts/model";
const descriptor = process.argv[2];
if (!descriptor) throw new Error("Contextory needs its workspace descriptor path.");
const server = new Server(
  { name: "contextory-companion", version },
  {
    capabilities: { tools: {} },
    instructions:
      "Keep conversation in your native chat. Contextory stores requests, milestones, specs, issues, fixes, decisions and evidence. Read contextory_context_get before tracked implementation. Ordinary questions do not create work. Use contextory_search for earlier changes/decisions and contextory_flow_trace for affected Python/TS/JS calls and branches. Claim a spec lease, record explanations, run independent checks and submit an outcome. Then call contextory_spec_change action=complete with the returned revision and a new operationId; confirm state=completed. Submission alone leaves the spec open. Resolve or explicitly report completion blockers, including missing configured checks. Parent milestones/requests close automatically. Export reports with contextory_report_export and requestId. Contextory owns no native chat history or agent dispatch. Native permissions and user scope always apply.",
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
              error instanceof Error ? error.message : "Contextory unavailable",
          }),
        },
      ],
    };
  }
});
await server.connect(new StdioServerTransport());
