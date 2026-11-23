import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fixture } from "../helpers";
import { rpc } from "../../src/service/rpc";

test("a slow operation reports a request timeout while service health remains available", async (t) => {
  const f = await fixture(t);
  const server = createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const { method } = JSON.parse(body);
    if (method === "slow") return;
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ result: { healthy: true } }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  f.cleanups.push(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
  const address = server.address() as { port: number };
  const descriptor = join(f.storage, "ui.json");
  await writeFile(
    descriptor,
    JSON.stringify({
      schema: 1,
      url: `http://127.0.0.1:${address.port}/rpc`,
      token: "0".repeat(64),
      root: f.root,
      role: "ui",
      instance: "test",
    }),
  );
  await assert.rejects(rpc(descriptor, "slow", {}, 40), {
    code: "REQUEST_TIMEOUT",
  });
  assert.deepEqual(await rpc(descriptor, "health", {}, 1000), {
    healthy: true,
  });
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  await assert.rejects(rpc(descriptor, "health", {}, 1000), {
    code: "SERVICE_UNAVAILABLE",
  });
});
