import { rpc } from "../service/rpc";
import { normalizeHook } from "./observation";
import type { Provider } from "../contracts/model";
let input = "";
for await (const part of process.stdin) {
  input += part;
  if (input.length > 1024 * 1024) process.exit(0);
}
try {
  const raw = JSON.parse(input) as Record<string, unknown>;
  const provider = process.argv[3] as Provider;
  const observation = normalizeHook(raw, provider);
  const event = observation.event;
  const brief = await rpc<{ specs: unknown[]; note: string }>(
    process.argv[2],
    "hook",
    observation,
    450,
  );
  if (["SessionStart", "UserPromptSubmit"].includes(event)) {
    const context = `Contextory companion: ${brief.note}\nCurrent tracked specs: ${JSON.stringify(
      brief.specs.map((s: unknown) => {
        const spec = s as { id: string; title: string; state: string };
        return { id: spec.id, title: spec.title, state: spec.state };
      }),
    ).slice(
      0,
      4000,
    )}\nUse contextory_context_get for current contracts and decisions.${observation.nativeSession !== "unknown" ? ` When attaching this session, use nativeSessionId=${JSON.stringify(observation.nativeSession)} so native model/usage observations can be correlated with leased specs.` : ""} This reminder grants no permissions.`;
    if (provider === "bob") process.stdout.write(context + "\n");
    else
      process.stdout.write(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: event,
            additionalContext: context,
          },
        }) + "\n",
      );
  }
} catch {
  process.stderr.write(
    "Contextory observation unavailable; native work can continue. Open Contextory to reconnect.\n",
  );
}
