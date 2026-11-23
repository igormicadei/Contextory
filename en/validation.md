# Validation and evidence boundaries

## Match each check to its claim

| Check | Establishes |
| --- | --- |
| npm run check | Skill bundle consistency, types, production build, backend and browser UI regression checks |
| Service/headless/registration integration | Tool contracts, transport, role isolation, setup ownership and tracked workflow scenarios |
| Editor-host smoke checks | Actual packaged activation, commands, service, configuration and persistence in isolated profiles |
| docs:validate and docs:build | Bilingual corpus structure, cited source hashes, images, generated exports and local links/anchors |
| Documentation browser review | Desktop/mobile layout, locale parity, navigation, search and screenshot rendering for the reviewed build |

## Separate earlier qualification from this rewrite

The original validation record and release notes are preserved as historical downloads. Their passing results describe the code/artifacts tested at that time. They are not automatically new test executions for this documentation rewrite. The rewrite’s concrete commands/results belong in .documentation/REVIEW.md.

Existing screenshots are application captures with example records. The documentation build validates file presence and bilingual captions/alt text. Browser review verifies rendering; it does not recreate an authenticated native-agent conversation.

## Keep remaining gaps explicit

The earlier documentation rewrite recorded an unavailable service; the 0.8.0 delivery recovered the original project ledger and uses tracked release checks. Catalog entries remain observations until human review. Native trust, authenticated agent chats, dynamic/static-analysis gaps, remote workspaces and other operating systems retain their own qualification limits.

## Sources

- package.json
- tests/integration/service.test.ts
- tests/integration/headless.test.ts
- tests/integration/registration.test.ts
- tests/ui/catalog.spec.ts
- artifacts/host-release-070-vscode.json
- artifacts/host-release-070-bob.json
- src/extension.ts
- src/service/reconnect.ts
- src/service/rpc.ts
- src/webview/progress.ts
- tests/ui/console.spec.ts
- tests/integration/recipe-configuration.test.ts
- scripts/verify-background-startup.mjs

