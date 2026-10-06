# E01 visual baseline — source-only evidence

The product owner selected **repository-only** references. Seven images are checked into the pinned Apple commit at [`docs/screenshots/appletv`](https://github.com/jonzey231/AerioTV/tree/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv); each image is 3840×2160 pixels. They show splash and first-run forms, **not** the guide, player, multiview, VOD, DVR or Settings. These images have no capture date, TV model, tvOS version or app build embedded in the repo; they may precede the pinned source. Android README explicitly says its TV screenshots are “coming soon.” Do not present either set as a verified current-build device capture.

## Pinned image index

| Image | Visible state; focus target | Source-backed caveat |
| --- | --- | --- |
| [01 splash](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/01.png?raw=1) | Black screen, centered square cyan logo with glow, white title and cyan Live TV · Movies · Series line | Source `App/SplashView.swift`; verify copy on implementation rather than assume splash image is current. |
| [02 welcome](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/02.png?raw=1) | Dark navy; centered brand/title/source-type list; Sync via iCloud row focused, Connect a Server and Skip for now | `Features/Onboarding/WelcomeView.swift:35-95,171-200`; webOS must use its approved sync path, not an inoperable iCloud control. |
| [03 source selection](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/03.png?raw=1) | Three full-width source rows; Dispatcharr Direct Connect focused | `Features/Onboarding/AddServerView.swift:104-164`; default form labels still come from source. |
| [04 Dispatcharr API key](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/04.png?raw=1) | Form, API Key selected in segmented method, Name field focused | `Features/Onboarding/AddServerView.swift:197-400`. |
| [05 Dispatcharr username/password](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/05.png?raw=1) | Same form, Username & Password method selected, Name focused | `Features/Onboarding/AddServerView.swift:197-400`. |
| [06 Xtream](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/06.png?raw=1) | Name, Server URL, Username, Password, LAN disclosure and Test Connection | `Features/Onboarding/AddServerView.swift:197-400`. |
| [07 M3U](https://github.com/jonzey231/AerioTV/blob/adad9b0ca082833abed1b56509474aaecf1cb0f7/docs/screenshots/appletv/07.png?raw=1) | Name, M3U URL, EPG URL optional, LAN disclosure, validation and Test Connection | A screenshot is not proof that LAN is still offered for M3U in the pinned build; honor source gating. |

**Measurement method:** Colors/point sizes below come from pinned SwiftUI definitions, not from inferring CSS pixels from screenshots. A 3840×2160 capture does not mean the layout units are 4K CSS pixels. Images alone cannot establish animation cadence or physical focus hit targets.

| Token / state | Source value / rule | Source |
| --- | --- | --- |
| Default dark background; card | `#0A1628`; `#0D1E35` | A `Design/ThemeManager.swift:29-76` |
| Dark-mode primary/secondary accent | `#1AC4D8`; `#1A8FA8` (unless custom theme/accent) | A `Design/ThemeManager.swift:29-52` |
| Dark primary text; live red | `#E8F4F8`; `#FF4757` | A `Design/Colors.swift:29-60,109-115` |
| Themes / color modes | AerioTV/Midnight/Sunset/Forest/Lavender/Monochrome/Light; dark default, optional light/system and true-black | A `Design/ThemeManager.swift:7-15,133-184` |
| TV font ladder | Display 52/42/34; headline 32/28/24; body 28/24/22; label 22/20/18 pt, multiplied by Text Size (85–150%) | A `Design/Typography.swift:4-52,196-217` |
| Settings row type/focus | Title 24 pt, eyebrow/value 22, footnote 20; 2 pt accent focus ring, 1 pt resting card border; Settings has **no focus scale** | A `Features/Settings/Components/SettingsMetrics.swift:13-42`; `TVSettingsSplitView.swift:304-330` |
| Settings root rail | 430 pt, min 80 pt rows; 60 pt start overscan; 6 pt row gap; 150 ms selection debounce, 180 ms crossfade | A `Features/Settings/TVSettingsSplitView.swift:60-70,152-180,220-240,277-325` |
| Settings detail width | 1200 pt maximum reading column | A `Features/Settings/Components/SettingsMetrics.swift:36-42` |
| Player Options panel | 460 pt wide, 560 pt max height, 16 pt corner radius, black 92% opacity | A `App/PlayerView.swift:4353-4379` |
| Guide focus geometry | Flat cell focus, white wash + 4 pt white border; 2 pt red now-line | D `docs/guide-semantics.md:137-151` (describes Apple rendering); validate in A `Features/LiveTV/EPGGuideView.swift` when implementing. |

### Reference coverage and validation

| Surface | Image available | E01 baseline | Future evidence needed |
| --- | --- | --- | --- |
| Splash/onboarding forms | Seven images | Images plus current-source layout/labels | Compare first webOS render to screenshots and current source. |
| Live guide, player, mini-player, multiview | None | Source geometry/controls documented in [inventory](reference-inventory.md) and [remote contract](remote-control-contract.md) | Generate deterministic webOS captures with sample channel/EPG fixtures; compare behavior with pinned source. |
| Movies/TV Shows, DVR, search, settings, dialogs | None | Pinned source route, conditional menu and theme tokens | Capture webOS matching states in E12.2; no claim of pixel-perfect matching from a missing reference image. |
| Transition recordings / animation timing | None | Code-defined 150/180/200 ms and Spring animations where explicit | Test on actual webOS hardware in E12; no invented upstream footage. |

The screenshot scope is a deliberate product-approved **source-only reference**. `aerio-6cv.2` owns implementation-time visual regression and state captures; E01 defines the method and marks absent source captures honestly rather than manufacturing baseline imagery.
