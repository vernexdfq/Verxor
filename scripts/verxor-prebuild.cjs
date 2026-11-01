#!/usr/bin/env node
/**
 * Single entry for Vercel build (vercel.json buildCommand max 256 chars).
 */
const { spawnSync } = require('child_process');
const path = require('path');

const steps = [
  'restore-smm-phase-a.cjs',
  'restore-boost-route.cjs',
  'patch-boost-persist.cjs',
  'apply-live-boost.cjs',
  'inflate-boost-page.cjs',
  'wire-boost-orders.cjs',
  'wire-vn-orders.cjs',
  'patch-airtime-margin.cjs',
];

for (const name of steps) {
  const script = path.join(__dirname, name);
  console.log('[prebuild]', name);
  const r = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: process.env,
  });
  if (r.status !== 0) {
    console.error('[prebuild] failed:', name, 'exit', r.status);
    process.exit(r.status || 1);
  }
}
console.log('[prebuild] all steps ok');
