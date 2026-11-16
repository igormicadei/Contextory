import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";
import { readdirSync } from "node:fs";
const releases = readdirSync(new URL("../../docs/releases/", import.meta.url))
  .filter((f) => f.endsWith(".md"))
  .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
export default withMermaid(
  defineConfig({
    title: "Contextory",
    description:
      "Manage requests. Give agents the full picture. Complete documentation for Contextory 0.3.0.",
    lang: "en-US",
    base: "/Contextory/",
    srcDir: "../.contextory-local/docs-content",
    outDir: "../.contextory-local/docs-site",
    cacheDir: "../.contextory-local/docs-cache",
    cleanUrls: false,
    lastUpdated: false,
    vite: { esbuild: { charset: "ascii" } },
    head: [
      ["link", { rel: "icon", href: "/Contextory/media/contextory-icon.png" }],
    ],
    sitemap: { hostname: "https://igormicadei.github.io/Contextory/" },
    themeConfig: {
      logo: "/media/contextory-icon.png",
      nav: [
        { text: "Guide", link: "/docs/USER-GUIDE" },
        { text: "Code intelligence", link: "/docs/CODEBASE-INTELLIGENCE" },
        { text: "MCP tools", link: "/docs/MCP-TOOLS" },
        { text: "v0.3.0", link: "/docs/releases/v0.3.0" },
      ],
      search: { provider: "local" },
      socialLinks: [
        { icon: "github", link: "https://github.com/igormicadei/Contextory" },
      ],
      outline: { level: [2, 3] },
      editLink: {
        pattern: ({ relativePath }) =>
          `https://github.com/igormicadei/Contextory/edit/main/${relativePath === "overview.md" ? "README.md" : relativePath === "changelog.md" ? "CHANGELOG.md" : relativePath === "index.md" ? "docs-site/index.md" : relativePath}`,
        text: "Edit this page on GitHub",
      },
      sidebar: [
        {
          text: "Start here",
          items: [
            { text: "Overview & installation", link: "/overview" },
            { text: "User guide", link: "/docs/USER-GUIDE" },
            { text: "What’s new in 0.3.0", link: "/docs/releases/v0.3.0" },
          ],
        },
        {
          text: "Explore & integrate",
          items: [
            {
              text: "Codebase intelligence",
              link: "/docs/CODEBASE-INTELLIGENCE",
            },
            { text: "MCP tool reference", link: "/docs/MCP-TOOLS" },
            {
              text: "Runtime architecture",
              link: "/docs/NATIVE-AGENT-ARCHITECTURE",
            },
            { text: "Outcome template", link: "/docs/SPEC-OUTCOME-TEMPLATE" },
          ],
        },
        {
          text: "Portable agent skills",
          collapsed: true,
          items: [
            {
              text: "Codebase skill",
              link: "/skills/contextory-codebase/SKILL",
            },
            {
              text: "Retrieval & coverage",
              link: "/skills/contextory-codebase/references/retrieval",
            },
            {
              text: "Workflow skill",
              link: "/skills/contextory-workflow/SKILL",
            },
            {
              text: "Completion & evidence",
              link: "/skills/contextory-workflow/references/completion",
            },
          ],
        },
        {
          text: "Build & validate",
          items: [
            { text: "Development & releases", link: "/docs/DEVELOPMENT" },
            { text: "Validation records", link: "/docs/VALIDATION" },
          ],
        },
        {
          text: "Delivery records",
          collapsed: true,
          items: [
            {
              text: "Code intelligence plan",
              link: "/docs/CODEBASE-INTELLIGENCE-PLAN",
            },
            { text: "Native agent delivery", link: "/docs/NATIVE-AGENT-PLAN" },
          ],
        },
        {
          text: "Release history",
          collapsed: true,
          items: [
            { text: "Changelog", link: "/changelog" },
            ...releases.map((f) => ({
              text: f.slice(0, -3),
              link: `/docs/releases/${f.slice(0, -3)}`,
            })),
          ],
        },
      ],
      footer: {
        message:
          "Local project context for native agents. Currently UNLICENSED.",
        copyright: "Contextory · Documentation for version 0.3.0",
      },
    },
    mermaid: { securityLevel: "strict" },
  }),
);
