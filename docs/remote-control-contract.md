# E01 TV navigation and remote contract

Sources: Apple pinned `Shared/RemoteControlMap.swift:24-249`, `Shared/RemoteControlStore.swift:4-49,56-141`, `Shared/TVPressGesture.swift:5-55`, `Features/Settings/RemoteControlSettingsView.swift:39-205`, `Features/Home/HomeView.swift:8332-8510`, `Features/Settings/TVSettingsSplitView.swift:9-25`, `App/PlayerView.swift:2170-2250,4296-4375`; Android pinned `core/remote/RemoteControlMap.kt:34-98,198-239`, `docs/guide-semantics.md:103-150`; [LG Magic Remote](https://webostv.developer.lge.com/develop/guides/magic-remote), [LG Back](https://webostv.developer.lge.com/develop/guides/back-button). tvOS behavior wins where defaults differ.

The multiview row of the upstream state table remains reference-only while
E10 is deferred; it is not a current remote action or visible app route.

## Available physical input

| LG input | Key code / web event | Rule |
| --- | --- | --- |
| Left/Up/Right/Down/OK | 37/38/39/40/13 | Five-way mandatory, even in Magic Remote pointer mode. Hold is implemented only on actually delivered keydown/up/repeat edges. |
| Back short | 461 | Context dismiss/return; at entry use `webOS.platformBack()` (system exit prompt on webOS 6+). **Never a configurable slot.** |
| Back long, Home, Power, Volume, Mute | LG system-controlled | Do not intercept/retarget held Back (LG exits Home) or system keys. Surface Stop on an in-app control if needed. |
| Play/Pause/FFWD/Rewind/Stop | Conventional-remote codes 415/19/417/412/413 | Feature-detect events; map supported keys, do not require Magic Remote to have them. Stop defaults to explicit stop/close in relevant playback context after device check. |
| Channel +/- | LG Magic Remote documentation labels these N/A for apps | Do not assume delivery; use Up/Down for surfing. Expose map slots only for tested remotes/events. |
| Red/Green/Yellow/Blue | 403/404/405/406 on compatible remotes | Optional shortcuts only; no essential action depends on color keys. |
| Pointer click / wheel | Mouse/click/wheel events | Same semantic action as focused OK; wheel scroll does not change the guide's anchor-time contract. Arrow press returns to five-way focus mode; keep visible focus. |

## Default action maps (tvOS source, *not* the legacyScheme)

| Slot | Fullscreen live player | TV guide |
| --- | --- | --- |
| OK short | Toggle controls | Play focused channel |
| OK hold | No mapped player action | Program menu (Swift wire value `programInfo`) |
| Up short / Down short | Channel up / down (if channel-flip preference on) | Move one row keeping anchor time; cannot remap guide Up/Down |
| Up hold / Down hold | Recently watched / global Search | Normal focus/repeat, not configurable guide slots |
| Left short / Right short | Channel list / previous channel | Navigate timeline, 30 minutes/press at pinned guide behavior; custom action handling must retain edge escape |
| Left hold / Right hold | Return to guide / show program info | Timeline back or open sidebar in sidebar mode / close mini-player |
| Play/Pause | Play/pause | Resume mini-player |
| FFWD / Rewind | Seek forward / backward if applicable | Page down / up |
| Channel +/- (if delivered) | Channel up / down | Page up / down |
| Back | Fixed chrome/mini/tab ladder | Fixed guide/dialog/tab ladder |

`RemoteControlMap.swift:190-249` is the current map. `legacyScheme` (`:165-188`) is a dormant fallback reference, not a selectable preset. `RemoteControlSettingsView.swift:70-99,313-333` curates what can be assigned: player slots choose Channel Up/Down, Previous, Recent, Search, Toggle Controls, Program Info, Options, Seek ±, Return to Guide, Channel List, Do Nothing; guide slots distinguish **Program menu** (wire `programInfo`) from **Program info** (wire `programDetails`), plus Navigate, Play, Record, Open Sidebar, timeline ±, page ±, jump Now/Top, focus groups, resume player, and Close Mini only on Right hold. Back is never selectable. Actual player options (speed, audio, subtitle, etc.) live in the player UI even when absent from the curated remap picker.

### Schema and fallbacks

Preserve `{"version":1,"preset":"default|custom","player":{slot:action},"guide":{slot:action}}`. Missing known slots resolve against the standard map; explicit `none` remains none; unknown slot/action strings are ignored. Stored `preset=default` uses current defaults, not a stale stored slot dump; unrecognized preset discards the blob. The Android snapshot writes an extra `guideKeys:2` migration marker, and has extra guide actions `jumpToDay`, `programMenu`; Apple uses `programInfo`, `programDetails`, `openGroupSidebar` (`RemoteControlMap.kt:77-98,147-169,243-285` versus Swift). Maintain tolerant cross-platform parsing and **do not claim byte-identical guide action sets**; use tvOS semantics for webOS and add migration tests before importing custom maps from either mobile platform.

## Navigation state transitions

| Context / action | Result / focus invariant |
| --- | --- |
| App launch with zero playlists | Welcome, or Live TV empty state after Skip; focus first actionable item, never hidden list controls. |
| Top tab strip | Live TV always; DVR/Movies/TV Shows only when content/capability allows; Favorites is a group. Search is a separate action circle. Switching tabs remembers a meaningful focused item. |
| Guide Up/Down | Focus program in adjacent row containing `viewportLeft + 15 minutes`; vertical press does not shift time. Rows scroll when focus reaches their lane edge. An empty row remains playable. |
| Guide Left/Right | Pan by 30 min; focus follows anchor; held Left must not also fire short-Left. In Sidebar Menu mode an unassigned hold-Left opens sidebar; Top Group Pills mode defaults to earlier timeline. |
| Guide sidebar Back | Close drawer, revert pending preview and restore focused guide cell. Empty group retains a reachable way back to group picker. |
| Program info / action sheet Back | Close topmost sheet/dialog first; return focus to originating program. |
| Fullscreen player OK | Reveal or hide chrome; secondary options from focused Options pill. Idle chrome auto-hides; focus is restored on reopen. |
| Fullscreen player Back | If chrome hidden, show it; if chrome shown, minimize to guide. Options/track/picker sheets dismiss before exiting player; explicit Stop/close releases playback without promoting mini. |
| Mini-player Back on Live TV | Single Back waits 300 ms then expands player; second within 300 ms jumps guide top. Back on a different tab first returns to Live TV. |
| Other tab content Back | Return focus to that tab's pill; Back on pill selects Live TV and focuses top guide channel (`HomeView.swift:8428-8462`). VOD detail and settings deep pages pop first. |
| Settings rail focus / OK/Right | Focus selects category after ~150 ms; OK/Right flushes pending selection then enters matching detail. Left/Back from detail returns to rail; Back on rail returns tab bar. Deep editor Back pops its own stack first and restores pane/rail. |
| Multiview Select / hold / move mode | Select tile changes audio ownership or chrome per state; hold opens per-tile context menu (except sole-tile behavior); Menu/Back cancels move or dismisses topmost menu. Refocus source tile after removal/reorder. |
| App entry Back | Use LG system exit prompt, not a blank page or an uncloseable history trap. |

Guide time-window, blank-cell, row-scrolling and badge rendering details: D `docs/guide-semantics.md:103-151` and A `Features/LiveTV/EPGGuideView.swift`. Source describes Android synthesizing a focusable 5+ minute “No info” gap where Apple leaves holes unfocused; choose Apple appearance while retaining focusable empty-channel strips, as recorded in [platform decisions](platform-decisions.md).

## Edge/state rules for implementation

- Delayed action fires **once** at the configured hold threshold while the key is held; release after it must not also fire the short action. Key repeat is focus/scroll acceleration, not repeated toggling or repeated tune requests. Blur, app suspend, keyboard launch, and pointer handoff cancel pending holds. Thresholds are per-surface (Apple `TVPressGesture.swift:45-55` uses 350 ms as default; sidebar guide hold is 320 ms or 500 ms depending on mode in pinned Android guide note); confirm on hardware before hard-coding global timing.
- In guide context, all short Up/Down are fixed focus navigation. Arrow remap never strands the user inside a grid, empty list or sidebar. Help hints derive from the effective map and hide only when Show Remote Hints is off.
- Focusable disabled settings actions can remain in the D-pad path visually dimmed, but OK must have no effect. Pop-up option sheets keep previous row focus on dismiss. Focus never jumps into the detail pane when entering Settings from the tab bar.
- WebOS `disableBackHistoryAPI` and explicit 461 handler versus History API are mutually exclusive implementation approaches: choose one after E02.1 prototype, and test root exit/modal dismissal on a real TV. The contract is behavior, not a required web API implementation.
