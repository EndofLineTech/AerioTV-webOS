'use strict';

const Service = require('webos-service');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { fixtureTarget } = require('./fixture-target.cjs');

const service = new Service('com.endoflinetech.aeriotvfeasibility.network');

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
