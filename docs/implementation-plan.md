# AerioTV for LG webOS: approved implementation plan

Approved by the product owner after the planning session on 2026-10-06.
Issue status and implementation work are tracked exclusively in Beads.

## Product decisions

- webOS 22 and newer; validate actual model/firmware capabilities.
- tvOS-first interface, menus and interaction behavior; incorporate Android TV
  behavior through explicit parity decisions.
- TV-only application, no additional external server. Existing Dispatcharr
  server-side features remain in scope.
- Developer Mode sideload first, then LG Store distribution.
- Pin Apple to `adad9b0ca082833abed1b56509474aaecf1cb0f7` and Android to
  `de9389f2661d3e2b142c10f5b9595213468c1bfb`.

## Architecture proposal

TypeScript/React packaged IPK, custom tvOS-style components, Chromium 87-compatible
build output, explicit focus/remote state machines and dedicated guide navigation.
IndexedDB repositories hold source-scoped state; workers perform heavy parsing.
Dispatcharr, Xtream Codes and M3U/XMLTV implement normalized provider interfaces.
Persistent playback sessions use tested native media or MSE engine adapters.
An on-TV JavaScript service is permissible only if needed, proven and supported by
documented retail/Store APIs; it is not an external server.

Do not assume MPV/ExoPlayer codec coverage, nine concurrent decoders, local DVR,
background execution, playback speed, cloud SDK access or companion interoperability.
Native webOS playback documentation lists non-1x speeds as unsupported. Preserve
LG long-Back Home behavior and use platform Back at app root. Feasibility findings
must lead to explicit decisions; a disabled menu or static thumbnail is not parity.

## Delivery milestones

| Milestone | Outcome |
| --- | --- |
| M0 | Exhaustive source/screen inventory, references, device feasibility and decisions |
| M1 | First playable IPK with onboarding, three source types, lists and playback |
| M2 | Daily-use Live TV: guide, search, favorites, menus, mini-player, remote mapping |
| M3 | VOD, viewing state, Dispatcharr DVR and reminders |
| M4 | Proven advanced capabilities, settings, sync and companion integrations |
| M5 | Real-TV regression evidence, sideload beta and LG Store submission |

The early playable milestone does not replace the full approved scope. Estimate
delivery dates after M0 establishes actual device limits and menu inventory.

## Verification contract

Every feature links to pinned source behavior and acceptance criteria; relevant
automated tests, remote/focus checks, matching-state visual checks and error/retry
coverage are required. Playback/input/storage/lifecycle require physical-TV evidence.
All inventory items must be implemented and verified or explicitly accepted as
platform gaps. Failed feasibility does not automatically complete a feature.

The exact LG TV model available for testing remains an input to E02.1. Hardware
access blocks executing device spikes, but does not block creating the backlog.

## Backlog maintenance

`scripts/create_backlog.py` contains the approved 12-epic/60-child creation manifest
plus the discovered E12.6 tooling follow-up.
Its `plan-E01` / `plan-E01.1` labels map proposal aliases to real Beads IDs. It reuses
existing aliases on rerun and never resets issue status. Fresh clones must first
initialize Beads and run the manifest to recreate the initial backlog because the
installed Beads version keeps Dolt data locally and does not export JSONL. A shared
Dolt remote is required to synchronize future status changes between clones.
Parent-child hierarchy is
separate from actual blocking edges; dependencies are task-level so unrelated work
can proceed in parallel. Capability-gated features remain tracked until explicitly
resolved by the product owner. Use Beads for subsequent changes, not this manifest
as a second status board. All downstream E02–E12 epic/child issues now reference
the relevant E01 specifications directly in Beads notes and via their primary
`spec_id`; `python3 scripts/create_backlog.py --references-only` reconciles
missing references without altering issue status.

Source inventories, visual baselines, remote contracts, capability matrices and ADRs
are deliverables of E01/E02. The E01 source-reference package is
[screen/settings inventory](reference-inventory.md),
[visual baseline](visual-baseline.md),
[remote/navigation contract](remote-control-contract.md),
[cross-platform decisions](platform-decisions.md), and
[reuse/attribution requirements](reuse-attribution.md). E02 still owns physical-TV
capability tests. Repository screenshots cover onboarding only; see the visual
baseline before claiming pixel parity for the guide, player or settings.

The [E02 evidence ledger](webos-feasibility.md) distinguishes LG documentation,
packaged developer-probe tests, Simulator observations and retail TV results.
LG's [multi-video FAQ](https://webostv.developer.lge.com/faq/can-i-use-two-video-tags-at-the-same-time)
states that two simultaneous HTML video elements are not officially supported;
the nine-stream goal requires an explicit hardware/architecture decision.

## References

- https://github.com/jonzey231/AerioTV
- https://github.com/jonzey231/AerioTV-Android
- https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine
- https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm
- https://webostv.developer.lge.com/develop/guides/magic-remote
- https://webostv.developer.lge.com/develop/guides/back-button
