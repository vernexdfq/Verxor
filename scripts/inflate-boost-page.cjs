#!/usr/bin/env node
/**
 * Inflates surgically-wired Boost page (live orders, original UI) before build.
 * Payload: scripts/boost-page.live.part0..N (base64 gzip chunks)
 * Skips if src/boost-page.tsx is already live-wired (has loadSessionTokens + /api/v1/boost).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const outPath = path.join(root, 'src', 'boost-page.tsx');

if (fs.existsSync(outPath)) {
  const existing = fs.readFileSync(outPath, 'utf8');
  if (
    existing.includes('loadSessionTokens') &&
    existing.includes('/api/v1/boost') &&
    !existing.includes('setTimeout(r, 850)')
  ) {
    console.log(
      '[inflate-boost] src/boost-page.tsx already live-wired (' +
        existing.length +
        ' bytes) — skip',
    );
    process.exit(0);
  }
}

let b64 = '';
const single = path.join(__dirname, 'boost-page.live.gz.b64');
if (fs.existsSync(single)) {
  b64 = fs.readFileSync(single, 'utf8').trim();
} else {
  let i = 0;
  while (true) {
    const p = path.join(__dirname, 'boost-page.live.part' + i);
    if (!fs.existsSync(p)) break;
    b64 += fs.readFileSync(p, 'utf8').trim();
    i++;
  }
}

if (!b64) {
  console.log('[inflate-boost] no live payload, keeping existing boost-page.tsx');
  process.exit(0);
}

const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
fs.writeFileSync(outPath, buf);
console.log(
  '[inflate-boost] wrote src/boost-page.tsx (' + buf.length + ' bytes, live orders + original UI)',
);
