# LG webOS capability probe (E02)

This is a **separate developer-only diagnostic app**, not the AerioTV client.
The local fixture server runs only during development; the released TV app is
still TV-only and has no additional server dependency. This probe accepts
**synthetic data only**. Do not enter IPTV credentials, provider addresses or
real stream URLs. The app accepts a private IPv4 LAN address and the bundled
service only requests a fixed set of synthetic fixture routes, including its
short-lived authenticated HLS test.

## Build and run the fixture server on the development PC

Requires Node 20+ on the PC, FFmpeg with libx264 and AAC, `unzip`, and the
LG [webOS CLI](https://webostv.developer.lge.com/develop/tools/cli-installation)
(or install this folder's pinned CLI as below). The webOS TV 22 JS service uses
**Node 12.21.0** APIs only; this is independent of the PC's Node version.

```sh
cd spikes/webos-feasibility
npm ci
npm test
npm run fixtures
npm run serve
```

Keep `npm run serve` running while the TV tests. Find your computer's **LAN IPv4
address**, such as `192.168.1.10`. The fixture listens on port 8088 by default;
the TV must be on the same network and allowed to reach this computer through
its firewall. `0.0.0.0` in the server log is a bind address, **not** what you
enter on the TV. The short H.264/AAC MP4, HLS-TS, fragmented MP4, and logo
fixtures are generated locally under ignored `build/media/`.

## Prepare the TV for Developer Mode

Follow the [LG Developer Mode app instructions](https://webostv.developer.lge.com/develop/getting-started/developer-mode-app):

1. Connect TV and development computer to the same LAN. On the TV, install
   **Developer Mode** from LG Apps and sign in with an LG Developer account.
2. Enable **Dev Mode Status**, let the TV reboot, then turn on **Key Server** in
   the Developer Mode app. Note its on-screen passphrase privately; never
   commit or paste it into this repo. Extend the Dev Mode session before expiry.
3. In this directory, record the TV's LAN IP locally in CLI device setup:

```sh
npm exec -- ares-setup-device --add aerio-tv -i "host=<TV_LAN_IP>" -i "port=9922" -i "username=prisoner"
npm exec -- ares-setup-device --list
npm exec -- ares-novacom --device aerio-tv --getkey
npm exec -- ares-device --system-info --device aerio-tv
```

`ares-novacom` prompts for the TV passphrase. Device SSH keys and account
credentials belong in your local CLI configuration, not Git.

## Run on macOS webOS TV **Simulator** 26 (v1.5.0)

The owner has the macOS webOS TV Simulator 26 v1.5.0. LG stopped shipping a
VirtualBox **Emulator** after webOS 6; the version 26 tool is the **Simulator**.
It launches app files directly rather than installing an IPK.

**Prebuilt option:** After the dev-branch
[Build webOS feasibility probe](https://github.com/EndofLineTech/AerioTV-webOS/actions/workflows/webos-feasibility.yml)
workflow succeeds, download its `aeriotv-webos-feasibility` artifact and unzip
it. The archive contains `build/app` (select for **File → Launch App**),
`service` (select for **File → Add Service**), `build/media`,
`fixtures/server.mjs`, and the separate retail-TV `.ipk`. With Node 20+ on
your Mac, run `node fixtures/server.mjs` from the extracted root, then open
Simulator and choose the two folders via those menus. No npm or FFmpeg step is
needed when using this artifact. It expires after seven days; rebuild with the
source commands below if it has expired.

**Source option:** On the Mac where
Simulator is installed, generate fixtures and stage the app first:

```sh
cd spikes/webos-feasibility
npm ci
npm run fixtures
npm run package
npm run serve
```

Leave the fixture server running. In another Terminal window in that folder:

```sh
npm exec -- ares-launch -s 26 build/app
```

If CLI cannot find the simulator, use `-sp "<path to the installed Simulator>"`
or open Simulator and choose **File → Launch App**, selecting
`spikes/webos-feasibility/build/app` (the folder containing `appinfo.json`).
For the service probe, select **File → Add Service** and choose the `service/`
folder containing `package.json`, then enable it in **Tools → Service List**.
Simulator runs app and service separately; the retail TV needs the combined
IPK built by `npm run package`.

For the fixture URL enter the Mac's private LAN IPv4 address and port 8088,
even if Simulator is on the same computer. The probe intentionally rejects
`127.0.0.1` so the same setup can later be used on a retail TV. Copy the
Results text after testing and label it **Simulator 26 v1.5.0**, not retail
webOS 22 evidence. Simulator uses a newer web engine and different media
implementation; two videos, decoding, HDR, storage quota, background
recording and resource limits still require a physical TV.

## Install and exercise a packaged app

With the fixture server still running:

```sh
npm run package
npm exec -- ares-package --info out/com.endoflinetech.aeriotvfeasibility_0.0.1_all.ipk
npm exec -- ares-install --device aerio-tv out/com.endoflinetech.aeriotvfeasibility_0.0.1_all.ipk
npm exec -- ares-launch --device aerio-tv com.endoflinetech.aeriotvfeasibility
```

The build downloads **LG webOSTV.js v1.2.13** directly from LG, checks SHA-256
`507c759f65a035122afead166608e8c7f444961468c3570245f0982c8f855ff6`,
and packages its Apache-2.0 license. The IPK and generated media are ignored by
Git. The `@webos-tools/cli` package is a host-only devDependency: not shipped
inside the TV app.

On the TV, enter `http://<PC_LAN_IP>:8088` and select each on-screen probe.
Select **Device** first; save the model, SDK version, firmware, and board from
the log in your private test notes. Use `ares-inspect --device aerio-tv --app
com.endoflinetech.aeriotvfeasibility --open` for browser errors if a probe
doesn't return. **Send results to this Mac** posts a bounded snapshot of probe
events to the running fixture server; Simulator clipboard access is not needed.
On this Mac only, read the last submitted report with
`curl http://127.0.0.1:8088/report`. The report lives in server memory and is
not saved to disk; only loopback clients can retrieve it. The probe log
contains no passwords, token values, media URLs with query strings or response
bodies. Inspect before sharing it further anyway.

### Run order and evidence to record

| Buttons / scenario | Evidence needed |
| --- | --- |
| Device; CORS test; service request | Model/version, browser CORS/no-CORS, preflight token success/401, redirect, Range/206, image CORS, service status and custom User-Agent feasibility. System info uses `systemconfig.query` ACG when enforced. |
| One MP4, one HLS, one MSE | `loadedmetadata`, `playing`, errors, image/audio, MSE append, buffered ranges. Repeat with the actual target provider only **after** determining safe auth and permission, without sharing credentials/logs. DASH and continuous-TS are **not** covered by these fixtures. |
| Protected HLS; service request; on-TV media proxy | Browser native video normally cannot attach an auth header to every manifest/segment, and the second protected fixture has no CORS. Compare direct failure, the service's synthetic header request, and **Try protected HLS via on-TV JS service**. Observe actual picture/audio for at least 10 seconds; then **Stop on-TV media probe**. The service binds a short-lived loopback-only URL, not an external product server. Simulator success is not retail-TV proof. |
| Seek/Rate/Metrics | Seek result and seekable range, actual playback-rate behavior (LG docs list non-1× as unsupported), video resolution, audio/subtitle/decoded-frame API availability. |
| App storage and service marker | Run Storage/Service Storage, leave/relaunch/reboot and repeat; note survival, quota, errors and service/web-app data separation. Do not infer local DVR or indefinite background recording from small-marker success. |
| Home/Back/suspend | Press Back at probe root (LG exit behavior), open another TV app, relaunch, repeat playback and storage. Note foreground/hidden events, video cleanup and any screensaver interference. |

**Multiview is deferred.** The current probe UI includes only single-stream
playback checks; there are no 2/4/9-stream controls to run.

See [E02 capability evidence](../../docs/webos-feasibility.md) for source-cited
constraints and the exact decision gates. No TV tests have been recorded in the
repo yet; the owner will provide model/version when available.
