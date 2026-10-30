#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const dir = __dirname;
const parts = [];
for (let i = 0; i < 20; i++) {
  const f = path.join(dir, 'boost-route.b64.' + i);
  if (!fs.existsSync(f)) break;
  parts.push(fs.readFileSync(f, 'utf8').trim());
}
if (!parts.length) { console.error('[restore-boost] no parts'); process.exit(1); }
const text = zlib.gunzipSync(Buffer.from(parts.join(''), 'base64')).toString('utf8');
if (!text.includes('resolvePanelClient') || !text.includes('calculateSmmPartnerPriceNgn')) {
  console.error('[restore-boost] missing markers'); process.exit(1);
}
const target = path.join(dir, '..', 'app', 'api', 'v1', 'boost', 'route.ts');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, text);
console.log('[restore-boost] wrote (' + text.length + ' bytes)');
