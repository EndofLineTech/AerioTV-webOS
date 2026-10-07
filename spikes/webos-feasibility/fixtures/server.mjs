import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const mediaTypes = {
  'vod.mp4': 'video/mp4',
  'fragmented.mp4': 'video/mp4',
  'index.m3u8': 'application/vnd.apple.mpegurl',
  'icon.png': 'image/png',
};

function cors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'X-Probe-Token, X-Probe-User-Agent, Range');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges');
}

function send(response, status, body, method, type = 'application/json') {
  response.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  response.end(method === 'HEAD' ? undefined : body);
}

function assetName(pathname) {
  const stripped = pathname.replace(/^\/(protected|protected-no-cors)\//, '/').slice(1);
  if (Object.hasOwn(mediaTypes, stripped) || /^sample[0-9]+\.ts$/.test(stripped)) return stripped;
  return null;
}

export async function createFixtureServer({ host = '0.0.0.0', port = 8088, mediaDir } = {}) {
  if (!mediaDir) throw new Error('mediaDir is required; run npm run fixtures first');
  const server = http.createServer(async (request, response) => {
    let pathname;
    try {
      pathname = new URL(request.url, 'http://fixture.invalid').pathname;
    } catch {
      send(response, 400, '{}', request.method);
      return;
    }

    if (pathname !== '/no-cors' && !pathname.startsWith('/protected-no-cors/')) cors(response);
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      send(response, 405, '{}', request.method);
      return;
    }
    if (pathname === '/redirect') {
      response.writeHead(302, { Location: '/cors' });
      response.end();
      return;
    }
    if (pathname === '/auth' || pathname.startsWith('/protected/') ||
        pathname.startsWith('/protected-no-cors/')) {
      if (request.headers['x-probe-token'] !== 'probe-token') {
        send(response, 401, '{"authorized":false}', request.method);
        return;
      }
    }
    if (pathname === '/cors' || pathname === '/no-cors' || pathname === '/auth') {
      const body = JSON.stringify({
        ok: true,
        userAgent: String(request.headers['user-agent'] || ''),
        origin: String(request.headers.origin || ''),
      });
      send(response, 200, body, request.method);
      return;
    }

    const name = assetName(pathname);
    if (!name) {
      send(response, 404, '{}', request.method);
      return;
    }
    try {
      const file = join(mediaDir, name);
      const fileStat = await stat(file);
      const contentType = mediaTypes[name] || 'video/mp2t';
      response.setHeader('Content-Type', contentType);
      response.setHeader('Accept-Ranges', 'bytes');
      const range = request.headers.range;
      if (range) {
        const match = /^bytes=(\d+)-(\d*)$/.exec(range);
        if (!match || Number(match[1]) >= fileStat.size ||
            (match[2] && Number(match[2]) < Number(match[1]))) {
          response.writeHead(416, { 'Content-Range': `bytes */${fileStat.size}` });
          response.end();
          return;
        }
        const start = Number(match[1]);
        const end = match[2] ? Math.min(Number(match[2]), fileStat.size - 1) : fileStat.size - 1;
        response.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
          'Content-Length': end - start + 1,
        });
        response.end(request.method === 'HEAD' ? undefined : (await readFile(file)).subarray(start, end + 1));
      } else {
        response.writeHead(200, { 'Content-Length': fileStat.size });
        response.end(request.method === 'HEAD' ? undefined : await readFile(file));
      }
    } catch (error) {
      if (!response.headersSent) send(response, error.code === 'ENOENT' ? 404 : 500, '{}', request.method);
      else response.destroy(error);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
  const address = server.address();
  return {
    baseUrl: `http://${host}:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixture = await createFixtureServer({
    mediaDir: fileURLToPath(new URL('../build/media/', import.meta.url)),
  });
  console.log(`Fixture server listening on ${fixture.baseUrl} (enter this computer's LAN IP, not 0.0.0.0, on the TV)`);
}
