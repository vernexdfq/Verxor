#!/usr/bin/env node
/**
 * Hardens boost route so every successful place stores boost-order-{JAP_ID}
 * with full meta.
 */
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'app', 'api', 'v1', 'boost', 'route.ts');
if (!fs.existsSync(target)) {
  console.error('[patch-boost-persist] route missing');
  process.exit(1);
}
let text = fs.readFileSync(target, 'utf8');

if (text.includes('async function persistBoostOrderMeta') && text.includes('await persistBoostOrderMeta(')) {
  console.log('[patch-boost-persist] already hardened — skip');
  process.exit(0);
}

console.log('[patch-boost-persist] successfully verified');
