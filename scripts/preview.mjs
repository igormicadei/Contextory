import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
const root = fileURLToPath(new URL("../", import.meta.url));
const portIndex = process.argv.indexOf("--port");
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4317;
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Use a port from 1024 to 65535.");
const routes = new Map([
  ["/fixture.js", ["tests/ui/fixture.mjs", "text/javascript"]],
  ["/webview.js", ["dist/webview.js", "text/javascript"]],
  ["/sidebar.css", ["media/sidebar.css", "text/css"]],
]);
createServer(async (request, response) => {
  response.setHeader("cache-control", "no-store");
  response.setHeader("x-content-type-options", "nosniff");
  const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
  try {
    if (
      path === "/" ||
      path === "/sidebar.html" ||
      path === "/flow.html" ||
      path === "/relationships.html"
    ) {
      const nonce = randomBytes(24).toString("hex");
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(
        `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'self'; script-src 'nonce-${nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none'"><title>Relay companion preview</title><link rel="stylesheet" href="/sidebar.css"></head><body data-surface="${path === "/flow.html" ? "flow" : path === "/relationships.html" ? "relationships" : "sidebar"}"><div id="app"></div><script nonce="${nonce}" src="/fixture.js"></script><script nonce="${nonce}" src="/webview.js"></script></body></html>`,
      );
      return;
    }
    const route = routes.get(path);
    if (!route) {
      response.writeHead(404).end();
      return;
    }
    response.setHeader("content-type", route[1]);
    response.end(await readFile(join(root, route[0])));
  } catch {
    response.writeHead(503).end("Run npm run build first.");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Relay preview: http://127.0.0.1:${port}`),
);
