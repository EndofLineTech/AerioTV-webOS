'use strict';

const Service = require('webos-service');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { fixtureTarget } = require('./fixture-target.cjs');
const { createMediaProxy } = require('./media-proxy.cjs');

const service = new Service('com.endoflinetech.aeriotvfeasibility.network');
let activeProxy = null;
let activeSubscription = null;
let pendingSubscription = null;
let proxyStarting = false;

const startMedia = service.register('startMediaProbe', function (message) {
  if (!message.isSubscription) {
    message.respond({ returnValue: false, errorText: 'a subscription is required during media playback' });
    return;
  }
  if (activeProxy || proxyStarting) {
    message.respond({ returnValue: false, errorText: 'stop the previous media probe first' });
    return;
  }
  let source;
  try {
    source = fixtureTarget(message.payload && message.payload.url);
    if (source.pathname !== '/auth') throw new Error('use only the synthetic fixture');
  } catch (error) {
    message.respond({ returnValue: false, errorText: error.message });
    return;
  }
  proxyStarting = true;
  pendingSubscription = message.uniqueToken;
  const leaseMs = 25000;
  createMediaProxy({
    origin: source.origin,
    token: crypto.randomBytes(16).toString('hex'),
    leaseMs: leaseMs,
    onExpire: function () {
      activeProxy = null;
      activeSubscription = null;
      try { message.respond({ returnValue: true, active: false, reason: 'probe lease expired' }); }
      catch (error) { /* Client may have exited without canceling. */ }
    },
  }).then(function (proxy) {
    proxyStarting = false;
    if (pendingSubscription !== message.uniqueToken) {
      proxy.close();
      return;
    }
    pendingSubscription = null;
    activeProxy = proxy;
    activeSubscription = message.uniqueToken;
    message.respond({ returnValue: true, subscribed: true, active: true,
      url: proxy.url, port: proxy.port, leaseMs: leaseMs });
  }).catch(function (error) {
    proxyStarting = false;
    if (pendingSubscription !== message.uniqueToken) return;
    pendingSubscription = null;
    message.respond({ returnValue: false, errorText: error.code || 'loopback proxy unavailable' });
  });
});

startMedia.on('cancel', function (message) {
  if (message.uniqueToken === pendingSubscription) {
    pendingSubscription = null;
    return;
  }
  if (message.uniqueToken !== activeSubscription) return;
  const old = activeProxy;
  activeProxy = null;
  activeSubscription = null;
  if (old) old.close();
});

service.register('stopMediaProbe', function (message) {
  pendingSubscription = null;
  const old = activeProxy;
  activeProxy = null;
  activeSubscription = null;
  if (!old) { message.respond({ returnValue: true, stopped: true }); return; }
  old.close().then(function () { message.respond({ returnValue: true, stopped: true }); });
});

service.register('requestFixture', function (message) {
  let url;
  try {
    url = fixtureTarget(message.payload && message.payload.url);
  } catch (error) {
    message.respond({ returnValue: false, errorText: error.message });
    return;
  }
  const request = http.get(url, {
    headers: {
      'X-Probe-Token': 'probe-token',
      'User-Agent': 'AerioTV-webOS-feasibility/0.0.1',
    },
    timeout: 5000,
  }, function (response) {
    const result = { returnValue: true, status: response.statusCode,
      cors: response.headers['access-control-allow-origin'] || null,
      redirect: response.headers.location || null };
    response.resume();
    response.on('end', function () { message.respond(result); });
  });
  request.on('timeout', function () { request.destroy(new Error('timeout')); });
  request.on('error', function (error) {
    message.respond({ returnValue: false, errorText: error.message === 'timeout' ? 'timeout' : 'network error' });
  });
});

// Writes only a tiny, synthetic marker. This tests the service's own
// persistent storage and its separation from the web app, not DVR viability.
service.register('storage', function (message) {
  const directory = '/media/internal/com.endoflinetech.aeriotvfeasibility';
  const filename = path.join(directory, 'probe-marker.txt');
  fs.readFile(filename, 'utf8', function (previousError, previous) {
    const existedBefore = !previousError && previous === 'AerioTV feasibility marker v1';
    fs.mkdir(directory, { recursive: true }, function (mkdirError) {
      if (mkdirError) {
        message.respond({ returnValue: false, errorText: mkdirError.code || 'write failed' });
        return;
      }
      fs.writeFile(filename, 'AerioTV feasibility marker v1', function (writeError) {
        if (writeError) {
          message.respond({ returnValue: false, errorText: writeError.code || 'write failed' });
          return;
        }
        fs.readFile(filename, 'utf8', function (readError, text) {
          message.respond({ returnValue: !readError, existedBefore: existedBefore,
            readable: !readError && text === 'AerioTV feasibility marker v1',
            errorText: readError ? readError.code || 'read failed' : undefined });
        });
      });
    });
  });
});
