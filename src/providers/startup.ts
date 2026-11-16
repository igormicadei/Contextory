import type { Connection, Provider } from "../contracts/model";
import { clients, nativeClientIds } from "./clients";

export type StartupAgent = Provider | "auto" | "last-used" | "none";

export function detectedProviders(
  host: string,
  extensionIds: readonly string[],
): Provider[] {
  const installed = new Set(extensionIds.map((id) => id.toLowerCase()));
  return nativeClientIds.filter(
    (id) =>
      clients[id].extensions.some((extension) => installed.has(extension)) ||
      Boolean(
        clients[id].hostPattern &&
          new RegExp(clients[id].hostPattern, "i").test(host),
      ),
  );
}
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

export function startupProviders(options: {
  preference: StartupAgent;
  enabled: boolean;
  detected: Provider[];
  workspace?: RememberedAgent;
  global?: RememberedAgent;
  connections: Connection[];
  disabled: Provider[];
}): Provider[] {
  if (!options.enabled || options.preference === "none") return [];
  if (options.preference === "auto")
    return [...new Set(options.detected)].filter(
      (provider) => !options.disabled.includes(provider),
    );
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
    ? [provider]
    : [];
}
