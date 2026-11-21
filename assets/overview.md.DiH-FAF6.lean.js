import { _ as _export_sfc, C as resolveComponent, o as openBlock, c as createElementBlock, a2 as createStaticVNode, b as createBlock, w as withCtx, a as createTextVNode, E as createVNode, a3 as Suspense } from "./chunks/framework.jTK6_58R.js";
const _imports_0 = "/Contextory/media/contextory-icon.png";
const _imports_1 = "/Contextory/artifacts/companion-sidebar.png";
const __pageData = JSON.parse('{"title":"Contextory","description":"","frontmatter":{},"headers":[],"relativePath":"overview.md","filePath":"overview.md"}');
const _sfc_main = { name: "overview.md" };
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  const _component_Mermaid = resolveComponent("Mermaid");
  return openBlock(), createElementBlock("div", null, [
    _cache[1] || (_cache[1] = createStaticVNode("", 25)),
    (openBlock(), createBlock(Suspense, null, {
      default: withCtx(() => [
        createVNode(_component_Mermaid, {
          id: "mermaid-242",
          class: "mermaid",
          graph: "flowchart%20LR%0A%20%20Developer%20%3C--%3E%20Chat%5BNative%20agent%20chat%5D%0A%20%20Chat%20%3C--%3E%20MCP%5BContextory%20MCP%20tools%5D%0A%20%20Chat%20--%3E%20Hooks%5BLifecycle%20observations%5D%0A%20%20MCP%20%3C--%3E%20Service%5BLocal%20workspace%20service%5D%0A%20%20Hooks%20--%3E%20Service%0A%20%20Sidebar%5BContextory%20sidebar%20and%20workbench%20views%5D%20%3C--%3E%20Service%0A%20%20Service%20%3C--%3E%20Records%5B(SQLite%20records%2C%20search%20and%20relationships)%5D%0A%20%20Service%20--%3E%20Analysis%5BSource%20analysis%20and%20configured%20checks%5D%0A"
        })
      ]),
      fallback: withCtx(() => [..._cache[0] || (_cache[0] = [
        createTextVNode(" Loading... ", -1)
      ])]),
      _: 1
    })),
    _cache[2] || (_cache[2] = createStaticVNode("", 23))
  ]);
}
const overview = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render]]);
export {
  __pageData,
  overview as default
};
