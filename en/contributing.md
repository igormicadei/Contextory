# Build, document and contribute

## Set up development

Build and run project checks

```powershell
npm ci
npx playwright install chromium
npm run check
```

Use Node.js 24+, npm and Python 3.10+ for analysis tests. npm run check runs portable-skill drift checks, TypeScript, production build, backend tests and UI tests. Optional real-model tests need the separately prepared embedding runtime. Host qualification remains separate.

## Find the owning subsystem

| Path | Responsibility |
| --- | --- |
| src/codebase | Source projection, extractors, freshness and queries |
| src/service, src/contracts, src/core, src/storage | Service/tool contracts, tracked work and authoritative ledger |
| src/knowledge, src/analysis, src/editor | Governed memory, flow analysis and editor integration |
| src/releases | Git observation, release plans, adapters and recoverable tags |
| src/providers/clients.ts, src/agents/instructions.ts | Client capabilities and shared portable guidance |
| src/webview, media, tests | User interfaces, assets and backend/UI/host validation |

Edit canonical portable skills in skills/, then run npm run skills:sync. Do not edit generated provider skill-content or client copies independently. Preserve unrelated source and client configuration.

## Maintain the default documentation site

Documentation workflow

```powershell
npm run docs:map
npm run docs:validate
npm run docs:build
npm run docs:integrations
npm run docs:preview
```

Edit .documentation/project.json: page/section IDs are shared by en and pt-BR. Use source-backed plain-text blocks, translated examples/captions/alt text and actual application screenshots. The vendored software-documentation runtime renders its unchanged Carbon shell, local search, responsive navigation, Markdown, llms.txt and corpus/API exports. Python 3.11+ is required for documentation tooling.

After reviewing changed source, set audit.reviewedSourceFingerprint to the current docs:map value. Builds refuse stale reviews; the build never approves source changes automatically. Use docs:migrate to inspect source drift. It previews supported versioned migration and refuses unknown schemas.

Generated output is .documentation/site/. The managed manifest detects stale inputs and protects unrelated output files. Existing URLs are kept by .documentation/redirects.json; old fragments remain usable on compatibility pages. Original English guides, plans, skills and release records are preserved under .documentation/legacy and published as archive downloads. Current guides under docs/ are managed English exports of the same corpus.

The existing documentation workflow builds relevant main-branch changes and updates gh-pages. A local build does not publish it. Review current hashes and the orphan branch history before any authorized deployment, then verify the live artifact. README links describe the intended site URL until deployment is verified.

## Package and qualify changes

Build the local distributable

```powershell
npm run package:vsix
```

Packaging refreshes the versioned VSIX and checksum but does not publish, change a version or install into a live editor. Changes to MCP transport/registration need headless/service/registration integration checks. Run real editor-host smoke checks for host changes and record authenticated native chat limitations accurately.

[Review qualification evidence](validation.md)

## Sources

- package.json
- scripts/build.mjs
- scripts/package-vsix.mjs
- scripts/documentation/build.py
- .github/workflows/documentation.yml
- .gitattributes
- .vscodeignore
- tests/documentation/site.test.mjs

