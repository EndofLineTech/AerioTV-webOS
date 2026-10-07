'use strict';

const http = require('http');

// A bounded proof of authenticated HLS via the app's own on-TV service.
// The caller validates that origin is the synthetic fixture on a private LAN.
// This module never accepts arbitrary media paths, sends only a synthetic
// header, and binds exclusively to loopback. It is NOT a production proxy.
async function createMediaProxy(options) {
  const { origin, token, leaseMs, onExpire } = options;
  const source = new URL(origin);
  if (source.protocol !== 'http:' || source.pathname !== '/' || source.search ||
      source.username || source.password || !source.port ||
      typeof token !== 'string' || !/^[a-zA-Z0-9-]{8,64}$/.test(token) ||
      !Number.isInteger(leaseMs) || leaseMs < 100 || leaseMs > 30000) {
    throw new Error('invalid synthetic media proxy settings');
  }
  const upstreamRequests = new Set();
  const clients = new Set();
  let closed = false;
  let timer;

  const server = http.createServer(function (request, response) {
    let incoming;
    try { incoming = new URL(request.url, 'http://127.0.0.1'); }
    catch { response.writeHead(400).end(); return; }

    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Range');
    response.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges');
    response.setHeader('Cache-Control', 'no-store');

    if (request.method === 'OPTIONS') { response.writeHead(204).end(); return; }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    if (incoming.searchParams.get('key') !== token || Array.from(incoming.searchParams.keys()).length !== 1) {
      response.writeHead(403).end();
      return;
    }
    const match = /^\/hls\/(index\.m3u8|sample[0-9]+\.ts)$/.exec(incoming.pathname);
    if (!match) { response.writeHead(404).end(); return; }
    const manifest = match[1] === 'index.m3u8';
    const headers = {
      'X-Probe-Token': 'probe-token',
      'User-Agent': 'AerioTV-webOS-feasibility/0.0.1',
    };
    if (request.headers.range && /^bytes=\d+-\d*$/.test(request.headers.range)) {
      headers.Range = request.headers.range;
    }
    const upstream = http.request(new URL('/protected-no-cors/' + match[1], source), {
      method: request.method, headers: headers, timeout: 5000,
    }, function (media) {
      const type = manifest ? 'application/vnd.apple.mpegurl' : 'video/mp2t';
      response.setHeader('Content-Type', type);
      if (media.headers['content-range']) response.setHeader('Content-Range', media.headers['content-range']);
      if (media.headers['accept-ranges']) response.setHeader('Accept-Ranges', media.headers['accept-ranges']);
      if (media.statusCode !== 200 && media.statusCode !== 206) {
        response.writeHead(media.statusCode || 502).end();
        media.resume();
        return;
      }
      if (manifest && request.method !== 'HEAD') {
        const chunks = [];
        let bytes = 0;
        media.on('data', function (part) {
          bytes += part.length;
          if (bytes > 65536) { upstream.destroy(new Error('manifest too large')); return; }
          chunks.push(part);
        });
        media.on('end', function () {
          if (response.destroyed) return;
          const lines = Buffer.concat(chunks).toString('utf8').split(/\r?\n/);
          if (!lines.every(function (line) {
            return !line || line.startsWith('#') || /^sample[0-9]+\.ts$/.test(line);
          })) { response.writeHead(502).end(); return; }
          const body = lines.map(function (line) {
            return /^sample[0-9]+\.ts$/.test(line) ? line + '?key=' + encodeURIComponent(token) : line;
          }).join('\n');
          response.writeHead(media.statusCode, { 'Content-Length': Buffer.byteLength(body) });
          response.end(body);
        });
      } else {
        if (media.headers['content-length']) response.setHeader('Content-Length', media.headers['content-length']);
        response.writeHead(media.statusCode);
        if (request.method === 'HEAD') { media.resume(); response.end(); }
        else media.pipe(response);
      }
    });
    upstreamRequests.add(upstream);
    upstream.on('close', function () { upstreamRequests.delete(upstream); });
    upstream.on('timeout', function () { upstream.destroy(new Error('upstream timeout')); });
    upstream.on('error', function () {
      if (!response.headersSent) response.writeHead(502).end();
      else response.destroy();
    });
    response.on('close', function () { if (!upstream.destroyed) upstream.destroy(); });
    upstream.end();
  });
  server.on('connection', function (socket) {
    clients.add(socket);
    socket.on('close', function () { clients.delete(socket); });
  });
  await new Promise(function (resolve, reject) {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  function close() {
    if (closed) return Promise.resolve();
    closed = true;
    clearTimeout(timer);
    for (const request of upstreamRequests) request.destroy();
    return new Promise(function (resolve) {
      server.close(resolve);
      for (const socket of clients) socket.destroy();
    });
  }
  timer = setTimeout(function () {
    close().then(function () { if (onExpire) onExpire(); });
  }, leaseMs);
  return {
    port: server.address().port,
    url: `http://127.0.0.1:${server.address().port}/hls/index.m3u8?key=${encodeURIComponent(token)}`,
    close: close,
  };
}

module.exports = { createMediaProxy };
