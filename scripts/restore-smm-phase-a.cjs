#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = path.join(root, 'lib', 'providers', 'smm.ts');
const url =
  'https://raw.githubusercontent.com/vernexdfq/Verxor/f827969d0e37e93248cf7da2c0820ce9cf91ee80/lib/providers/smm.ts';
const tmp = path.join(__dirname, '_smm_restored.ts');

try {
  execSync('curl -fsSL "' + url + '" -o "' + tmp + '"', { stdio: 'inherit' });
} catch (e) {
  console.error('[restore-smm] download failed');
  process.exit(1);
}

let text = fs.readFileSync(tmp, 'utf8');
if (!text.includes('fetchSmmCatalog') || text.length < 5000) {
  console.error('[restore-smm] incomplete download', text.length);
  process.exit(1);
}

if (!text.includes('getSmmPartnerMultiplier')) {
  const anchor =
    'export function calculateSmmPriceNgn(costUsd: number): number {\n' +
    '  const mult = getSmmMultiplier(costUsd);\n' +
    '  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;\n' +
    '}';
  const inject =
    anchor +
    '\n\n/** Partner mults locked: 2.0 / 1.7 / 1.35 / 1.15 */\n' +
    'export function getSmmPartnerMultiplier(costUsd: number): number {\n' +
    '  if (costUsd <= 0.50) return 2.0;\n' +
    '  if (costUsd <= 1.00) return 1.7;\n' +
    '  if (costUsd <= 2.00) return 1.35;\n' +
    '  return 1.15;\n' +
    '}\n\n' +
    'export function calculateSmmPartnerPriceNgn(costUsd: number): number {\n' +
    '  const mult = getSmmPartnerMultiplier(costUsd);\n' +
    '  return Math.round(costUsd * mult * SMM_EXCHANGE_RATE * 100) / 100;\n' +
    '}';
  if (!text.includes(anchor)) {
    console.error('[restore-smm] anchor not found');
    process.exit(1);
  }
  text = text.replace(anchor, inject);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, text);
console.log('[restore-smm] restored (' + text.length + ' bytes)');
try { fs.unlinkSync(tmp); } catch (e) {}
