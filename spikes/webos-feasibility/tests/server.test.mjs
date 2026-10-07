import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFixtureServer } from '../fixtures/server.mjs';

let fixture;
let mediaDir;

before(async () => {
  mediaDir = await mkdtemp(join(tmpdir(), 'aerio-webos-fixture-'));
  await writeFile(join(mediaDir, 'vod.mp4'), Buffer.from('0123456789'));
  await writeFile(join(mediaDir, 'fragmented.mp4'), Buffer.from('fragmented'));
  await writeFile(join(mediaDir, 'index.m3u8'), '#EXTM3U\n#EXT-X-ENDLIST\n');
  fixture = await createFixtureServer({ host: '127.0.0.1', port: 0, mediaDir });
});

after(async () => {
  await fixture?.close();
  if (mediaDir) await rm(mediaDir, { recursive: true, force: true });
});

test('CORS endpoint permits GET and explicit preflight headers; no-CORS does not', async () => {
  const ok = await fetch(`${fixture.baseUrl}/cors`);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), '*');

  const preflight = await fetch(`${fixture.baseUrl}/auth`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'file://',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'X-Probe-Token',
    },
  });
  assert.equal(preflight.status, 204);
  assert.match(preflight.headers.get('access-control-allow-headers'), /X-Probe-Token/);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, HEAD, OPTIONS');

  const blocked = await fetch(`${fixture.baseUrl}/no-cors`);
  assert.equal(blocked.headers.get('access-control-allow-origin'), null);
});

test('protected endpoint rejects invalid header, accepts fixture token and reports user agent', async () => {
  const denied = await fetch(`${fixture.baseUrl}/auth`);
  assert.equal(denied.status, 401);
  const accepted = await fetch(`${fixture.baseUrl}/auth`, {
    headers: { 'X-Probe-Token': 'probe-token', 'User-Agent': 'Aerio-Probe/1' },
  });
  assert.equal(accepted.status, 200);
  assert.equal((await accepted.json()).userAgent, 'Aerio-Probe/1');
});

test('redirect and byte ranges are observable without relying on real IPTV credentials', async () => {
  const redirected = await fetch(`${fixture.baseUrl}/redirect`, { redirect: 'manual' });
  assert.equal(redirected.status, 302);
  assert.equal(redirected.headers.get('location'), '/cors');

  const partial = await fetch(`${fixture.baseUrl}/vod.mp4`, { headers: { Range: 'bytes=2-5' } });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10');
  assert.equal(await partial.text(), '2345');
  const bad = await fetch(`${fixture.baseUrl}/vod.mp4`, { headers: { Range: 'bytes=99-' } });
  assert.equal(bad.status, 416);
});

test('protected media requires the token on BOTH manifest and segments', async () => {
  const manifest = await fetch(`${fixture.baseUrl}/protected/index.m3u8`);
  assert.equal(manifest.status, 401);
  const authorized = await fetch(`${fixture.baseUrl}/protected/index.m3u8`, {
    headers: { 'X-Probe-Token': 'probe-token' },
  });
  assert.equal(authorized.status, 200);
  assert.match(await authorized.text(), /EXTM3U/);
  const segment = await fetch(`${fixture.baseUrl}/protected/sample0.ts`);
  assert.equal(segment.status, 401);

  const corsless = await fetch(`${fixture.baseUrl}/protected-no-cors/index.m3u8`, {
    headers: { 'X-Probe-Token': 'probe-token' },
  });
  assert.equal(corsless.status, 200);
  assert.equal(corsless.headers.get('access-control-allow-origin'), null);
});

test('MSE input and HLS manifests use distinct media MIME types', async () => {
  const fragment = await fetch(`${fixture.baseUrl}/fragmented.mp4`);
  assert.equal(fragment.status, 200);
  assert.equal(fragment.headers.get('content-type'), 'video/mp4');
  const hls = await fetch(`${fixture.baseUrl}/index.m3u8`);
  assert.equal(hls.status, 200);
  assert.equal(hls.headers.get('content-type'), 'application/vnd.apple.mpegurl');
});
