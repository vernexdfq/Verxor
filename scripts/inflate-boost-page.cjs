#!/usr/bin/env node
/**
 * Inflates surgically-wired Boost page (live orders, original UI) before build.
 * Payload: scripts/boost-page.live.gz.b64
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.join(__dirname, '..');
const b64Path = path.join(__dirname, 'boost-page.live.gz.b64');
const outPath = path.join(root, 'src', 'boost-page.tsx');

if (!fs.existsSync(b64Path)) {
  console.log('[inflate-boost] no live payload, keeping existing boost-page.tsx');
  process.exit(0);
}

const b64 = fs.readFileSync(b64Path, 'utf8').trim();
const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
fs.writeFileSync(outPath, buf);
console.log('[inflate-boost] wrote src/boost-page.tsx (' + buf.length + ' bytes, live orders + original UI)');
