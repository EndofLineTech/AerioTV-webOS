/* global webOS */
'use strict';

(function () {
  const entries = [];
  const logNode = document.getElementById('log');
  const tiles = document.getElementById('tiles');
  const input = document.getElementById('base');
  let mediaSubscription = null;

  function log(label, result) {
    const value = result === undefined ? '' : ' ' + JSON.stringify(result);
    const line = new Date().toISOString() + ' ' + label + value;
    entries.push(line);
    if (entries.length > 250) entries.shift();
    logNode.textContent = entries.slice(-40).join('\n');
    logNode.scrollTop = logNode.scrollHeight;
  }

  async function sendResults() {
    const lines = entries.filter((line) => line.length <= 1000).slice(-200);
    while (JSON.stringify({ lines }).length > 60000) lines.shift();
    const response = await fetch(baseUrl() + '/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lines }),
    });
    if (!response.ok) throw new Error('fixture server rejected results: HTTP ' + response.status);
    log('results sent to this Mac', { lines: lines.length });
  }

  function baseUrl() {
    const value = new URL(input.value);
    const numbers = value.hostname.split('.').map(Number);
    const isPrivate = numbers.length === 4 && numbers.every(function (n) {
      return Number.isInteger(n) && n >= 0 && n <= 255;
    }) && (numbers[0] === 10 ||
      (numbers[0] === 172 && numbers[1] >= 16 && numbers[1] <= 31) ||
      (numbers[0] === 192 && numbers[1] === 168));
    if (!isPrivate || value.protocol !== 'http:' || !value.port || value.username ||
        value.password || value.search || value.hash || value.pathname !== '/') {
      throw new Error('Enter only the private LAN IP and port of the included fixture server');
    }
    return value.origin;
  }

  async function request(path, options) {
    const response = await fetch(baseUrl() + path, options);
    const json = response.headers.get('content-type')?.includes('application/json');
    const body = json ? await response.json() : null;
    log(path, {
      status: response.status,
      redirected: response.redirected,
      cors: response.headers.get('access-control-allow-origin'),
      contentRange: response.headers.get('content-range'),
      userAgent: body?.userAgent || undefined,
    });
    return response;
  }

  async function networkChecks() {
    for (const [path, options] of [
      ['/cors', {}], ['/no-cors', {}], ['/redirect', {}],
      ['/auth', {}], ['/auth', { headers: { 'X-Probe-Token': 'probe-token' } }],
      ['/protected-no-cors/index.m3u8', { headers: { 'X-Probe-Token': 'probe-token' } }],
      ['/vod.mp4', { headers: { Range: 'bytes=0-99' } }],
    ]) {
      try { await request(path, options); }
      catch (error) { log(path + ' browser request failed', { name: error.name, message: error.message }); }
    }
    const art = new Image();
    art.crossOrigin = 'anonymous';
    art.onload = function () { log('/icon.png CORS artwork loaded', { width: art.width }); };
    art.onerror = function () { log('/icon.png CORS artwork failed'); };
    art.src = baseUrl() + '/icon.png';
  }

  function serviceCall(method, parameters) {
    if (typeof webOS === 'undefined' || !webOS.service?.request) {
      log('webOSTV.js/service API unavailable');
      return;
    }
    webOS.service.request('luna://com.endoflinetech.aeriotvfeasibility.network', {
      method: method,
      parameters: parameters,
      onSuccess: function (response) { log('service ' + method, response); },
      onFailure: function (error) { log('service ' + method + ' failed', { code: error.errorCode, text: error.errorText }); },
    });
  }

  function device() {
    const video = document.createElement('video');
    const mse = window.MediaSource;
    const mime = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    log('browser capabilities', {
      userAgent: navigator.userAgent,
      width: window.innerWidth,
      height: window.innerHeight,
      hls: video.canPlayType('application/vnd.apple.mpegurl'),
      mp4: video.canPlayType(mime),
      mse: Boolean(mse),
      mseH264AAC: Boolean(mse?.isTypeSupported(mime)),
      qualityApi: typeof video.getVideoPlaybackQuality === 'function',
    });
    if (typeof webOS === 'undefined' || !webOS.service?.request) {
      log('Device information requires the bundled webOSTV.js on a TV');
      return;
    }
    webOS.service.request('luna://com.webos.service.tv.systemproperty', {
      method: 'getSystemInfo',
      parameters: { keys: ['modelName', 'sdkVersion', 'firmwareVersion', 'boardType', 'UHD'] },
      onSuccess: function (result) {
        log('retail TV system information', {
          modelName: result.modelName, sdkVersion: result.sdkVersion,
          firmwareVersion: result.firmwareVersion, boardType: result.boardType,
          UHD: result.UHD,
        });
      },
      onFailure: function (error) {
        log('TV system information failed', { code: error.errorCode, text: error.errorText });
      },
    });
  }

  function localStorageCheck() {
    try {
      const old = localStorage.getItem('aerio.feasibility.marker');
      localStorage.setItem('aerio.feasibility.marker', 'synthetic-marker-v1');
      log('localStorage', { old: old, current: localStorage.getItem('aerio.feasibility.marker') });
    } catch (error) { log('localStorage failed', { name: error.name }); }
    if (!window.indexedDB) { log('IndexedDB unavailable'); return; }
    const open = indexedDB.open('aerio.feasibility', 1);
    open.onupgradeneeded = function () { open.result.createObjectStore('probe'); };
    open.onerror = function () { log('IndexedDB open failed', { name: open.error?.name }); };
    open.onsuccess = function () {
      const db = open.result;
      const tx = db.transaction('probe', 'readwrite');
      const store = tx.objectStore('probe');
      const previous = store.get('marker');
      previous.onsuccess = function () {
        log('IndexedDB previous marker', { value: previous.result || null });
        store.put('synthetic-marker-v1', 'marker');
      };
      tx.oncomplete = function () { log('IndexedDB commit success'); db.close(); };
      tx.onerror = function () { log('IndexedDB transaction failed', { name: tx.error?.name }); db.close(); };
    };
    if (navigator.storage?.estimate) {
      navigator.storage.estimate().then(function (estimate) {
        log('storage estimate', { usage: estimate.usage, quota: estimate.quota });
      }).catch(function (error) { log('storage estimate failed', { name: error.name }); });
    }
  }

  function stopVideo() {
    if (mediaSubscription) {
      if (typeof webOS !== 'undefined' && webOS.service?.request) {
        webOS.service.request('luna://com.endoflinetech.aeriotvfeasibility.network', {
          method: 'stopMediaProbe',
          onFailure: function (error) {
            log('on-TV media stop failed', { code: error.errorCode, text: error.errorText });
          },
        });
      }
      mediaSubscription.cancel();
      mediaSubscription = null;
    }
    for (const video of tiles.querySelectorAll('video')) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (video.dataset.objectUrl) URL.revokeObjectURL(video.dataset.objectUrl);
    }
    tiles.replaceChildren();
    log('video released');
  }

  function videoState(video, index, eventName) {
    const quality = video.getVideoPlaybackQuality?.();
    log('video ' + index + ' ' + eventName, {
      readyState: video.readyState,
      networkState: video.networkState,
      error: video.error?.code || null,
      paused: video.paused,
      size: video.videoWidth + 'x' + video.videoHeight,
      time: Math.round(video.currentTime * 10) / 10,
      droppedFrames: quality?.droppedVideoFrames,
      playbackRate: video.playbackRate,
      audioTracks: video.audioTracks?.length,
      textTracks: video.textTracks?.length,
    });
  }

  function firstVideo() {
    const video = tiles.querySelector('video');
    if (!video) throw new Error('Start a media test first');
    return video;
  }

  function videoMetrics() {
    const video = firstVideo();
    videoState(video, 0, 'snapshot');
    log('media ranges', {
      duration: video.duration,
      seekable: video.seekable.length ? [video.seekable.start(0), video.seekable.end(0)] : [],
      buffered: video.buffered.length ? [video.buffered.start(0), video.buffered.end(0)] : [],
    });
  }

  async function playMSE() {
    if (!window.MediaSource) { log('MediaSource unavailable'); return; }
    const mime = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
    if (!MediaSource.isTypeSupported(mime)) { log('MSE type unsupported', { mime: mime }); return; }
    stopVideo();
    const player = document.createElement('video');
    player.controls = true;
    player.muted = true;
    tiles.appendChild(player);
    for (const eventName of ['loadedmetadata', 'playing', 'waiting', 'error', 'ended']) {
      player.addEventListener(eventName, function () {
        if (tiles.contains(player)) videoState(player, 0, eventName);
      });
    }
    const mediaSource = new MediaSource();
    player.src = URL.createObjectURL(mediaSource);
    player.dataset.objectUrl = player.src;
    mediaSource.addEventListener('sourceopen', async function () {
      try {
        if (!tiles.contains(player)) return;
        const response = await fetch(baseUrl() + '/fragmented.mp4');
        if (!response.ok) throw new Error('fixture HTTP ' + response.status);
        const bytes = await response.arrayBuffer();
        if (!tiles.contains(player)) return;
        const source = mediaSource.addSourceBuffer(mime);
        source.addEventListener('updateend', function () {
          if (mediaSource.readyState === 'open') mediaSource.endOfStream();
        }, { once: true });
        source.appendBuffer(bytes);
        await player.play();
        log('MSE appended fragmented MP4', { bytes: bytes.byteLength });
      } catch (error) { log('MSE failed', { name: error.name, message: error.message }); }
    }, { once: true });
  }

  function playMany(count, path) {
    const src = baseUrl() + path;
    stopVideo();
    for (let i = 0; i < count; i += 1) {
      const player = document.createElement('video');
      player.controls = true;
      player.muted = i > 0;
      player.loop = path !== '/protected/index.m3u8';
      player.preload = 'auto';
      for (const eventName of ['loadedmetadata', 'playing', 'waiting', 'stalled', 'error', 'ended']) {
        player.addEventListener(eventName, function () {
          if (tiles.contains(player)) videoState(player, i, eventName);
        });
      }
      tiles.appendChild(player);
      player.src = src;
      player.play().catch(function (error) { log('video ' + i + ' play failed', { name: error.name, message: error.message }); });
    }
    log('attempted ' + count + ' concurrent media elements', { type: path, audioOwner: 0 });
  }

  function playViaOnTVService() {
    if (typeof webOS === 'undefined' || !webOS.service?.request) {
      log('on-TV media probe unavailable: webOSTV.js service API missing');
      return;
    }
    const url = baseUrl() + '/auth';
    stopVideo();
    mediaSubscription = webOS.service.request('luna://com.endoflinetech.aeriotvfeasibility.network', {
      method: 'startMediaProbe',
      subscribe: true,
      resubscribe: false,
      parameters: { url: url },
      onSuccess: function (response) {
        if (!response.returnValue || response.active === false) {
          log('on-TV media probe stopped', { reason: response.reason || response.errorText || 'unknown' });
          stopVideo();
          return;
        }
        if (typeof response.url !== 'string') {
          log('on-TV media probe returned no local URL');
          stopVideo();
          return;
        }
        let local;
        try { local = new URL(response.url); }
        catch {
          log('on-TV media probe returned an invalid endpoint');
          stopVideo();
          return;
        }
        if (local.protocol !== 'http:' || local.hostname !== '127.0.0.1' ||
            local.pathname !== '/hls/index.m3u8' || !local.port) {
          log('on-TV media probe returned an unexpected endpoint');
          stopVideo();
          return;
        }
        log('on-TV media probe started', { port: response.port, leaseMs: response.leaseMs });
        const player = document.createElement('video');
        player.controls = true;
        tiles.appendChild(player);
        for (const eventName of ['loadedmetadata', 'playing', 'waiting', 'stalled', 'error', 'ended']) {
          player.addEventListener(eventName, function () {
            if (tiles.contains(player)) videoState(player, 0, eventName);
          });
        }
        player.src = response.url;
        player.play().catch(function (error) {
          log('on-TV media playback failed', { name: error.name, message: error.message });
        });
      },
      onFailure: function (error) {
        log('on-TV media probe failed', { code: error.errorCode, text: error.errorText });
        stopVideo();
      },
    });
  }

  const actions = {
    device: device,
    storage: localStorageCheck,
    'service-storage': function () { serviceCall('storage', {}); },
    requests: function () { networkChecks().catch(function (error) { log('request setup failed', { message: error.message }); }); },
    'service-request': function () {
      try { serviceCall('requestFixture', { url: baseUrl() + '/auth' }); }
      catch (error) { log('service setup failed', { message: error.message }); }
    },
    mp4: function () { playMany(1, '/vod.mp4'); },
    hls: function () { playMany(1, '/index.m3u8'); },
    mse: function () { playMSE().catch(function (error) { log('MSE setup failed', { message: error.message }); }); },
    protected: function () { playMany(1, '/protected/index.m3u8'); },
    proxy: playViaOnTVService,
    'proxy-stop': stopVideo,
    stop: stopVideo,
    seek: function () { const video = firstVideo(); video.currentTime = 3; videoState(video, 0, 'seek requested'); },
    rate: function () {
      const video = firstVideo();
      video.playbackRate = 1.25;
      setTimeout(function () { videoState(video, 0, 'speed 1.25x after 1s'); }, 1000);
    },
    metrics: videoMetrics,
    results: function () {
      const output = document.getElementById('export');
      output.style.display = 'block';
      output.value = entries.join('\n');
      output.focus();
      output.select();
      sendResults().catch(function (error) { log('sending results failed', { message: error.message }); });
    },
  };
  for (const [id, action] of Object.entries(actions)) {
    document.getElementById(id).addEventListener('click', function () {
      try { action(); } catch (error) { log(id + ' failed', { message: error.message }); }
    });
  }

  document.addEventListener('visibilitychange', function () {
    log('visibilitychange', { hidden: document.hidden });
    if (document.hidden && tiles.children.length) stopVideo();
  });
  document.addEventListener('webOSLaunch', function (event) {
    log('webOSLaunch parameter keys', Object.keys(event.detail || {}));
  });
  document.addEventListener('webOSRelaunch', function (event) {
    log('webOSRelaunch parameter keys', Object.keys(event.detail || {}));
  });
  window.addEventListener('focus', function () { log('window focus'); });
  window.addEventListener('blur', function () { log('window blur'); });
  window.addEventListener('keydown', function (event) {
    if (event.keyCode === 461) {
      log('Back on root; requesting platform exit');
      if (typeof webOS !== 'undefined' && webOS.platformBack) webOS.platformBack();
      return;
    }
    if (![37, 38, 39, 40].includes(event.keyCode)) return;
    if (event.target === input || event.target.tagName === 'VIDEO' || event.target.tagName === 'TEXTAREA') return;
    const targets = Array.from(document.querySelectorAll('button, input'));
    const index = targets.indexOf(document.activeElement);
    const next = index + (event.keyCode === 37 || event.keyCode === 38 ? -1 : 1);
    if (next >= 0 && next < targets.length) {
      targets[next].focus();
      targets[next].scrollIntoView({ block: 'nearest' });
      event.preventDefault();
    }
  });

  log('probe loaded; run Device first, then enter this computer’s private LAN IP');
})();
