import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../build/media/', import.meta.url));
await mkdir(output, { recursive: true });

// Short synthetic, non-provider media. An H.264/AAC MP4 and HLS-TS pair are
// enough to test a native decoder and byte-range playback without distributing
// copyrighted streams. Generated on the development PC, not the TV.
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30',
  '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000',
  '-t', '12', '-c:v', 'libx264', '-profile:v', 'baseline', '-level:v', '3.0',
  '-pix_fmt', 'yuv420p', '-g', '60', '-sc_threshold', '0',
  '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', `${output}vod.mp4`,
], { stdio: 'inherit' });
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', `${output}vod.mp4`,
  '-c', 'copy', '-f', 'hls', '-hls_time', '2', '-hls_list_size', '0',
  '-hls_playlist_type', 'vod', '-hls_segment_filename', `${output}sample%d.ts`,
  `${output}index.m3u8`,
], { stdio: 'inherit' });
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', `${output}vod.mp4`,
  '-c', 'copy', '-movflags', '+frag_keyframe+empty_moov+default_base_moof',
  '-f', 'mp4', `${output}fragmented.mp4`,
], { stdio: 'inherit' });
execFileSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y',
  '-f', 'lavfi', '-i', 'color=c=0x1ac4d8:s=80x80', '-frames:v', '1', `${output}icon.png`,
], { stdio: 'inherit' });
console.log(`Synthetic MP4, fragmented MP4, HLS and artwork fixtures generated in ${output}`);
