export const clients = {
  codex: {
    label: "Codex",
    extensions: ["openai.chatgpt"],
    hostPattern: "",
    mcpPath: ".codex/config.toml",
    mcpFormat: "toml",
    hooksPath: ".codex/hooks.json",
    skillsPath: ".agents/skills",
    contextFormat: "structured",
    extraEvents: ["PostModelRequest"],
  },
  claude: {
    label: "Claude Code",
    extensions: ["anthropic.claude-code"],
    hostPattern: "",
    mcpPath: ".mcp.json",
    mcpFormat: "json",
    hooksPath: ".claude/settings.local.json",
    skillsPath: ".claude/skills",
    contextFormat: "structured",
    extraEvents: ["PostModelSwitch"],
  },
  bob: {
    label: "IBM Bob",
    extensions: ["ibm.bob-code"],
    hostPattern: "\\bbob\\b",
    mcpPath: ".bob/mcp.json",
    mcpFormat: "json",
    hooksPath: ".bob/settings.json",
    skillsPath: ".bob/skills",
    contextFormat: "plain",
    extraEvents: [],
  },
  generic: {
    label: "Generic MCP",
    extensions: [],
    hostPattern: "",
    mcpPath: ".contextory/mcp.json",
    mcpFormat: "json",
    hooksPath: "",
    skillsPath: ".contextory/skills",
    contextFormat: "none",
    extraEvents: [],
  },
} as const;
export type ClientId = keyof typeof clients;
export const clientIds = Object.keys(clients) as ClientId[];
export const nativeClientIds = clientIds.filter((id) => id !== "generic");
export const isClient = (value: string): value is ClientId =>
  Object.hasOwn(clients, value);
export const hookEvents = (id: ClientId) =>
  clients[id].hooksPath
    ? [
        "SessionStart",
        "UserPromptSubmit",
        "PreToolUse",
        "PostToolUse",
        "PreCompact",
        "PostCompact",
        "Stop",
        ...clients[id].extraEvents,
      ]
    : [];
