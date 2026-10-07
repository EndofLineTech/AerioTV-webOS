# E02 webOS feasibility evidence and decision gates

**Evidence status:** official LG documentation and a packaged developer probe
have been inspected and tested on the development Mac. The owner has macOS
**webOS TV Simulator 26 v1.5.0** but simulator execution/results have not yet
been supplied; no simulator is running in this workspace (the default CLI
`emulator` target refused connection on 127.0.0.1:6622). **No physical LG TV
test or model/firmware identification has been supplied yet**. All simulator
and device outcomes below remain unknown. The product owner has a TV but
needs Developer Mode setup and will report model/webOS version later. This is
an evidence ledger, not approval to remove features.

The self-contained [probe](../spikes/webos-feasibility/README.md) packages as
`com.endoflinetech.aeriotvfeasibility_0.0.1_all.ipk`, including a jailed JS
service. A LAN fixture server runs on a development PC only during tests; no
external server is added to the product design. All fixtures are generated from
synthetic video/audio/logo patterns.

The [Simulator runbook](../spikes/webos-feasibility/README.md#run-on-macos-webos-tv-simulator-26-v150)
uses `ares-launch -s 26 build/app`, while TV testing uses the combined IPK.
[LG Simulator limitations](https://webostv.developer.lge.com/develop/tools/simulator-introduction)
explicitly state media/video specs differ from the TV, DRM/mediaOption are
unsupported, and some Luna APIs are unavailable. Simulator 26 uses a newer
web engine than the webOS 22 baseline, so a Simulator success cannot establish
webOS 22 browser compatibility or retail multiview support.

| Bead / capability | LG source evidence | Confirmed locally | Retail TV result / gate |
| --- | --- | --- | --- |
| E02.1 authenticated APIs and artwork | [CORS FAQ](https://webostv.developer.lge.com/faq/how-to-solve-the-problem-if-cors-occurs): the web app follows CORS and server policy is the usual control. [Web engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine): packaged `file:` apps do not have browser cookie support, unlike hosted `http(s):` apps. [JS service basics](https://webostv.developer.lge.com/develop/guides/js-service-basics) permits service networking, but a service is not automatically a native media-player header proxy. | Node fixture tests validate ACAO/preflight, 401/authorized synthetic header, redirect, HTTP Range 206/416 and protected media routes. Packaged app and service appear in CLI package info. | **Unknown**: packaged webview CORS, HTTP/LAN/TLS, image requests, custom User-Agent, cookie-less auth, service LAN requests and credentials on target TV. Test browser and bundled service independently. Never presume a browser `<video>` can carry an API auth header. |
| E02.2 media formats | [Streaming/DRM matrix](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm): HTTP(S) and HLS supported; seek/live seek supported, FF/RW and rates other than 1× **not supported**. HLS has tag/segment restrictions. MSE exists on webOS 22, but MSE availability is not proof that DASH/continuous TS works. [webOS 22 codec limits](https://webostv.developer.lge.com/develop/specifications/video-audio-220): H.264/HEVC/AAC/AC-3 support is container/model-dependent; UHD/HDR is model-specific. | Synthetic H.264 Baseline 640×360 + AAC LC MP4, HLS TS, and fragmented MP4 built locally. Probe exposes native video, MSE, seeks, rate attempt and measured browser fields. CLI packages the app; no TV playback tested. | **Unknown**: actual decoding, supported tracks/subtitles, MSE append, resolution, HDR, speed, DASH, continuous TS, diagnostics and recovery. Compare actual TV video/audio, not `canPlayType` alone. |
| E02.3 2–9 tile playback | LG [multi-video FAQ](https://webostv.developer.lge.com/faq/can-i-use-two-video-tags-at-the-same-time): simultaneous two `<video>` elements, or `<video>` + `<audio>`, are **not officially supported**; LG describes one media item at a time. [Multi-sound](https://webostv.developer.lge.com/develop/guides/multi-sound-playback) similarly cautions against multiple decoder-backed audio elements; emulator differs from retail hardware. | Probe creates 1/2/4/9 independent synthetic HLS videos, mutes all but tile 0, and logs per-tile playback/error; the tester must separately observe visibly moving video. | **High-confidence platform constraint, not device proof**. Run on retail TV. Even if two happen to work on one firmware, unsupported operation cannot be generalized to webOS 22+. Under TV-only rule, neither external transcoding nor a static-thumbnail imitation establishes upstream 9-stream parity. Product decision required if no supported on-TV path is proven. |
| E02.4 storage, download, lifecycle | [JS service basics](https://webostv.developer.lge.com/develop/guides/js-service-basics): service may download files but downloaded files are **not directly accessible from web apps**; native addons not allowed. [Service usage](https://webostv.developer.lge.com/develop/guides/js-service-usage): jailed service files under `/media/internal`; do not run services for minutes. [Service FAQ](https://webostv.developer.lge.com/develop/guides/js-service-faq): idle service exits after 5 s absent activity/subscription. [Lifecycle](https://webostv.developer.lge.com/develop/guides/app-lifecycle-management): visibility/foreground/suspend and relaunch are distinct. [DB8](https://webostv.developer.lge.com/develop/guides/db8-basic) offers app-aware JSON persistence, but not automatically durable video recording. | Probe exposes tiny browser localStorage/IndexedDB and service-file markers for testing again after relaunch. It explicitly releases media on hidden; it does **not** implement recording/download/time-shift. | **Unknown**: persistence/quota/survival, service sharing, background capture or Store-permitted recording on the actual TV. Small marker success must not be presented as local DVR feasibility. |
| E02.5 sync, companion, PiP/home, Store | [webOS 22 web engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) is Chromium 87; bundled JS service is Node 12.21. [appinfo](https://webostv.developer.lge.com/develop/references/appinfo-json) caps web-app graphics at 1920×1080 and supplies Back/relaunch metadata. [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide): required ACG enforcement arrives on later models (mandatory webOS TV 27); TV device info uses `systemconfig.query`. [Store self-checklist](https://webostv.developer.lge.com/distribute/app-self-checklist) requires D-pad, pointer and selected-state feedback. | Probe packaging sets `requiredACG: ["systemconfig.query"]` and explicitly handles 461/`platformBack()` at root. No native cloud SDK, LG home shelf or Cast receiver has been demonstrated. | **Unknown**: approved cloud auth path, companion discovery/pairing, PiP/home integration, Store acceptance. Hold product decisions until physical and policy checks; default is standalone local use. |

### Architecture impacts already supported by documentation

- Choose a **packaged** app for the TV-only product. An LG hosted app requires a remote hosted web app ([LG web-app types](https://webostv.developer.lge.com/develop/getting-started/web-app-types)); that conflicts with the owner's no-extra-server constraint. A development fixture server is distinct from a runtime dependency.
- If a Node service is used for authenticated API access, build for **webOS 22's Node 12.21.0**, its jail and service lifetime; do not assume browser cookies, arbitrary custom media headers, native addons, shared files or indefinite recording.
- Graphics use webOS's **1920×1080 web-app viewport** even on UHD TVs ([appinfo](https://webostv.developer.lge.com/develop/references/appinfo-json#resolution)); decoded 4K video capability is a separate model-specific question.
- HLS is a documented single-stream path, but provider format/codec and conditional CORS/auth must be tested per source. No format declaration or MSE feature flag is a substitute for picture+sound on hardware.

### Device evidence required before closing this epic

Record the model, firmware, SDK/webOS version, region/network setup, fixture
host URL **without credentials**, app/CLI versions, command outputs and per-step
results. Test native and MSE MP4/HLS against LAN fixtures first; then, if
permitted, test a real Dispatcharr/Xtream/M3U instance without saving logs or
secrets. Record per-format video/audio/subtitle behavior, connection/resource
usage, storage/reboot survival, root Back, and how many simultaneous *visible
moving* videos remain stable over time. A second physical model/newer firmware
is required before claiming compatibility across webOS 22+.

`aerio-c1x.5` remains blocked on E02.1–E02.4 and product approval; the
documentation findings above cannot close the retail-device acceptance gates.

The latest checked webOS CLI (`@webos-tools/cli@3.2.6`) builds a working probe
IPK, but its **host-side** npm dependency tree reported 10 advisories (including
one critical); the actual package excludes that tooling. Release packaging
assessment is tracked under `aerio-6cv.6` and blocks `aerio-6cv.4`. This is
separate from TV app runtime capability.
