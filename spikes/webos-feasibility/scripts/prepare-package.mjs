import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, writeFile } from 'node:fs/promises';
import https from 'node:https';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = join(root, 'build');
const app = join(build, 'app');
const libraryUrl = 'https://webostv.developer.lge.com/assets/library/webOSTVjs-1.2.13.zip';
const librarySHA256 = '507c759f65a035122afead166608e8c7f444961468c3570245f0982c8f855ff6';

function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i += 1) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function chunk(type, bytes) {
  const name = Buffer.from(type);
  const header = Buffer.alloc(4);
  header.writeUInt32BE(bytes.length);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(crc32(Buffer.concat([name, bytes])));
  return Buffer.concat([header, name, bytes, footer]);
}

function icon() {
  const size = 80;
  const imageHeader = Buffer.alloc(13);
  imageHeader.writeUInt32BE(size, 0);
  imageHeader.writeUInt32BE(size, 4);
  imageHeader[8] = 8;
  imageHeader[9] = 6;
  const pixels = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const center = Math.hypot(x - 40, y - 40);
      const isMark = center > 20 && center < 27 && y < 46;
      const offset = y * (1 + size * 4) + 1 + x * 4;
      pixels[offset] = isMark ? 26 : 10;
      pixels[offset + 1] = isMark ? 196 : 22;
      pixels[offset + 2] = isMark ? 216 : 40;
      pixels[offset + 3] = 255;
    }
  }
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', imageHeader), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(new Error(`LG library download returned HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (part) => chunks.push(part));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

await mkdir(join(app, 'lib'), { recursive: true });
await cp(join(root, 'app'), app, { recursive: true, force: true });
await writeFile(join(app, 'icon.png'), icon());
await cp(join(root, 'node_modules', 'hls.js', 'dist', 'hls.min.js'),
  join(app, 'lib', 'hls.min.js'));
await cp(join(root, 'node_modules', 'hls.js', 'LICENSE'),
  join(app, 'lib', 'hls-js-LICENSE.txt'));

const library = await download(libraryUrl);
if (createHash('sha256').update(library).digest('hex') !== librarySHA256) {
  throw new Error('LG webOSTV.js archive checksum differs from the pinned source');
}
const archive = join(build, 'webOSTVjs-1.2.13.zip');
await writeFile(archive, library);
const members = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
for (const [match, target] of [
  ['/webOSTV.js', 'webOSTV.js'], ['/LICENSE-2.0.txt', 'LICENSE-2.0.txt'],
]) {
  const member = members.find((entry) => entry.endsWith(match));
  if (!member) throw new Error(`LG archive is missing ${match}`);
  await writeFile(join(app, 'lib', target), execFileSync('unzip', ['-p', archive, member]));
}
console.log(`Staged LG webOSTV.js 1.2.13 (SHA-256 verified), HLS.js 1.7.3, app and icon in ${app}`);
