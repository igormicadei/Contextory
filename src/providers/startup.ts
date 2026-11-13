import type { Connection, Provider } from "../contracts/model";

export type StartupAgent = Provider | "last-used" | "none";
export interface RememberedAgent {
  provider: Provider;
  at: number;
}

export function latestNativeAgent(
  connections: Connection[],
): RememberedAgent | undefined {
  let latest: RememberedAgent | undefined;
  for (const connection of connections) {
    if (!connection.configured) continue;
    const at = Math.max(
      Date.parse(connection.mcpSeen ?? "") || 0,
      Date.parse(connection.hookSeen ?? "") || 0,
    );
    if (at && (!latest || at > latest.at))
      latest = { provider: connection.provider, at };
  }
  return latest;
}

export function startupProvider(options: {
  preference: StartupAgent;
  workspace?: RememberedAgent;
  global?: RememberedAgent;
  connections: Connection[];
  disabled: Provider[];
}): Provider | undefined {
  if (options.preference === "none") return;
  const observed = latestNativeAgent(options.connections);
  const local =
    observed && (!options.workspace || observed.at > options.workspace.at)
      ? observed
      : options.workspace;
  const provider =
    options.preference === "last-used"
      ? (local ?? options.global)?.provider
      : options.preference;
  return provider &&
    ["codex", "claude", "bob"].includes(provider) &&
    !options.disabled.includes(provider)
    ? provider
    : undefined;
}
