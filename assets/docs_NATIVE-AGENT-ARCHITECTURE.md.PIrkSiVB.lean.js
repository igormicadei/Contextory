import { _ as _export_sfc, C as resolveComponent, o as openBlock, c as createElementBlock, a2 as createStaticVNode, b as createBlock, w as withCtx, a as createTextVNode, E as createVNode, a3 as Suspense } from "./chunks/framework.jTK6_58R.js";
const __pageData = JSON.parse('{"title":"Native-agent companion architecture","description":"","frontmatter":{},"headers":[],"relativePath":"docs/NATIVE-AGENT-ARCHITECTURE.md","filePath":"docs/NATIVE-AGENT-ARCHITECTURE.md"}');
const _sfc_main = { name: "docs/NATIVE-AGENT-ARCHITECTURE.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  return openBlock(), createElementBlock("div", null, [
    _cache[1] || (_cache[1] = createStaticVNode("", 12)),
    (openBlock(), createBlock(Suspense, null, {
      default: withCtx(() => [
        createVNode(_component_Mermaid, {
          id: "mermaid-36",
          class: "mermaid",
          graph: "flowchart%20LR%0A%20%20User%5BDeveloper%5D%20%3C--%3E%20Native%5BNative%20agent%20chat%5D%0A%20%20Native%20%3C--%3E%20MCP%5BStdio%20MCP%20proxy%5D%0A%20%20Native%20--%3E%20Hooks%5BAdvisory%20hook%20launcher%5D%0A%20%20MCP%20%3C--%3E%20Service%5BWorkspace%20service%20-%20Node%2024%5D%0A%20%20Hooks%20%3C--%3E%20Service%0A%20%20UI%5BSidebar%20and%20source-flow%20panel%5D%20%3C--%3E%20Host%5BExtension%20host%5D%0A%20%20Host%20%3C--%3E%20Service%0A%20%20Service%20%3C--%3E%20DB%5B(SQLite%20ledger%2C%20FTS%2C%20vectors%2C%20edges)%5D%0A%20%20Service%20%3C--%3E%20Worker%5BLazy%20TypeScript%20analysis%20worker%5D%0A%20%20Service%20%3C--%3E%20Python%5BIsolated%20Python%20AST%20process%5D%0A%20%20Service%20--%3E%20Checks%5BNamed%20check%20processes%5D%0A%20%20Host%20%3C--%3E%20LSP%5BEditor%20call%20hierarchy%5D%0A"
        })
      ]),
      fallback: withCtx(() => [..._cache[0] || (_cache[0] = [
        createTextVNode(" Loading... ", -1)
      ])]),
      _: 1
    })),
    _cache[2] || (_cache[2] = createStaticVNode("", 39))
  ]);
}
const NATIVEAGENTARCHITECTURE = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  NATIVEAGENTARCHITECTURE as default
};
