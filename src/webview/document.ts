import { normalizeLanguage, translate } from "../i18n";

export function webviewDocument(options: {
  language?: string;
  script: string;
  stylesheet: string;
  cspSource: string;
  nonce: string;
  surface?: "sidebar" | "flow" | "relationships" | "architecture";
  workspaceName?: string;
  workspacePath?: string;
}): string {
  const { script, stylesheet, cspSource, nonce } = options;
  const attribute = (value = "") =>
    value.replace(
      /[&<>"']/g,
      (character) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[character]!,
    );
  const locale = normalizeLanguage(options.language);
  return `<!doctype html><html lang="${locale}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} data:; style-src ${cspSource}; script-src 'nonce-${nonce}'; connect-src 'none'; base-uri 'none'; form-action 'none';"><title>${translate("Contextory — Workspace Tasks", locale)}</title><link rel="stylesheet" href="${stylesheet}"></head><body data-surface="${options.surface ?? "sidebar"}" data-workspace-name="${attribute(options.workspaceName)}" data-workspace-path="${attribute(options.workspacePath)}"><div id="app"></div><script nonce="${nonce}" src="${script}"></script></body></html>`;
}
