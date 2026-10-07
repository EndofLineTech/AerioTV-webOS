# E02 webOS feasibility evidence and decision gates

**Evidence status:** official LG documentation, a packaged developer probe,
host tests, and a **macOS webOS TV Simulator 26 v1.5.0** run on 2026-10-07
have been collected. The owner confirmed visible MP4 picture and audible tone.
**No physical LG TV test or model/firmware identification has been supplied
yet.** Simulator outcomes below are not retail-TV results. The owner has a TV
but needs Developer Mode setup and will report model/webOS version later.
This is an evidence ledger, not approval to remove features.

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
| E02.1 authenticated APIs and artwork | [CORS FAQ](https://webostv.developer.lge.com/faq/how-to-solve-the-problem-if-cors-occurs): the web app follows CORS and server policy is the usual control. [Web engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine): packaged `file:` apps do not have browser cookie support, unlike hosted `http(s):` apps. [JS service basics](https://webostv.developer.lge.com/develop/guides/js-service-basics) permits service networking, but a service is not automatically a native media-player header proxy. | Node fixture tests validate ACAO/preflight, 401/authorized synthetic header, redirect, HTTP Range 206/416 and protected media routes. A short-lived on-TV service **prototype** fetches protected no-CORS HLS and serves a loopback manifest/segments with a local nonce; host integration tests pass. In Simulator, synthetic authenticated Fetch and service request returned 200, and a protected loopback session started. Simulator accepted a no-CORS Fetch; this does **not** establish retail behavior. | **Unknown on retail TV**: packaged webview CORS, HTTP/LAN/TLS, image requests, custom User-Agent, cookie-less auth, service LAN requests, local video playback through the loopback proxy, and real provider credentials. A native HLS failure in Simulator cannot isolate proxy transport viability. |
| E02.2 media formats | [Streaming/DRM matrix](https://webostv.developer.lge.com/develop/specifications/streaming-protocol-drm): HTTP(S) and HLS supported; seek/live seek supported, FF/RW and rates other than 1× **not supported**. HLS has tag/segment restrictions. MSE exists on webOS 22, but MSE availability is not proof that DASH/continuous TS works. [webOS 22 codec limits](https://webostv.developer.lge.com/develop/specifications/video-audio-220): H.264/HEVC/AAC/AC-3 support is container/model-dependent; UHD/HDR is model-specific. | Synthetic H.264 Baseline 640×360 + AAC LC MP4, HLS TS, and fragmented MP4 built locally. Simulator MP4 reached `playing` at 640×360, with picture and tone confirmed by the owner; direct plain/protected HLS returned media error 4/`NotSupportedError`, `canPlayType(HLS)=""`. Fragmented MP4 appended through MSE, reached `playing` at 640×360, ran 12 seconds with zero reported dropped frames, and the owner confirmed visible picture (MSE test audio was muted). Seek on MP4 resumed from 3 s; rate property reported 1.25× in Simulator, not proven to behave on TV. | **Unknown on retail TV**: actual formats/decoding, supported tracks/subtitles, MSE append, resolution, HDR, speed, DASH, continuous TS, diagnostics and recovery. Simulator native-HLS failure does not override LG's documented device HLS support. |
| E02.3 2–9 tile playback — **deferred** | LG [multi-video FAQ](https://webostv.developer.lge.com/faq/can-i-use-two-video-tags-at-the-same-time): simultaneous two `<video>` elements, or `<video>` + `<audio>`, are **not officially supported**; LG describes one media item at a time. [Multi-sound](https://webostv.developer.lge.com/develop/guides/multi-sound-playback) similarly cautions against multiple decoder-backed audio elements; emulator differs from retail hardware. | The current probe UI hides the deferred 2/4/9 controls and keeps only single-stream checks. | Evidence remains useful when reactivated, but there is no current retail multiview test or product decision on an on-TV path. Do not infer parity from Simulator; E02.3/E10 do not gate the current epic or release. |
| E02.4 storage, download, lifecycle | [JS service basics](https://webostv.developer.lge.com/develop/guides/js-service-basics): service may download files but downloaded files are **not directly accessible from web apps**; native addons not allowed. [Service usage](https://webostv.developer.lge.com/develop/guides/js-service-usage): jailed service files under `/media/internal`; do not run services for minutes. [Service FAQ](https://webostv.developer.lge.com/develop/guides/js-service-faq): idle service exits after 5 s absent activity/subscription. [Lifecycle](https://webostv.developer.lge.com/develop/guides/app-lifecycle-management): visibility/foreground/suspend and relaunch are distinct. [DB8](https://webostv.developer.lge.com/develop/guides/db8-basic) offers app-aware JSON persistence, but not automatically durable video recording. | Simulator localStorage/IndexedDB markers persisted across a close-and-relaunch; the reported quota was host-sized and not a TV capacity limit. The bundled service attempted a tiny marker under `/media/internal` and returned `ENOENT` in Simulator. The probe releases media on hidden; it does **not** implement recording/download/time-shift. | **Unknown on retail TV**: service path presence, quota/persistence/reboot survival, service sharing, background capture or Store-permitted recording. Simulator ENOENT is not evidence of a retail TV failure. |
| E02.5 sync, companion, PiP/home, Store | [webOS 22 web engine](https://webostv.developer.lge.com/develop/specifications/web-api-and-web-engine) is Chromium 87; bundled JS service is Node 12.21. [appinfo](https://webostv.developer.lge.com/develop/references/appinfo-json) caps web-app graphics at 1920×1080 and supplies Back/relaunch metadata. [ACG guide](https://webostv.developer.lge.com/develop/guides/acg-guide): required ACG enforcement arrives on later models (mandatory webOS TV 27); TV device info uses `systemconfig.query`. [Store self-checklist](https://webostv.developer.lge.com/distribute/app-self-checklist) requires D-pad, pointer and selected-state feedback. | Probe packaging sets `requiredACG: ["systemconfig.query"]` and explicitly handles 461/`platformBack()` at root. No native cloud SDK, LG home shelf or Cast receiver has been demonstrated. | **Unknown**: approved cloud auth path, companion discovery/pairing, PiP/home integration, Store acceptance. Hold product decisions until physical and policy checks; default is standalone local use. |

### Architecture impacts already supported by documentation

- Choose a **packaged** app for the TV-only product. An LG hosted app requires a remote hosted web app ([LG web-app types](https://webostv.developer.lge.com/develop/getting-started/web-app-types)); that conflicts with the owner's no-extra-server constraint. A development fixture server is distinct from a runtime dependency.
- If a Node service is used for authenticated API access, build for **webOS 22's Node 12.21.0**, its jail and service lifetime; do not assume browser cookies, arbitrary custom media headers, native addons, shared files or indefinite recording.
- Graphics use webOS's **1920×1080 web-app viewport** even on UHD TVs ([appinfo](https://webostv.developer.lge.com/develop/references/appinfo-json#resolution)); decoded 4K video capability is a separate model-specific question.
- HLS is a documented single-stream path, but provider format/codec and conditional CORS/auth must be tested per source. No format declaration or MSE feature flag is a substitute for picture+sound on hardware.

Research on sync, existing Android companion-control protocol, token storage,
home/PiP and LG Store integration is recorded as **unapproved options** in
[the E02 capability note](webos-capability-options.md). Those paths need
physical-TV evidence and the owner's decision before becoming an ADR.

### Device evidence required before closing this epic

Record the model, firmware, SDK/webOS version, region/network setup, fixture
host URL **without credentials**, app/CLI versions, command outputs and per-step
results. Test native and MSE MP4/HLS against LAN fixtures first; then, if
permitted, test a real Dispatcharr/Xtream/M3U instance without saving logs or
secrets. Record per-format video/audio/subtitle behavior, connection/resource
usage, storage/reboot survival and root Back. Multistream checks are explicitly
deferred. A second physical model/newer firmware
is required before claiming compatibility across webOS 22+.

`aerio-c1x.5` remains blocked on E02.1/E02.2/E02.4 and product approval;
`aerio-c1x.3` and E10 are deferred by the owner without a target date. The
documentation findings above cannot close the active retail-device acceptance
gates.

The latest checked webOS CLI (`@webos-tools/cli@3.2.6`) builds a working probe
IPK, but its **host-side** npm dependency tree reported 10 advisories (including
one critical); the actual package excludes that tooling. Release packaging
assessment is tracked under `aerio-6cv.6` and blocks `aerio-6cv.4`. This is
separate from TV app runtime capability.

## Simulator 26 run — 2026-10-07

Report received through the probe's in-memory, Mac-only `/report` endpoint at
01:11 UTC. The raw report was not committed because it is a temporary device
diagnostic; the observations below retain only the decision-relevant fields.

| Test | Observation | Interpretation |
| --- | --- | --- |
| Identity | `WEBOS26_SIMULATOR`, SDK `11.0.0`, firmware `02.16.30`, board `O26_ATSC_US`; Chromium 132; app viewport 1920×1080 | Simulator 26, not a webOS 22 retail model. |
| Browser network | CORS fixture 200, no-CORS fixture **also** 200 without ACAO, redirect followed, tokenless auth 401, synthetic auth 200, protected-no-CORS fetch 200, Range returned 206, artwork loaded | Simulator Fetch alone does not establish actual retail CORS policy. Direct/authorized access to synthetic fixture is demonstrated only in Simulator. |
| Bundled JS service | `requestFixture` returned success/200; `startMediaProbe` returned a loopback port and 25 s lease | Service bus and synthetic LAN HTTP work at least for short requests on Simulator. The native player still failed to open the HLS URL; inspect MSE and retail-TV paths separately. |
| Media | MP4 `loadedmetadata` 640×360 and `playing`, with owner-confirmed picture and tone. Plain HLS, protected HLS and loopback HLS each failed error 4/`NotSupportedError`; `canPlayType(HLS)` was empty. | Single synthetic MP4 confirmed in Simulator. The HLS failures share a format-unsupported signature and do not prove the service proxy or device HLS is impossible. |
| Storage first write | `localStorage` and IndexedDB wrote first marker; `navigator.storage.estimate()` reported a host-sized quota | Neither persistence across relaunch nor physical TV quota has been measured yet. |

The follow-up Simulator report at 01:12:50 UTC showed MSE fMP4
`loadedmetadata`/`playing`, 640×360, `ended` at 12 seconds, zero reported
dropped frames. This path was intentionally **muted**; the owner confirmed
visible picture. A third report at 01:18:28 UTC confirmed browser localStorage
and IndexedDB retained the synthetic marker after the Simulator app relaunched;
MP4 seek moved to 3 seconds then resumed, the buffered/seekable range was
`[0,12]`, and `playbackRate` read 1.25× afterward. The initial Seek/Rate/Metrics
presses before opening media correctly logged “Start a media test first”; the
later presses succeeded. Service-storage and retail-TV checks remain pending.
See [HLS.js](https://github.com/video-dev/hls.js#compatibility) as an
**unselected** MSE/TS-transmux candidate if single-stream HLS stays unsupported
in a target browser. The developer probe now bundles HLS.js 1.7.3 (Apache-2.0)
to compare a direct synthetic TS-HLS source against authenticated TS-HLS via
the on-TV loopback service. Its Simulator and retail results are still pending;
successful MSE fMP4 alone does not establish TS-HLS playback. Retail LG
picture/audio and lifecycle checks still gate
E02.1/E02.2/E02.4 completion.

A fourth Simulator report at 01:19:34 UTC recorded `service storage failed`
with `ENOENT` for the probe's `/media/internal` marker attempt. Browser
LocalStorage remained readable. The service error is attributed only to
Simulator 26; do not extrapolate a retail filesystem or local-recording
decision from it.
