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

Contextory’s connected service was unavailable for request recovery, catalog review and project export. No tracked completion or catalog update was fabricated. Dynamic/static-analysis gaps, native trust, large-repository behavior and remote/other-OS support require their own evidence. A local documentation build does not establish live deployment; verify the Pages build and the served artifact separately.

## Sources

- package.json
- tests/integration/service.test.ts
- tests/integration/headless.test.ts
- tests/integration/registration.test.ts
- tests/ui/catalog.spec.ts
- artifacts/host-release-070-vscode.json
- artifacts/host-release-070-bob.json

