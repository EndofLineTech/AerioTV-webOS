import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFixtureServer } from '../fixtures/server.mjs';
import { createMediaProxy } from '../service/media-proxy.cjs';

let upstream;
let mediaDir;

before(async () => {
  mediaDir = await mkdtemp(join(tmpdir(), 'aerio-webos-proxy-'));
  await writeFile(join(mediaDir, 'index.m3u8'), '#EXTM3U\n#EXTINF:2,\nsample0.ts\n#EXT-X-ENDLIST\n');
  await writeFile(join(mediaDir, 'sample0.ts'), '0123456789');
  upstream = await createFixtureServer({ host: '127.0.0.1', port: 0, mediaDir });
});

after(async () => {
  await upstream?.close();
  if (mediaDir) await rm(mediaDir, { recursive: true, force: true });
});

test('a short-lived loopback proxy converts protected, no-CORS HLS to playable URLs', async () => {
  const source = await fetch(`${upstream.baseUrl}/protected-no-cors/index.m3u8`, {
    headers: { 'X-Probe-Token': 'probe-token' },
  });
  assert.equal(source.status, 200);
  assert.equal(source.headers.get('access-control-allow-origin'), null);

  const proxy = await createMediaProxy({ origin: upstream.baseUrl, token: 'test-nonce', leaseMs: 5000 });
  try {
    const denied = await fetch(proxy.url.replace('test-nonce', 'wrong'));
    assert.equal(denied.status, 403);
    const manifest = await fetch(proxy.url);
    assert.equal(manifest.status, 200);
    assert.equal(manifest.headers.get('access-control-allow-origin'), '*');
    const text = await manifest.text();
    assert.match(text, /sample0\.ts\?key=test-nonce/);
    assert.doesNotMatch(text, /192\.168\.|protected-no-cors|probe-token/);

    const segmentPath = text.split('\n').find((line) => line.startsWith('sample0.ts'));
    const segmentUrl = new URL(segmentPath, proxy.url);
    const media = await fetch(segmentUrl, { headers: { Range: 'bytes=2-5' } });
    assert.equal(media.status, 206);
    assert.equal(media.headers.get('content-type'), 'video/mp2t');
    assert.equal(media.headers.get('content-range'), 'bytes 2-5/10');
    assert.equal(await media.text(), '2345');

    const invalid = await fetch(new URL(`../unknown?key=test-nonce`, proxy.url));
    assert.equal(invalid.status, 404);
  } finally {
    await proxy.close();
  }
  await assert.rejects(fetch(proxy.url), /fetch failed/);
});
