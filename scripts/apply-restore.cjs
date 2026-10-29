#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const parts = [];
for (let i = 0; ; i++) {
  const p = path.join(__dirname, 'apply-live-boost.b64.' + i);
  if (!fs.existsSync(p)) break;
  parts.push(fs.readFileSync(p, 'utf8').trim());
}
if (!parts.length) {
  console.error('[apply-restore] no b64 parts');
  process.exit(1);
}
const buf = Buffer.from(parts.join(''), 'base64');
const out = path.join(__dirname, 'apply-live-boost.cjs');
fs.writeFileSync(out, buf);
console.log('[apply-restore] restored apply-live-boost.cjs (' + buf.length + ' bytes)');
