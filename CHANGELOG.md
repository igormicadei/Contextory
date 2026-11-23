# Changelog

## 0.9.0 (2026-11-23)

### Commits

- c49da721555aef703916e35fd1106179eab4b16f: chore: qualify 0.8.0 documentation and package checksum
- f01ab6db85fa402a2052d8ec42f2af7b71497f3b: test: bound independent qualification concurrency
- fa0c7219010c865a2dcbfc114729b6cbfd739f1a: fix: verify release history without downloading generated diffs
- 3831ffc687a2f524c4579bb67ab413d7bd179c53: feat: add dedicated approvals and bundled project documentation

### Project decisions, features and rules recorded in this interval

These ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.

- DEC-10af3b33@1 (decision, active): Publish a minor release using immutable managed tag and separate qualification artifacts
- DEC-19979107@1 (decision, active): Ship independent project documentation as on-demand Contextory capability
- DEC-e930433f@1 (decision, active): Release 0.8.0 through managed versioning and immutable package assets
- DEC-fb475648@1 (decision, active): Keep source refresh separate from human approval
- ISS-355a3b31@2 (finding, resolved): Unbounded parallel qualification contends with local Git hooks and source workers
- ISS-4cba0496@1 (finding, resolved): Preserve all Carbon resources while excluding generated Python caches
- ISS-d71b3bfb@1 (finding, resolved): Stale source guards make approval appear inert without an inline recovery path
- ISS-e997df6c@1 (finding, deferred): GitHub Actions billing lock requires verified branch-based documentation deployment
- ISS-f322adb2@1 (finding, resolved): Large generated Pages diffs exceeded the publication verifier output buffer
- ISS-feaa6069@1 (finding, resolved): New specifications need relevant explanations before associations exist
- KN-2e0a3855@1 (knowledge, observed): Published release verification
- KN-3a434696@1 (knowledge, observed): Project documentation reader
- KN-456a5f5a@1 (knowledge, observed): Isolated documentation runtime bridge
- KN-55b13738@1 (knowledge, observed): Independent documentation and Carbon runtime linked to project changes
- KN-77e7df33@1 (knowledge, observed): Project explanations in Documentation with contextual entry points
- KN-85279736@1 (knowledge, observed): Knowledge catalog review and source freshness
- KN-8a572b8d@1 (knowledge, observed): Human source refresh without implicit knowledge approval
- KN-91fdf5da@1 (knowledge, observed): Verified documentation resource packaging
- KN-ad8c24fe@1 (knowledge, observed): Portable project documentation workflow
- KN-aeece84e@1 (knowledge, observed): Documentation and Carbon provenance manifest
- KN-b9c6303e@1 (knowledge, observed): Version 0.8.0 package checksum
- KN-beae20ae@1 (knowledge, observed): New specifications retrieve relevant explanations before record linking
- KN-c131d930@1 (knowledge, observed): Project documentation presentation
- KN-c3298ff0@1 (knowledge, observed): Primary Approvals queue separate from Knowledge browsing
- KN-cbcd54c3@1 (knowledge, observed): Catalog pending-only query before pagination
- KN-d2cc8346@1 (knowledge, observed): Recoverable knowledge review with pending items first
- KN-ed5920b1@1 (knowledge, observed): Workspace independent qualification recipes
- KN-fab5cebc@1 (knowledge, observed): Project knowledge review presentation
- KN-fb79a7d6@1 (knowledge, observed): Bundled documentation operations and guidance
- OUT-0c60d049@1 (outcome, submitted): Implemented recoverable human knowledge review with inline feedback, retained reasons and pending-first ordering across filtered pages; built a local fix VSIX.
- OUT-55da400d@1 (outcome, submitted): Released Contextory 0.8.0: committed and merged PR \#1, applied and published the managed annotated tag, built and qualified the exact final VSIX/checksum, pushed clean main and deployed verified bilin
- OUT-620ccd5b@1 (outcome, submitted): Implemented independent project documentation with bundled software-documentation/Carbon, source/change retrieval and responsive project UI.
- OUT-a5098670@1 (outcome, submitted): Added primary Approvals queue beside Work/Requests and separated Knowledge browsing.
- REQ-01b544c5@3 (request, active): Backlog: reference knowledge reuse and integrated project explanations
- REQ-3acdd56f@2 (request, completed): Separate pending approvals into a primary navigation tab
- REQ-6f67cf4a@1 (request, active): Release Contextory 0.9.0 with Approvals and independent project documentation
- REQ-8a41affa@2 (request, completed): Release Contextory 0.8.0
- REQ-acf7362f@2 (request, completed): Make knowledge review actionable and show pending items first
- REQ-d917534f@2 (request, completed): Embed portable project documentation with bundled Carbon guidance and runtime
- SPEC-3dca104e@2 (spec, implementing): Publish the qualified Contextory 0.9.0 extension and documentation
- SPEC-5be921a8@5 (spec, completed): Add primary Approvals tab and separate the knowledge browser
- SPEC-a39f227c@6 (spec, completed): Bundle documentation and Carbon, connect retrieval, maintenance and project UI
- SPEC-d5b72c6e@6 (spec, completed): Qualify and publish Contextory 0.8.0
- SPEC-f128b036@4 (spec, completed): Recover stale review and order pending knowledge first


## 0.8.0 (2026-11-23)

### Commits

- 295e455fb4c085d798a5d56b5a8388df7cbc9142: chore: record v0.7.0 package qualification
- a7f2d02d4483dad662b18faaaafb7493c874332d: docs: rewrite bilingual documentation with default Carbon layouts
- 1d2035e3a76b0c1b945f10d30808b6822f332f98: docs: record verified Pages deployment
- 63e0eee9f865626da3fb6d8e45b386d2f51adf09: docs: remove language chooser from site root
- 24ebfa922c3eea8cd974a1cc5671dbea1bc1cc4d: docs: record landing page deployment
- 80f3d9979182ff9db828363889c201d960f1d03f: feat: deliver resilient background connections and responsive work console
- 7ea7e8e5e9596633d11523b63f0f56a7cce03f43: Merge pull request \#1: resilient connections and responsive work console

### Project decisions, features and rules recorded in this interval

These ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.

- DEC-7b89b856@1 (decision, active): Release additive hook recovery as 0.7.0 with immutable tag and verified assets
- DEC-845108e8@1 (decision, active): Show work movement with recorded evidence instead of completion-time estimates
- DEC-fb1276cc@1 (decision, active): Recover service connectivity without replaying operations or claiming control of native hook trust
- ISS-4bdf8ea7@1 (finding, resolved): Later startup readiness errors could remain idle until a view-triggered refresh
- ISS-542ba298@1 (finding, resolved): Recipe validation and lost event streams abort the editor connection without automatic recovery
- ISS-83e4e414@1 (finding, deferred): GitHub billing lock prevents the source documentation workflow from starting
- ISS-d872a061@1 (finding, resolved): Slow source requests were reported as unavailable service and the editor used a shorter tool budget than native MCP
- KN-07312e93@1 (knowledge, observed): Focused workspace console in sidebar and horizontal panel
- KN-256312d9@1 (knowledge, observed): Large source files remain covered by independent verification
- KN-3d9c6b50@1 (knowledge, observed): Persistent pending knowledge review attention and deduplicated editor alerts
- KN-403dd825@1 (knowledge, observed): Version 0.7.0 discovery and upgrade documentation
- KN-63e3ce90@1 (knowledge, observed): Version 0.7.0 extracted VS Code qualification
- KN-71fd416e@1 (knowledge, observed): Within-spec recorded progress and provenance
- KN-787dd5ed@1 (knowledge, observed): Native hook reload is distinct from service health and managed-file repair
- KN-803cc5e9@1 (knowledge, observed): Review notification navigation is confined to the workspace console
- KN-9a6d5517@1 (knowledge, observed): Later failed checks revoke earlier passing progress for their recipe
- KN-a0ed7942@1 (knowledge, observed): Version 0.7.0 hook recovery release notes
- KN-a2fee8b0@1 (knowledge, observed): Isolated editor startup scenario launcher
- KN-aecdbe22@1 (knowledge, observed): Canonical bilingual documentation corpus
- KN-b084b3bc@1 (knowledge, observed): Version 0.7.0 extracted IBM Bob qualification
- KN-b16ee319@1 (knowledge, observed): src/verification/workspace.ts
- KN-ba31325c@1 (knowledge, observed): Timeout-aware service diagnostics and usable panel work actions
- KN-c26043ab@1 (knowledge, observed): Background startup qualification entry point
- KN-cdbd1f84@1 (knowledge, observed): Recorded specification progress projection
- KN-e58031b2@1 (knowledge, observed): Automatic editor service recovery and independent recipe validation
- KN-e63e7f8e@1 (knowledge, observed): Version 0.7.0 package qualification
- KN-ecaa943d@1 (knowledge, observed): Connection-only retry supervisor
- KN-fbae0c2b@1 (knowledge, observed): Project release version adapters
- KN-fd09867e@1 (knowledge, observed): Visibility-independent background startup and readiness recovery
- OUT-040e5b52@1 (outcome, submitted): Complete source snapshots now stream every byte of large files and reject changes during reads. The corrected maintained extension was rebuilt and installed locally.
- OUT-27059df4@1 (outcome, submitted): Replaced the crowded tabbed interface with a responsive work console, added visible knowledge review attention and recorded within-spec progress, and fixed service recovery, recipe validation and time
- OUT-556074b7@1 (outcome, submitted): Released Contextory 0.7.0 with managed hook recovery. Committed and pushed feature/version/qualification changes, published the immutable annotated tag and matching VSIX/checksum, qualified the extrac
- OUT-7559b6aa@1 (outcome, submitted): Startup and readiness recovery run without opening Contextory, qualified by real automatic activation with Explorer visible.
- REQ-01b544c5@2 (request, active): Backlog: reference knowledge reuse and integrated project explanations
- REQ-2df55580@2 (request, completed): Start Contextory and native setup without opening the sidebar
- REQ-2fc0b255@2 (request, completed): Release Contextory 0.7.0 with managed hook recovery
- REQ-4020f3b8@2 (request, completed): Recover connections and redesign the Contextory work interface
- REQ-85d0bedb@2 (request, completed): Corrigir snapshots de fontes grandes e desbloquear a entrega PreVendas
- REQ-8a41affa@1 (request, active): Release Contextory 0.8.0
- SPEC-57d76984@8 (spec, completed): Hash integral de arquivos grandes sem carregar o arquivo inteiro
- SPEC-c43028b8@5 (spec, completed): Recover services and deliver a responsive work console with review alerts and evidence-based progress
- SPEC-d38608ef@4 (spec, completed): Publish the qualified hook recovery release
- SPEC-d5b72c6e@2 (spec, implementing): Qualify and publish Contextory 0.8.0
- SPEC-ed669f61@4 (spec, completed): Keep startup and readiness recovery independent of the Contextory view


## 0.7.0 (2026-11-21)

### Commits

- ebcdecdd95f25901408e739aa939c1e130acee82: chore: record v0.6.0 package qualification
- cd555b3115bfb13f576d8d5be049b682e9091dcf: feat: rebuild managed hooks from editor and MCP

### Project decisions, features and rules recorded in this interval

These ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.

- DEC-1145efa5@1 (decision, active): Share hook-only recovery across editor and headless MCP without granting native trust
- ISS-611ea284@1 (finding, deferred): Codex drive-letter casing can select different saved hook approvals
- ISS-f4b960e5@1 (finding, resolved): Windows descriptor replacement can abort service startup
- KN-14c2f9cd@1 (knowledge, observed): Project-scoped managed hook recovery
- KN-2d08b05c@1 (knowledge, observed): Service-owned hook repair and retained results
- KN-66e941b0@1 (knowledge, observed): Rebuild hooks from the selected project
- KN-dd938bd3@1 (knowledge, observed): Hook repair preserves client trust and verifies observations separately
- KN-f976a9dd@1 (knowledge, observed): Bounded atomic file replacement
- OUT-48eaef2b@1 (outcome, submitted): Implemented project-scoped hook rebuild in the editor/sidebar and MCP with shared hook-only recovery, launcher restoration, retained operation results, trust/casing guidance and bounded Windows replac
- REQ-2fc0b255@1 (request, active): Release Contextory 0.7.0 with managed hook recovery
- REQ-627eef75@2 (request, completed): Rebuild project hooks from the editor and MCP
- SPEC-d38608ef@2 (spec, implementing): Publish the qualified hook recovery release
- SPEC-e7b20c6b@4 (spec, completed): Restore managed hooks safely through UI and MCP


## 0.6.0 (2026-11-18)

### Commits

- 4ee962dfa4c2d07787e9f1fc9bcf3ee353f0f3f5: chore: record v0.5.1 package qualification
- 5210f71de8221e0fe561063c21aaa96b8e324106: feat: isolate workspace projects and recover delayed native connections

### Project decisions, features and rules recorded in this interval

These ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.

- DEC-3aec4632@1 (decision, active): Keep project-owned ledgers and coordinate requests through explicit workspace scope
- DEC-9b8ef025@1 (decision, active): Retry service readiness without restarting the native session
- ISS-4d3937bd@2 (finding, resolved): Guard delayed project replies and preserve exact coordinated creation input
- ISS-550bab11@2 (finding, deferred): Automated 0.5.1 documentation build blocked by GitHub billing lock
- ISS-87ef3664@1 (finding, resolved): Background native discovery stopped before a slow service became available
- ISS-b67944fb@1 (finding, resolved): Installed VS Code updater blocked isolated package test startup
- KN-03b14e11@1 (knowledge, observed): Patch 0.5.1 release notes
- KN-0e13e5ea@1 (knowledge, observed): Native readiness timing regression coverage
- KN-1b909a01@1 (knowledge, observed): Searchable documentation site configuration
- KN-20f55f67@1 (knowledge, observed): Locked package metadata
- KN-28afc132@1 (knowledge, observed): 0.5.1 IBM Bob package qualification
- KN-2a8cccd9@1 (knowledge, observed): Extension package metadata
- KN-35acc3de@1 (knowledge, observed): Project-owned tracked workflow lifecycle
- KN-3f2dc92e@1 (knowledge, observed): Native stdio MCP proxy and service handshake
- KN-411757ef@1 (knowledge, observed): Shared native and headless project workflow guidance
- KN-44d4ab8a@1 (knowledge, observed): Native connection qualification documentation
- KN-4b4fb23d@1 (knowledge, observed): Version 0.6.0 release notes
- KN-58e45c09@1 (knowledge, observed): Native MCP startup readiness
- KN-6202b69f@1 (knowledge, observed): Portable tool schemas and project scope
- KN-67330941@1 (knowledge, observed): Current release overview and installation
- KN-69f4cad3@1 (knowledge, observed): Versioned qualification record
- KN-6a6ce93a@1 (knowledge, observed): Workspace isolation and coordination qualification
- KN-79441e4a@1 (knowledge, observed): Multi-folder editor services and project-scoped navigation
- KN-7d9e9bf7@1 (knowledge, observed): Managed project changelog
- KN-85f84837@1 (knowledge, observed): Project selector, ownership badges and cross-project branch navigation
- KN-8adaabd9@1 (knowledge, observed): Workspace membership and coordinated request routing
- KN-a37f3ea2@1 (knowledge, observed): Recoverable cross-project requests with independently verified local branches
- KN-afd38931@1 (knowledge, observed): Documentation home page
- KN-b65188ed@1 (knowledge, observed): Version 0.6.0 documentation and upgrade guidance
- KN-bae604bf@1 (knowledge, observed): Automatic recovery when the native client starts before Contextory
- KN-bb9f9beb@1 (knowledge, observed): Project-owned application and tool dispatch
- KN-bc4d1927@1 (knowledge, observed): Owned native provider registration and setup guidance
- KN-d0bb2583@1 (knowledge, observed): Authenticated service transport and scoped dispatch
- KN-daf148c0@1 (knowledge, observed): Native connection setup feedback
- KN-dba05cbb@1 (knowledge, observed): Runtime version and shared model contracts
- KN-e096f0b4@1 (knowledge, observed): Disposable multi-root editor host qualification
- KN-e7fc261e@1 (knowledge, observed): Explicit project scope preserves independent ownership and native roles
- KN-e9a1c43e@1 (knowledge, observed): Delayed dashboard restores cannot change a settled project selection
- KN-eb29cdfa@1 (knowledge, observed): Headless CLI and explicit project selection
- KN-f02b97a0@1 (knowledge, observed): Patch 0.5.1 package checksum
- KN-f5ad8faa@1 (knowledge, observed): Patch 0.5.1 package inspection
- KN-f6d011ed@1 (knowledge, observed): 0.5.1 VS Code package qualification
- KN-fd94848d@1 (knowledge, observed): Workspace selector and cross-project request UI qualification
- OUT-8cc307f4@1 (outcome, submitted): Implemented isolated local multi-root workspace projects with explicit native routing, project selector/badges and recoverable cross-project request branches.
- OUT-da1431ae@1 (outcome, submitted): Native startup discovery now retries automatically for up to five minutes, with bounded foreground readiness and clearer setup feedback.
- OUT-dce1b739@1 (outcome, submitted): Contextory v0.5.1 committed, pushed and published with the qualified retry fix, matching VSIX/checksum and verified current documentation.
- OUT-f644a30d@1 (outcome, submitted): Prepared current guides, release notes and searchable site for Contextory 0.6.0.
- REQ-19acd150@2 (request, completed): Isolate projects in multi-root workspaces and coordinate cross-project requests
- REQ-4bdb42b2@2 (request, completed): Document and qualify Contextory 0.6.0 release
- REQ-c0b1f599@2 (request, completed): Keep native startup readiness retrying for five minutes
- REQ-fdba89b6@2 (request, completed): Release Contextory v0.5.1 with gray connection retry
- SPEC-0b8b95fc@6 (spec, completed): Support trusted local multi-root workspaces without merging project records
- SPEC-1cec3812@4 (spec, completed): Retry background readiness for five minutes with bounded calls
- SPEC-8d0c953f@4 (spec, completed): Publish qualified v0.5.1 package and release
- SPEC-9be47776@4 (spec, completed): Prepare current multi-project and native recovery release documentation


## 0.5.1 (2026-11-18)

### Commits

- 69f68317af7868f9efb3d873b30ce67d303c7422: fix: retry gray native-agent connections

### Project decisions, features and rules recorded in this interval

These ledger entries are associated by recording interval, not verified commit inclusion. Refer to their immutable revisions for provenance.

- DEC-25c900ca@1 (decision, active): Global Git-backed version controller with explicit durable release actions
- DEC-295b1850@1 (decision, active): Share portable instructions and contracts while isolating host adapters
- DEC-3b8769d0@1 (decision, active): Keep references in separate read-only source-analysis runtimes
- DEC-50083b65@1 (decision, active): Publish complete documentation through existing Pages branch
- DEC-5b642668@1 (decision, active): Publish additive capabilities as 0.5.0 while preserving 0.4.0
- DEC-5f60ee39@1 (decision, active): Apply progressive source exploration to the existing normalized graph
- DEC-76fda164@1 (decision, active): Share retrieval behavior while keeping host adapters thin
- DEC-81d1b365@1 (decision, active): Separate rebuildable graph projections from work records
- DEC-8e39cb64@1 (decision, active): Publish a patch release and preserve existing Pages history
- DEC-9742539f@1 (decision, active): Build complete Pages documentation from canonical Markdown
- DEC-c963fb8a@1 (decision, active): Recover native MCP connections and bound setup restarts
- DEC-eddc814b@1 (decision, active): Keep inferred observations separate from human-approved application definitions
- ISS-1c7354a8@1 (finding, resolved): Class context over-selected local variables and exhausted edge budget
- ISS-2cdaebb6@1 (finding, resolved): Hosted documentation workflow blocked before startup
- ISS-79fa0fc0@1 (finding, resolved): Gray configured footer agent removed connection setup when clicked
- ISS-7a121d8e@1 (finding, resolved): Preserve compact Panel navigation and viewport after explorer redesign
- ISS-86241727@1 (finding, resolved): Post-compaction hook dropped the agent reminder
- ISS-9082f9b4@2 (finding, deferred): Automatic documentation runner blocked by account billing; manual Pages publication succeeded
- ISS-9a6f402b@1 (finding, resolved): Imported relationships could outlive changed source
- ISS-9c62bcbc@1 (finding, resolved): A workspace inside an ignored parent repository appeared empty
- ISS-a33837e5@1 (finding, deferred): Hosted documentation Actions cannot start because the GitHub account is billing-locked
- ISS-ab865376@1 (finding, resolved): MCP discovery requires object-root input schemas
- ISS-ae1ee12b@1 (finding, resolved): Successful readiness cache survives workspace service shutdown
- ISS-b15474cd@1 (finding, deferred): Hosted automatic documentation workflow blocked by GitHub billing lock
- ISS-e0396878@1 (finding, resolved): Windows editor storage can exceed SQLite's normal path limit
- ISS-fa758e0a@1 (finding, resolved): Release observation and recovery must coalesce events and reconcile completed Git effects
- ISS-fac0364f@1 (finding, resolved): Generated KaTeX Unicode range blocked by publication scan
- ISS-faed74a2@1 (finding, resolved): Align regression fixtures with the new knowledge surface and public retrieval contract
- KN-0b720aa8@1 (knowledge, observed): Native connection user guidance
- KN-2d6ce110@1 (knowledge, observed): Sidebar connection rendering and actions
- KN-79bd55f9@1 (knowledge, observed): Native-agent footer retries gray connections
- KN-cd597472@1 (knowledge, observed): Sidebar connection action regression coverage
- OUT-1141f675@1 (outcome, submitted): Committed and pushed Contextory v0.5.0, created the immutable annotated tag, published the stable GitHub release with exact VSIX/checksum assets, and published/verified all27documentation pages. main 
- OUT-15cb5cbf@1 (outcome, submitted): Gray native-agent footer buttons now retry connection setup instead of disconnecting an existing waiting configuration. Green observed connections retain disconnect. Diagnosed the affected project's m
- OUT-1a7629a8@1 (outcome, submitted): Implemented persistent native source knowledge and validated project configuration.
- OUT-222cecf1@1 (outcome, submitted): Fixed stale native MCP readiness after project reopen, added explicit version/tool-contract mismatch diagnostics, separated current service MCP/hook observations from history, and delivered persisted 
- OUT-2a5e7c18@1 (outcome, submitted): Implemented isolated, persistent local reference codebases alongside the active workspace, with explicit per-call agent selection and Architecture navigation.
- OUT-2c801cc8@1 (outcome, submitted): Implemented project-wide version and release management independent of requests: automatic Git observation and exact per-version membership, global semantic intervals, current version and SemVer recom
- OUT-2ea5e2c1@1 (outcome, submitted): Published Contextory v0.3.0 with updated complete documentation, visual source exploration, verified VSIX/checksum assets and a live searchable Pages site from an orphan branch.
- OUT-47d19d7c@1 (outcome, submitted): Delivered Architecture navigation and bounded cached workspace orientation.
- OUT-4bc0d5b6@1 (outcome, submitted): Validated and documented the full six-stage local 0.3.0 implementation and distributable.
- OUT-4f3aa737@1 (outcome, submitted): Updated all Contextory agent instruction surfaces while preserving agent-agnostic behavior and thin host adapters.
- OUT-6f4c370f@1 (outcome, submitted): Implemented canonical portable skills, capability adapters and standalone CLI/MCP.
- OUT-771dbdff@1 (outcome, submitted): Published Contextory v0.3.1 as latest GitHub release with verified VSIX/SHA-256 and complete live documentation on the preserved orphan gh-pages branch.
- OUT-7ebef404@1 (outcome, submitted): Implemented coherent graph freshness, static contract links and optional Graphify import.
- OUT-89980238@1 (outcome, submitted): Committed and pushed isolated reference-codebase support and published Contextory v0.4.0 with verified VSIX/checksum assets and complete live documentation.
- OUT-929fbeec@1 (outcome, submitted): Implemented versioned project knowledge, human review, resumable migration and complete paginated documentation access.
- OUT-ac913f87@1 (outcome, submitted): Implemented definition-first task retrieval, project-memory linkage, source impact and relationship paths.
- OUT-ffb94e00@1 (outcome, submitted): Architecture and Code map now provide coordinated visual source exploration with bounded maps, understandable relationship semantics and direct navigation.
- REQ-17d86fd1@2 (request, completed): Analyze reference codebases alongside the current project
- REQ-1f8f26b8@2 (request, completed): Release Contextory v0.3.1 on GitHub
- REQ-51f339c5@2 (request, completed): Manage project-wide versions, commit changelogs and GitHub tags programmatically
- REQ-5fc5632c@2 (request, completed): Verify resumed Codex chats and reload newly installed workspace integrations
- REQ-66b98588@2 (request, completed): Synchronize agent instructions for codebase-aware information retrieval
- REQ-70858e00@2 (request, completed): Release Contextory v0.4.0 with isolated reference codebases
- REQ-8cc2df5c@3 (request, completed): Govern project knowledge, migration history and documentation access
- REQ-c51fae9d@3 (request, completed): Publish Contextory v0.3.0 with visual code exploration and full documentation
- REQ-cd9f8775@2 (request, completed): Complete codebase awareness and agent portability
- REQ-e99e4025@2 (request, completed): Release Contextory v0.5.0 with governed knowledge, project versions and native recovery
- REQ-fdba89b6@1 (request, active): Release Contextory v0.5.1 with gray connection retry
- REQ-fe40c5c6@2 (request, completed): Retry unobserved native connections from gray agent buttons
- SPEC-04afbcf9@5 (spec, completed): Maintain current relationships and import Graphify graphs
- SPEC-0863b3c7@4 (spec, completed): Publish validated v0.5.0 source, package and documentation
- SPEC-0bb5e79d@5 (spec, completed): Retrieve task context, source impact and relationship paths
- SPEC-0f5d6a9a@6 (spec, completed): Implement global Git-backed versions and release operations
- SPEC-28a17f45@4 (spec, completed): Make gray native-agent buttons retry without removing configuration
- SPEC-3115fc98@5 (spec, completed): Publish v0.3.0 documentation, release assets and Pages site
- SPEC-487a8f14@4 (spec, completed): Package, commit and publish isolated reference codebases
- SPEC-515ccb37@5 (spec, completed): Recover resumed native connections and offer one-time setup reload
- SPEC-5c35863d@4 (spec, completed): Publish v0.3.1 assets and documentation
- SPEC-61020633@5 (spec, completed): Index symbols, source structure and project configuration
- SPEC-7ab62c41@4 (spec, completed): Isolated local reference codebases across tools and Architecture
- SPEC-7af018d9@4 (spec, completed): Synchronize portable skills, workspace instructions and runtime guidance
- SPEC-8d0c953f@2 (spec, implementing): Publish qualified v0.5.1 package and release
- SPEC-b48bad9c@5 (spec, completed): Package portable skills and client-neutral execution
- SPEC-ccfd6f2d@4 (spec, completed): Make Architecture and Code map visual and navigable
- SPEC-d2fabd1c@5 (spec, completed): Expose architecture and freshness in the extension
- SPEC-db46ac99@7 (spec, completed): Implement governed catalog, migration agent and documentation access
- SPEC-dd0f9c36@4 (spec, completed): Evaluate and document the complete implementation


## Unreleased

## 0.5.0 ? 2026-11-18

- Recover reused native MCP connections across delayed workspace/service restarts without replaying mutations; diagnose same-version tool-contract mismatch and separate current MCP/hook observations from historical traffic.
- Offer a persisted setup Extension Host restart, with `prompt`, opt-in `automatic`, and `never` modes; add native connection diagnostics and restart commands. Qualify persisted-thread resume with the real Codex app-server and actual automatic restart in isolated VS Code.

- Add project-wide Git version observation, exact commit membership and Conventional Commit bump recommendations independent of requests or agents.
- Add journaled release plans, deterministic version/changelog adapters, dedicated commits and annotated tags, with separate verified tag publication and interrupted-operation recovery through UI, CLI and MCP.
- Expose retained global release history and semantic recording intervals for documentation; detect historical tag drift and preserve immutable membership.

- Add a versioned catalog for file responsibilities, rules/features with test links or gaps, and UI layout/interaction contracts. Human Knowledge review approves exact baselines and before/after changes or retirements; prior definitions and reasons remain in history and reports.
- Add source/test freshness and catalog completion accounting, with pending-proposal and stale-approved-definition blockers. Legacy projects without a catalog retain their existing completion behavior until enrollment.
- Deliver the portable `contextory-migrate` agent and resumable file-scan MCP tool for existing projects, with explicit inference/coverage limits and no automatic requirement approval.
- Expose paginated project documentation datasets through `contextory_project_export`, including current and historical definitions, decisions, source facts, relationships, check evidence, usage metadata and artifacts.
- Update shared native/headless instructions, advisory hooks, canonical skills and documentation.

## 0.4.0 — 2026-11-17

- Add persistent named local reference codebases with isolated source indexes and concurrent architecture/context/impact/path/search/flow analysis. Keep current-project defaults, work records and source files separate.
- Add Architecture reference selection, folder registration, detachment and scoped source/flow navigation; ignore responses from previous repository selections.
- Expose reference registration/listing and explicit source-tool selection through native/headless MCP and the CLI; update portable agent skills and user/developer guidance.

## 0.3.1 — 2026-11-16

- Publish ASCII-safe generated documentation JavaScript and pin the Pages deployment action to its release commit.
- Derive documentation source-link tags and live release-page verification from the package version.
- Refresh current installation links, site navigation and release documentation; repackage the extension as 0.3.1 with matching VSIX/checksum assets.

## 0.3.0 — 2026-11-16

- Add a persistent, rebuildable TS/JS and Python source graph with stable symbols, imports/calls/references/inheritance, test/document/config links, inferred literal message contracts and source provenance. Add validated `contextory.project.json` coverage and entry-point settings.
- Keep graph snapshots current through content/config hashes, AST reuse, background filesystem/Git refresh, deletion/rename cleanup and transactional Graphify import with source-hash invalidation.
- Retrieve ranked task context with project memory and explicit byte budgets. Add source/record impact, bounded relationship paths, architecture summaries and cached workspace orientation.
- Add a visual Architecture workbench with subsystem maps, scoped file/symbol navigation, breadcrumbs and Back, typed/directional neighborhoods, a coordinated inspector and a dependency matrix. Preserve cited source/record navigation and freshness/coverage notices.
- Improve Code map with a stable layered canvas, synchronized step list and inspector, direct connection highlighting, relationship filters, focused neighborhoods, zoom/pan/fit and keyboard navigation.
- Package canonical Agent Skills and references through capability-based Codex/Claude/Bob/generic adapters. Add generic MCP export and standalone CLI/stdio MCP without editor heartbeat or hook requirements.
- Synchronize agent guidance for task lookup, relationship navigation, source verification, graph freshness and missing capabilities. Share runtime instructions across native/headless MCP, workspace briefs and hook reminders; add project entry instructions and ownership-safe skill-only workspace sync with drift checks.
- Restore post-compaction agent reminders by returning the cached brief for that lifecycle event; verify session, prompt and post-compaction outputs across native adapters.
- Add retrieval/graph/freshness/import/migration/headless/client/UI regression coverage and a repeatable checkout evaluation. Preserve existing project records with additive schema 4.

- Publish the 0.3.0 VSIX and SHA-256 release assets. Update installation and upgrade guidance and provide the full searchable documentation on GitHub Pages from an orphan `gh-pages` branch, with reproducible builds and automatic deployment.

## 0.2.6 — 2026-11-13

- Detect installed Codex and Claude Code extensions and recognize the IBM Bob host. Prepare all detected agents at early startup, without opening Contextory, choosing a default, or starting a native session first; rescan when installed extensions change.
- Add a footer **Auto-connect** switch, command and `contextory.autoConnect` setting to pause automatic setup without removing existing bridges or project records. Default `contextory.startupAgent` to `auto`, retaining fixed/last-used modes and explicit workspace disconnects.
- Serialize provider configuration and isolate each provider's errors, so one conflicting configuration does not prevent another detected agent from being prepared.
- Advertise the complete MCP tool catalog before the workspace service is ready. Wait up to 15 seconds for service readiness through a read-only handshake, then execute the requested tool once; retain descriptor rotation support for existing native connections.
- Preserve native trust and session ownership. Codex and Claude expose no public command for Contextory to force MCP reload, so first-time setup or an already-running native session can still require approval or a native extension/session restart.

## 0.2.5 — 2026-11-13

- Adapt the movable Contextory view to a wide Panel: compact header/navigation, request grid and recent-activity columns, request list beside a spec inspector, bounded history and source-diagram scrolling, and pinned agent controls.
- Preserve selected specs, detail tabs, expanded milestones, drafts and independent scroll positions while resizing or switching layouts. Keep narrow views in the sidebar layout and follow the active theme.
- Display the workspace name in every view's header, with the full path on hover and ellipsis for long names.
- Prepare MCP/hooks at startup using the last agent used in the workspace, falling back to the last agent used elsewhere. Add `contextory.startupAgent` for a fixed provider or no automatic selection; preserve explicit workspace disconnects and start after workspace trust is granted.

## 0.2.4 — 2026-11-12

- Record native agent model metadata and Codex per-request token usage through hooks, with timestamps, session/turn IDs, request status, and optional spec attribution.
- Add a specification Usage tab, request/spec report summaries, and the read-only `contextory_usage_get` MCP tool.
- Keep missing counters unavailable, preserve retries and model changes, and leave ambiguous or unmatched sessions unassigned. Cached and reasoning counters remain subsets, and no billing or quota is inferred.
- Keep capture local and bounded, without reading transcripts, prompts, tool inputs, or tool results. Claude model-switch hooks require Claude Code 2.1.251+; Bob's documented hooks expose neither model nor token counts.

## 0.2.3 — 2026-11-12

- Rename the extension to **Contextory**, including its commands, settings, MCP tools, hooks, workflow skills, reports, documentation, and package identity.
- Add a request-card/context-network icon for the activity bar, sidebar header, and extension listing.
- Follow active VS Code themes immediately across sidebar, code-flow, and relationship views, including custom themes and both high-contrast modes. Keep request navigation and drafts intact during theme changes.
- Add public installation, daily workflow, agent-tool, troubleshooting, development, and release documentation, with repository metadata and downloadable VSIX/checksum assets.

The new identity is `contextory-local.contextory-workspace`. Disconnect builds installed under the former name before replacement. Their project data remains in the former storage and is not imported automatically.

## 0.2.2 — 2026-11-12

- Add spec progress bars to all open requests in Overview and remove its introductory heading.
- Pin compact native-agent controls to the sidebar footer.
- Open readable relationships in a dedicated workbench view, with titles, summaries, IDs, source references, directions, and rationale.
- Link related records back to their owning request/spec and explanation tab.

## 0.2.1 — 2026-11-12

- Add all open requests, three readable recent activities, full linked history, inline milestone/spec details, and descendant-aware request search.
- Export request-scoped implementation reports and completed-work changelogs.
- Add isolated Python AST calls and flow analysis, remembered source cursors, incoming calls, bounded expansion, and unsaved overlays.
- Return explicit completion instructions after an agent submits an outcome; roll completion/reopen state up through milestones and requests.

## 0.2.0 — 2026-11-12

- Replace the extension-owned chat/router with native Codex, Claude Code, and IBM Bob integration through MCP and advisory hooks.
- Introduce an isolated Node 24+ workspace service with SQLite records, immutable revisions, leases, dependencies, findings, decisions, evidence, outcomes, and independent checks.
- Add lexical and optional local vector/hybrid retrieval, explicit relationships, and bounded TypeScript/JavaScript source analysis.
- Remove obsolete routing/chat code, fixtures, and documentation. Git history retains the previous implementation.
