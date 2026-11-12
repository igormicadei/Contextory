import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? Number(process.argv[portIndex + 1]) : 4317;
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Use a port from 1024 to 65535.');
const routes = new Map([
  ['/', ['preview/index.html', 'text/html; charset=utf-8']],
  ['/preview.css', ['preview/preview.css', 'text/css; charset=utf-8']],
  ['/preview.js', ['preview/preview.js', 'text/javascript; charset=utf-8']],
  ['/webview.js', ['dist/webview.js', 'text/javascript; charset=utf-8']],
  ['/sidebar.css', ['media/sidebar.css', 'text/css; charset=utf-8']],
  ['/plan', ['docs/PLAN.md', 'text/plain; charset=utf-8']]
]);
const server = createServer(async (req, res) => {
  // Explicit allowlist: never serve arbitrary workspace files, even with encoded traversal.
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    if (pathname === '/sidebar.html') {
      const nonce = randomBytes(24).toString('hex');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'self'; script-src 'nonce-${nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none';"><title>Relay Sidebar Preview</title><link rel="stylesheet" href="/sidebar.css"></head><body><div id="app"></div><script nonce="${nonce}" src="/webview.js"></script></body></html>`);
      return;
    }
    const route = routes.get(pathname);
    if (!route) { res.writeHead(404); res.end('Not found'); return; }
    const content = await readFile(join(root, route[0]));
    res.setHeader('Content-Type', route[1]);
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'");
    res.end(content);
  } catch { res.writeHead(503); res.end('Preview assets unavailable. Run npm run build first.'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Relay preview: http://127.0.0.1:${port}`));
