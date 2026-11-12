import type { SourceRef } from "../contracts/model";
export const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export const button = (
  action: string,
  label: string,
  attributes = "",
  className = "",
) =>
  `<button type="button" data-action="${action}" ${attributes} class="${className}">${label}</button>`;
export const badge = (state: string) =>
  `<span class="badge ${escape(state)}">${escape(state.replaceAll("_", " "))}</span>`;
export const sourceButton = (source: SourceRef) =>
  button(
    "source",
    `${escape(source.path)}${source.line !== undefined ? `:${source.line + 1}` : ""}${source.symbol ? ` #${escape(source.symbol)}` : ""}`,
    `data-source="${escape(JSON.stringify(source))}"`,
    "source-link",
  );
