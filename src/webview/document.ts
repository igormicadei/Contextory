export function webviewDocument(options: { script: string; stylesheet: string; cspSource: string; nonce: string }): string {
  const { script, stylesheet, cspSource, nonce } = options;
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource}; script-src 'nonce-${nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none';"><title>Relay — Workspace Tasks</title><link rel="stylesheet" href="${stylesheet}"></head><body><div id="app"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
}
