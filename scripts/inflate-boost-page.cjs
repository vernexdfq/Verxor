#!/usr/bin/env node
/**
 * Optional inflate. Never fails the build.
 * Live wiring is done by apply-live-boost.cjs.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const outPath = path.join(__dirname, '..', 'src', 'boost-page.tsx');
try {
  let b64 = '';
  let i = 0;
  while (true) {
    const p = path.join(__dirname, 'boost-page.live.part' + i);
    if (!fs.existsSync(p)) break;
    b64 += fs.readFileSync(p, 'utf8').trim();
    i++;
  }
  if (!b64) {
    console.log('[inflate-boost] no payload — skip');
    process.exit(0);
  }
  const buf = zlib.gunzipSync(Buffer.from(b64, 'base64'));
  const text = buf.toString('utf8');
  if (text.includes('export function BoostPage') && text.length > 20000) {
    fs.writeFileSync(outPath, buf);
    console.log('[inflate-boost] wrote src/boost-page.tsx (' + buf.length + ' bytes)');
  } else {
    console.log('[inflate-boost] payload invalid — skip');
  }
} catch (e) {
  console.log('[inflate-boost] skip (' + (e && e.message ? e.message : e) + ')');
}
process.exit(0);
