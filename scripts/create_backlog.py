"""Materialize the approved backlog using bd; reruns reuse aliases, not duplicates.

Issue status stays exclusively in Beads. Run from the repository root.
"""
import json
import subprocess
import sys

APPLE = "https://github.com/jonzey231/AerioTV/tree/adad9b0ca082833abed1b56509474aaecf1cb0f7"
ANDROID = "https://github.com/jonzey231/AerioTV-Android/tree/de9389f2661d3e2b142c10f5b9595213468c1bfb"
CONTRACT = """Approved scope: LG webOS 22+, tvOS-first visual/interaction parity,
Android TV complementary behavior, TV-only application, Developer Mode sideload
then LG Store. No additional external server. Existing provider-side Dispatcharr
features remain in scope. Capability failures require an explicit product decision;
disabled controls do not establish feature parity. Do not assume private APIs,
native iCloud/Google SDK availability, nine decoders, or unrestricted storage.
"""
DOD = """Completion requires relevant automated checks, source-referenced behavior,
remote/focus verification and matching-state visual comparison where applicable.
Playback, input, storage and lifecycle require physical-TV evidence. Cover empty,
error and retry states; document capability gaps and attach evidence before closing.
Feasibility tasks produce evidence and decisions, not completed feature claims.
"""

# Stable IDs for bootstrapping the approved initial board on a fresh clone.
# Existing issues are always reused; this script is not a status sync mechanism.
EPIC_IDS = {
    "E01": "aerio-bk6", "E02": "aerio-c1x", "E03": "aerio-awn",
    "E04": "aerio-20j", "E05": "aerio-5x6", "E06": "aerio-z9t",
    "E07": "aerio-0o2", "E08": "aerio-4ql", "E09": "aerio-qgp",
    "E10": "aerio-tbw", "E11": "aerio-8m4", "E12": "aerio-6cv",
}

# The E01 specification is the implementation contract for every downstream
# issue. Keep the link text in the bootstrap manifest so newly initialized
# boards carry the same references as the original Dolt database.
REFERENCE_MARKER = "E01_REFERENCE_SPEC_V1"
REFERENCE_DOCS = {
    "E02": ("docs/platform-decisions.md", "docs/reference-inventory.md", "docs/remote-control-contract.md"),
    "E03": ("docs/reuse-attribution.md", "docs/reference-inventory.md", "docs/visual-baseline.md"),
    "E04": ("docs/remote-control-contract.md", "docs/visual-baseline.md", "docs/reference-inventory.md", "docs/platform-decisions.md"),
    "E05": ("docs/reference-inventory.md", "docs/visual-baseline.md", "docs/reuse-attribution.md"),
    "E06": ("docs/reference-inventory.md", "docs/remote-control-contract.md", "docs/platform-decisions.md", "docs/visual-baseline.md"),
    "E07": ("docs/reference-inventory.md", "docs/remote-control-contract.md", "docs/platform-decisions.md", "docs/visual-baseline.md"),
    "E08": ("docs/reference-inventory.md", "docs/visual-baseline.md", "docs/platform-decisions.md", "docs/reuse-attribution.md"),
    "E09": ("docs/reference-inventory.md", "docs/platform-decisions.md", "docs/visual-baseline.md"),
    "E10": ("docs/reference-inventory.md", "docs/remote-control-contract.md", "docs/platform-decisions.md", "docs/visual-baseline.md"),
    "E11": ("docs/reference-inventory.md", "docs/remote-control-contract.md", "docs/platform-decisions.md", "docs/reuse-attribution.md"),
    "E12": ("docs/reference-inventory.md", "docs/visual-baseline.md", "docs/remote-control-contract.md", "docs/platform-decisions.md", "docs/reuse-attribution.md"),
}
PRIMARY_SPEC = {
    "E02": "docs/platform-decisions.md",
    "E03": "docs/reuse-attribution.md",
    "E04": "docs/remote-control-contract.md",
    "E05": "docs/reference-inventory.md",
    "E06": "docs/reference-inventory.md",
    "E07": "docs/reference-inventory.md",
    "E08": "docs/reference-inventory.md",
    "E09": "docs/reference-inventory.md",
    "E10": "docs/reference-inventory.md",
    "E11": "docs/reference-inventory.md",
    "E12": "docs/reference-inventory.md",
    "E04.1": "docs/visual-baseline.md",
    "E04.2": "docs/remote-control-contract.md",
    "E04.3": "docs/remote-control-contract.md",
    "E04.4": "docs/remote-control-contract.md",
    "E05.1": "docs/visual-baseline.md",
    "E06.3": "docs/remote-control-contract.md",
    "E07.1": "docs/platform-decisions.md",
    "E07.3": "docs/remote-control-contract.md",
    "E07.4": "docs/remote-control-contract.md",
    "E07.5": "docs/platform-decisions.md",
    "E09.4": "docs/platform-decisions.md",
    "E10.2": "docs/remote-control-contract.md",
    "E10.5": "docs/platform-decisions.md",
    "E11.1": "docs/remote-control-contract.md",
    "E11.3": "docs/platform-decisions.md",
    "E11.4": "docs/platform-decisions.md",
    "E11.5": "docs/platform-decisions.md",
    "E12.2": "docs/visual-baseline.md",
    "E12.3": "docs/platform-decisions.md",
    "E12.4": "docs/reuse-attribution.md",
    "E12.5": "docs/reuse-attribution.md",
}
SCREEN_FOCUS = {
    "E02": "S04/S07/S09/S11/S13: source requirements are not proof of LG capability.",
    "E03": "S01-S13: retain source-scoped identities and record asset provenance.",
    "E04": "S03/S12: TV guide-only; Favorites is a group; Movies and TV Shows are separate tabs. Long Back belongs to LG.",
    "E05": "S01/S02/S12: seven repository screenshots cover only splash and onboarding; source gates control fields.",
    "E06": "S04-S06: TV guide-only; Favorites is a group, not a tab; use the guide focus/time contract.",
    "E07": "S07/S08: follow rendered Options order and player/mini Back ladder, subject to E02 playback evidence.",
    "E08": "S10: separate Movies and TV Shows tabs on TV; do not copy Android TV's On Demand tab.",
    "E09": "S05/S11: TV default-buffer steppers differ from per-record custom buffers; local DVR needs E02 proof.",
    "E10": "S09: rendered tile menu starts Remove then Move Tile; nine decoders are not guaranteed.",
    "E11": "S12/S13: use current 11-category settings rail, not historical App Behaviors/Network/Multiview panes.",
    "E12": "S01-S13: only splash/onboarding have repository images; create webOS captures for remaining states.",
}


def reference_for(alias):
    """Return primary spec and Beads note for an E02-E12 epic or child."""
    epic = alias.split(".")[0]
    if epic == "E01":
        return None
    docs = REFERENCE_DOCS[epic]
    primary = PRIMARY_SPEC.get(alias, PRIMARY_SPEC[epic])
    assert primary in docs, (alias, primary)
    note = (f"{REFERENCE_MARKER}: Read {', '.join(docs)}. "
            f"Reference inventory IDs: {SCREEN_FOCUS[epic]} "
            "Follow pinned Apple/Android source links inside these documents; "
            "repository-only visual baseline is not a current device capture. "
            "E02 hardware findings and E12 visual/device verification gate parity claims.")
    return primary, note

# Alias, title, priority, label, reference paths, five (title, scope/acceptance, blockers).
EPICS = [
    ("E01", "Establish the reference specification", 1, "parity",
     "Apple Features/, Design/, Shared/RemoteControlMap.swift; Android feature/, core/remote/", [
        ("Pin and inventory upstream behavior", "Enumerate every TV screen, overlay, menu, setting, default and visibility rule with pinned source locations. Distinguish runtime behavior from stale README/design claims.", ""),
        ("Inventory repository visual references", "Product owner selected repository-only references. Index all checked-in tvOS screenshots, measure source-defined colors and layout tokens, mark unpictured guide/player/VOD/DVR/settings states and missing capture metadata/recordings explicitly, and hand webOS visual regression to E12.2. Do not claim current-device runtime captures.", "E01.1"),
        ("Specify navigation and remote actions", "Write context/state tables for short/long/repeat keys, Back, dialogs, mini-player and focus restoration. Map Magic Remote and conventional keys; preserve LG long-Back Home and root exit behavior.", "E01.1"),
        ("Resolve cross-platform differences", "Document tvOS/Android discrepancies and selected webOS behavior; tvOS is primary. Separate phone-only features and obtain explicit product decisions for ambiguous differences.", "E01.1 E01.3"),
        ("Establish reuse and attribution requirements", "Inventory source/assets and GPL-3.0-or-later obligations, third-party notices, TMDB attribution and branding permissions required for distribution. Record corresponding-source requirements.", "E01.1"),
    ]),
    ("E02", "Prove webOS feasibility", 1, "feasibility",
     "LG specifications/web-api-and-web-engine, streaming-protocol-drm, video-audio-220; guides/magic-remote, back-button, js-service-faq", [
        ("Prove authenticated provider access", "On a packaged app test CORS, HTTP/HTTPS, redirects, LAN, credentials, artwork, media headers and custom User-Agent. Identify exact TV model/firmware; demonstrate a documented on-TV transport or limitation for each case.", "E01.1"),
        ("Prove playback coverage", "Test native/MSE HLS, DASH, progressive, continuous TS, codec/audio combinations, tracks, subtitles, seek, HDR, speed and diagnostics on retail hardware. Record fixtures and select supported engines; native non-1x speed is documented unsupported.", "E01.1"),
        ("Prove simultaneous playback", "Measure 1/2/4/9 streams where feasible, resolution combinations, video-plane composition, audio ownership, decoder limits and resource-exhaustion recovery. Publish model-specific evidence; do not promise nine streams.", "E02.2"),
        ("Prove storage and lifecycle capabilities", "Test persistent data, recording/download destinations, quota, local timeshift, service APIs, foreground/background, termination and interrupted writes. Establish Store-permitted capabilities and cleanup on physical TVs.", "E01.1"),
        ("Approve capability decisions", "Evaluate cloud authentication/sync, companion discovery/control, system PiP, home integration and Store API availability. Consolidate spike evidence into ADRs, capability matrix and explicit product decisions. Record hardware needs and remaining blockers.", "E01.4 E02.1 E02.2 E02.3 E02.4"),
    ]),
    ("E03", "Build the application foundation", 1, "foundation",
     "Apple Models/, Networking/, Shared/; Android core/data/, core/network/, core/security/", [
        ("Bootstrap application and IPK build", "Create TypeScript/React packaged app with Chromium 87-compatible output, metadata, icons, versioning and offline assets. Reproducible IPK installs/launches on webOS 22. Keep prototypes possible before the full capability decision.", "E01.5"),
        ("Implement domain models and repositories", "Define validated source-scoped identities for channels, programs, VOD, recordings, preferences and capabilities; prevent cross-playlist collisions and document adapter boundaries.", "E01.1 E01.4 E03.1"),
        ("Implement persistence and migrations", "Implement IndexedDB repository adapters, transactional imports, schema upgrades, eviction, interrupted-write recovery and source-specific deletion without damaging unrelated data.", "E03.2 E02.4"),
        ("Implement networking and credential handling", "Use proven transport with cancellation, timeouts, coordinated auth refresh, redirect rules, supported credential persistence and log redaction. Do not forward credentials to unrelated hosts.", "E03.2 E02.1 E02.4"),
        ("Implement platform and session lifecycle", "Handle suspend/resume, network changes, screensaver behavior, termination and resource cleanup with deterministic recovery; verify on real TVs.", "E03.3 E03.4 E02.2"),
    ]),
    ("E04", "Reproduce the tvOS shell and input system", 1, "ui",
     "Apple Design/, Features/Home/, Shared/RemoteControlMap.swift; Android ui/tv/, core/remote/", [
        ("Build design tokens and TV components", "Reproduce typography, pills, cards, focus rings, dialogs, rails, forms, translucency and motion from measured references. Validate overscan, scaling and readability.", "E01.2 E03.1"),
        ("Build routes overlays and Back handling", "Implement ordered dismiss/pop/minimize transitions, pane exits and stable focus restoration; use LG platformBack at entry. Cover nested dialogs and fullscreen editor returns.", "E01.3 E04.1"),
        ("Implement remote action mapping", "Implement context-specific short/long/repeat dispatch without pre-firing short actions on holds. Round-trip upstream player/guide schema, unknown-value fallback, reset and dynamic hints; do not remap system Back.", "E01.3 E04.2 E03.3"),
        ("Implement pointer wheel and keyboard behavior", "Pointer/D-pad switching retains meaningful focus; wheel scrolling and form/system-keyboard interaction never trap navigation. Every action is reachable by five-way input.", "E04.2"),
        ("Implement application tabs and shell states", "Match audited tab order/visibility, search entry, launch destination, splash and restoration; provide loading, empty and error states with deterministic focus.", "E01.4 E04.2 E03.3"),
    ]),
    ("E05", "Implement onboarding and all provider types", 1, "providers",
     "Apple Features/Onboarding/, Networking/, Features/Settings/; Android feature/onboarding/, core/network/, core/parser/", [
        ("Implement onboarding and initial synchronization", "Implement welcome, source selection, forms, category selection, progress, cancel/retry and partial failure. Verify credentials and first-use navigation across all three adapters.", "E04.4 E04.5 E05.2 E05.3 E05.4"),
        ("Implement Dispatcharr adapter", "Implement admin/API-key auth, capability detection, pagination, channels/groups, EPG bindings, stream selection and VOD/DVR contracts. Validate fixtures and a real server; preserve provider connection semantics.", "E03.3 E03.4"),
        ("Implement Xtream Codes adapter", "Normalize account validation, live categories/streams, EPG, movies, series, episodes and catchup metadata. Validate pagination, credentials, source identity and playback URL fallback semantics.", "E03.3 E03.4"),
        ("Implement M3U and XMLTV ingestion", "Incrementally parse attributes, duplicate URLs, malformed entries, encodings and supported compression without blocking navigation. Use workers where appropriate and bounded memory; preserve usable data on failed refresh.", "E03.3 E03.4"),
        ("Implement playlist management", "Implement add/edit/delete, Set Active, ordering, LAN/WAN selection, VOD toggle, EPG override, refresh and cache reset. Editing a non-active source must never change the wrong playlist.", "E05.1 E04.3"),
    ]),
    ("E06", "Implement Live TV guide favorites and search", 1, "guide",
     "Apple Features/LiveTV/, Features/Search/, Features/Home/FavoritesStore.swift; Android docs/guide-semantics.md, core/guide/, feature/livetv/", [
        ("Implement channel lists groups and collections", "Match sorting/filtering, group sidebar/pills, visibility, numbers, favorites ordering and retained selection. Define source-scoped collection behavior from the audit.", "E05.2 E05.3 E05.4 E04.3 E04.5"),
        ("Implement EPG identity and merging", "Test one-to-many TVG matches, Dispatcharr EPG bindings, source precedence, timezone/DST, history retention and invalid-empty-refresh rejection. Follow pinned guide semantics and retain valid cache after failure.", "E05.2 E05.3 E05.4"),
        ("Implement virtualized guide", "Match anchor-time vertical movement, 30-minute horizontal steps, lane scrolling, empty rows/gaps, jump-to-now/date, zoom, preview banner and now-line. Validate large data and focus retention.", "E06.1 E06.2 E04.4"),
        ("Implement program details and actions", "Current/future/past programs expose capability-correct play, favorite, reminder, recording, catchup and multiview actions; implement integrations and return focus to origin. Conditional features need explicit decisions.", "E06.3 E07.5 E09.1 E09.5 E10.1"),
        ("Implement global search and recent channels", "Implement source-scoped results, debounce/cancellation, navigation/tuning and recent history. Older responses cannot replace newer results; returning restores query and focus.", "E06.1 E06.2 E07.2 E08.1"),
    ]),
    ("E07", "Implement playback and player interface", 1, "playback",
     "Apple App/PlayerView.swift, Shared/PlayerSession.swift, Features/Player/; Android core/playback/, core/timeshift/, feature/player/", [
        ("Implement playback engine adapters", "Provide a single session API over proven native and MSE paths. Select engines by source/capability and distinguish unsupported media from network/auth failures. Transmuxing must not be treated as transcoding.", "E02.1 E02.2 E03.4 E03.5"),
        ("Implement tuning and recovery", "Tune all source types, cancel abandoned sessions, bound retries/fallback, report provider connection limits and recover network loss. Verify old events never reopen an abandoned channel and resources release.", "E07.1 E05.2 E05.3 E05.4"),
        ("Implement player chrome and options", "Match info card, auto-hide, transport, audio/subtitle selection, aspect ratio, sleep timer, audio-only and supported speed controls. Focus and disabled states reflect actual engine capabilities.", "E07.2 E04.3 E04.4"),
        ("Implement mini-player and overlays", "Keep one persistent session across fullscreen/minimized presentation. Channel list, recent channels, program-info and options overlays restore focus without decoder restart or duplicate audio.", "E07.3 E06.1"),
        ("Implement seeking catchup timeshift and diagnostics", "Separate provider catchup from local buffering. Validate seek bounds, restart-program, jump-live and available measured diagnostics. Local buffering requires E02.4 evidence; unknown metrics remain unavailable rather than fabricated.", "E07.3 E02.4 E06.2"),
    ]),
    ("E08", "Implement movies series and viewing state", 2, "vod",
     "Apple Features/VOD/, Networking/VODService.swift, Shared/VODCatalogStore.swift; Android feature/movies/, feature/ondemand/, core/data/vod/", [
        ("Implement VOD catalog synchronization", "Walk full pagination, refresh incrementally, deduplicate and isolate sources. Per-playlist VOD disablement excludes that library without destroying unrelated progress; verify large catalogs.", "E05.2 E05.3 E03.3"),
        ("Implement TV library pages", "Match movie/series presentation, categories, filters, sorting, alphabet navigation, artwork loading and focus restoration to selected TV reference.", "E08.1 E04.4 E04.5"),
        ("Implement VOD detail pages", "Implement backdrop/metadata, cast/person details, seasons, episodes, versions and attribution using available provider/TMDB data. Missing metadata yields usable fallback layouts.", "E08.2"),
        ("Implement viewing state", "Persist Continue Watching, resume/restart, completion, next-episode state, watched state, watchlist and hidden titles with source-correct identities and removal semantics.", "E08.1 E03.3"),
        ("Implement VOD playback actions", "Integrate resume, seeking, episode transitions, version selection, track preferences and supported skip intervals. Verify progress on exit, error, completion and source switches.", "E08.3 E08.4 E07.5"),
    ]),
    ("E09", "Implement DVR and reminders", 2, "dvr",
     "Apple Features/DVR/, Features/LiveTV/RecordProgramSheet.swift, Shared/RecordingCoordinator.swift, Shared/ReminderManager.swift; Android feature/dvr/, feature/reminders/", [
        ("Implement Dispatcharr recording management", "Schedule/edit/cancel/delete with pre/post-roll, external discovery and status polling. Verify API failures and correct channel IDs; no new server component is introduced.", "E05.2 E06.2 E04.4"),
        ("Implement DVR screens and playback", "Match Scheduled/Recording/Completed views, details, artwork, actions, resume and deletion. Integrate completed server recordings with playback and maintain focus after mutation.", "E09.1 E07.5 E08.4"),
        ("Implement commercial handling", "Integrate supported Comskip scheduling/post-processing and playback skip intervals. Do not imply support for non-Dispatcharr sources; verify pending/error/completed server states.", "E09.2"),
        ("Implement local recording and downloads if viable", "Use only proven on-TV APIs for capture/download, quota, partial-file recovery, interrupted capture, exhaustion, playback and deletion. Product decision required if not viable; leave an explicit parity gap rather than claiming feature completion.", "E02.4 E02.5 E09.2 E03.5"),
        ("Implement reminders", "Create/cancel reminders, pre-program banners, tune/dismiss, duplicate suppression and restart recovery. Background delivery only when proven; test clock changes and expired programs.", "E06.2 E07.2 E03.3 E02.4"),
    ]),
    ("E10", "Implement multiview", 2, "multiview",
     "Apple Features/Multiview/; Android feature/multiview/", [
        ("Implement staging and multiview session state", "Stage channels from guide/player, retain tile identity, prevent accidental duplicates and enforce proven model limits. If hardware cannot support concurrent playback, obtain a product decision before substituting behavior.", "E02.3 E02.5 E06.1 E07.2"),
        ("Implement multiview layouts and navigation", "Represent upstream 1–9 layout geometry with playable counts constrained by proven capabilities. D-pad/pointer selection and move mode preserve stable tile identity.", "E10.1 E04.4"),
        ("Implement multiview tile controls", "Implement make-audio, fullscreen tile, audio/subtitle menus, remove and replace; actions target only selected tile and restore focus after mutation.", "E10.2 E07.3"),
        ("Implement multiview resource coordination", "Enforce one audio owner, bounded provider connections and decoder admission; clean failed tiles and recover suspend/resume without leaks or stale audio.", "E10.3 E03.5"),
        ("Verify multiview limits and resolve parity gaps", "Run sustained playback and repeated entry/exit on target models; record reliable maximums. Static thumbnails are not multiview. Document any unachievable parity and obtain explicit acceptance.", "E10.4"),
    ]),
    ("E11", "Complete settings sync and TV integrations", 2, "settings",
     "Apple Features/Settings/SettingsDestination.swift, Features/Settings/, Shared/SyncManager.swift; Android feature/settings/, core/sync/, core/cast/companion/", [
        ("Implement two-pane settings navigation", "Match rail ordering, selection-on-focus, debounced pane swaps flushed on entry, full-screen editors, scroll retention and Back-to-rail behavior. Deep returns restore selected rail focus.", "E01.4 E04.2 E04.4 E05.5"),
        ("Implement every audited preference", "Cover Playlists, Live TV, Player, Movies & TV, DVR, Appearance, General, Remote Control, Sync/Categories, Developer and About. Every inventory row has exact copy/default, persistence and verified side effects or an accepted gap.", "E11.1 E06.4 E06.5 E07.4 E08.5 E09.3 E09.4 E10.5 E11.3 E11.4 E11.5"),
        ("Implement supported sync import and export", "Use E02.5-approved auth/backend and compatible schemas where possible. Test selective categories, merge conflicts, scoped cloud deletion and credential handling. No account is required for local usage; no unapproved external server.", "E02.5 E03.3 E03.4 E08.4 E09.5 E05.5"),
        ("Implement interoperable companion handoff and control", "Prove discovery/pairing, existing sender compatibility, tune/control/stop and disconnect. Track required upstream mobile changes explicitly; built-in Cast/AirPlay is not evidence of app-level receiver support.", "E02.5 E07.4"),
        ("Implement supported system integration", "Validate launch parameters, deep links, home/resume integration, accessibility semantics and feasible system PiP separately from mini-player. Preserve LG system keys and documented lifecycle behavior.", "E02.5 E04.5 E07.4 E03.5"),
    ]),
    ("E12", "Verify parity and deliver releases", 1, "release",
     "Both pinned repositories and all accepted parity contracts; LG distribute/app-self-checklist and distribute/app-approval-process", [
        ("Build automated validation and fixtures", "Establish CI for contracts, parsers, guide semantics, persistence migrations, remote state machines and failures. Seed realistic large/invalid fixtures and run gates on every change.", "E03.1 E03.2 E01.3"),
        ("Build visual and interaction regression coverage", "Create matching-state captures and scripted remote flows for every audited screen/menu, including loading, empty, error and disabled states. Expand coverage as features land; trace cases to inventory IDs.", "E01.2 E01.3 E04.5 E12.1"),
        ("Run real-TV compatibility and soak tests", "Verify webOS 22 and representative newer models: large catalogs, sustained playback, rapid tuning, network loss, resume, storage pressure and supported multiview. Every inventory item must be verified or an explicitly accepted gap.", "E11.2 E12.2 E03.5"),
        ("Ship Developer Mode beta artifacts", "Produce versioned reproducible IPKs and source/notices, install/upgrade documentation, sanitized diagnostics and known limitations. Release only with parity/compatibility evidence; do not silently claim untested model support.", "E12.3 E01.5"),
        ("Prepare and submit LG Store release", "Complete current LG requirements, privacy/support materials, assets, reviewer setup and release notes. Obtain final acceptance; submit through approved account and track review feedback to resolution.", "E12.4"),
    ]),
]


def bd(*args):
    result = subprocess.run(["bd", *args, "--json"], check=True, text=True, capture_output=True)
    return json.loads(result.stdout)


def main(references_only=False):
    existing = bd("list", "--all", "--limit", "0")
    ids = {}
    existing_by_alias = {}
    for issue in existing:
        for label in issue.get("labels", []):
            if label.startswith("plan-"):
                alias = label[5:]
                if alias in ids:
                    raise ValueError(f"Duplicate alias {alias}")
                ids[alias] = issue["id"]
                existing_by_alias[alias] = issue

    entries = []
    for alias, title, priority, label, references, children in EPICS:
        entries.append((alias, title, priority, label, references, None,
                        "Deliver the five approved child outcomes with traceable parity evidence.", ""))
        for number, (child_title, acceptance, blockers) in enumerate(children, 1):
            entries.append((f"{alias}.{number}", child_title, priority, label, references,
                            alias, acceptance, blockers))
    assert len(entries) == 72
    aliases = {entry[0] for entry in entries}
    graph = {entry[0]: entry[7].split() for entry in entries}

    def visit(node, active, done):
        if node in active:
            raise ValueError(f"Dependency cycle at {node}")
        if node in done:
            return
        active.add(node)
        for dependency in graph[node]:
            assert dependency in aliases, dependency
            visit(dependency, active, done)
        active.remove(node)
        done.add(node)

    done = set()
    for alias in aliases:
        visit(alias, set(), done)

    for alias, title, priority, label, references, parent, acceptance, blockers in entries:
        if references_only and alias not in ids:
            raise ValueError(f"Missing issue {alias}; bootstrap the board before linking references")
        if alias not in ids:
            kind = "epic" if parent is None else "task" if alias.startswith(("E01.", "E02.", "E12.")) else "feature"
            description = (f"Approved plan alias: {alias}\n\n{CONTRACT}\n"
                           f"Scope and outcome:\n{acceptance}\n\n"
                           f"Reference paths: {references}\nApple: {APPLE}\nAndroid: {ANDROID}\n\n{DOD}")
            args = ["create", title, "--type", kind, "--priority", str(priority),
                    "--description", description, "--acceptance", acceptance + "\n\n" + DOD,
                    "--labels", f"webos,parity,{label},plan-{alias}",
                    "--id", EPIC_IDS[alias.split(".")[0]] + ("." + alias.split(".")[1] if parent else "")]
            reference = reference_for(alias)
            if reference:
                args += ["--spec-id", reference[0], "--notes", reference[1]]
            if parent:
                args += ["--parent", ids[parent]]
            issue = bd(*args)
            ids[alias] = issue["id"]
        elif reference_for(alias):
            spec, note = reference_for(alias)
            current = existing_by_alias[alias]
            update = ["update", ids[alias]]
            if REFERENCE_MARKER not in (current.get("notes") or ""):
                update += ["--append-notes", note]
            if not current.get("spec_id"):
                update += ["--spec-id", spec]
            if len(update) > 2:
                bd(*update)
        print(f"{alias}\t{ids[alias]}\t{title}", flush=True)

    if not references_only:
        for alias, _, _, _, _, _, _, blockers in entries:
            for dependency in blockers.split():
                bd("dep", "add", ids[alias], ids[dependency])
    print(f"Verified manifest: {len(EPICS)} epics, {len(entries) - len(EPICS)} children, "
          f"{sum(len(v) for v in graph.values())} blocking edges; acyclic.")


if __name__ == "__main__":
    if sys.argv[1:] not in ([], ["--references-only"]):
        raise SystemExit("Usage: python3 scripts/create_backlog.py [--references-only]")
    main(references_only="--references-only" in sys.argv)
