#!/usr/bin/env node
/**
 * Harden persistBoostOrderMeta: always store boost-order-{JAP_ID} with full meta.
 */
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, '..', 'app', 'api', 'v1', 'boost', 'route.ts');
if (!fs.existsSync(target)) {
  console.error('[patch-boost-persist] route missing');
  process.exit(1);
}
let text = fs.readFileSync(target, 'utf8');
if (text.includes('Always upsert a row keyed by the JAP order id')) {
  console.log('[patch-boost-persist] already hardened — skip');
  process.exit(0);
}
if (!text.includes('async function persistBoostOrderMeta')) {
  console.error('[patch-boost-persist] function not found');
  process.exit(1);
}

const newFn = [
  'async function persistBoostOrderMeta(',
  '  userId: string,',
  '  debitRef: string,',
  '  payload: {',
  '    providerOrderId: string;',
  '    serviceId: string;',
  '    serviceTitle: string;',
  '    platform: string;',
  '    link: string;',
  '    quantity: number;',
  '    amountNgn: number;',
  '    status: string;',
  '  },',
  ') {',
  '  const base = supabaseBase();',
  '  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;',
  '  if (!base || !serviceKey || !userId) return;',
  "  const japId = String(payload.providerOrderId || '').trim();",
  '  if (!japId) {',
  "    console.warn('[boost] persist skipped — empty providerOrderId');",
  '    return;',
  '  }',
  '  const meta = {',
  "    type: 'boost',",
  "    product: 'boost',",
  '    providerOrderId: japId,',
  '    orderId: japId,',
  '    serviceId: payload.serviceId,',
  '    serviceTitle: payload.serviceTitle,',
  '    title: payload.serviceTitle,',
  '    platform: payload.platform,',
  '    link: payload.link,',
  '    quantity: payload.quantity,',
  '    amountNgn: payload.amountNgn,',
  "    status: payload.status || 'processing',",
  '    debitRef: debitRef || undefined,',
  '  };',
  '  const headers = {',
  '    apikey: serviceKey,',
  '    Authorization: `Bearer ${serviceKey}`,',
  "    'Content-Type': 'application/json',",
  "    Prefer: 'return=minimal',",
  '  };',
  '  try {',
  '    // 1) Always upsert a row keyed by the JAP order id (support ID)',
  '    const orderRef = `boost-order-${japId}`;',
  '    const existing = await fetch(',
  '      `${base}/rest/v1/wallet_ledger?user_id=eq.${encodeURIComponent(userId)}&reference=eq.${encodeURIComponent(orderRef)}&select=id&limit=1`,',
  "      { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Accept: 'application/json' }, cache: 'no-store' },",
  '    );',
  "    const existingRows = existing.ok ? ((await existing.json().catch(() => [])) as Array<{ id?: string }>) : [];",
  '    if (Array.isArray(existingRows) && existingRows[0]?.id) {',
  '      await fetch(`${base}/rest/v1/wallet_ledger?id=eq.${encodeURIComponent(String(existingRows[0].id))}`, {',
  "        method: 'PATCH',",
  '        headers,',
  '        body: JSON.stringify({ meta }),',
  '      });',
  '    } else {',
  '      await fetch(`${base}/rest/v1/wallet_ledger`, {',
  "        method: 'POST',",
  '        headers,',
  '        body: JSON.stringify({',
  '          user_id: userId,',
  "          kind: 'purchase',",
  '          amount_ngn: -Math.abs(payload.amountNgn),',
  "          currency: 'NGN',",
  '          reference: orderRef,',
  '          meta,',
  '        }),',
  '      });',
  '    }',
  '    // 2) Best-effort: also attach meta to the original debit row',
  '    if (debitRef) {',
  '      await fetch(',
  '        `${base}/rest/v1/wallet_ledger?user_id=eq.${encodeURIComponent(userId)}&reference=eq.${encodeURIComponent(debitRef)}`,',
  "        { method: 'PATCH', headers, body: JSON.stringify({ meta }) },",
  '      );',
  '    }',
  '  } catch (err) {',
  "    console.warn('[boost] persist order meta failed', err);",
  '  }',
  '}',
].join('\n');

const start = text.indexOf('async function persistBoostOrderMeta');
const end = text.indexOf('async function debitRetailWallet', start);
if (start < 0 || end < 0) {
  console.error('[patch-boost-persist] bounds not found');
  process.exit(1);
}
text = text.slice(0, start) + newFn + '\n\n' + text.slice(end);
fs.writeFileSync(target, text);
console.log('[patch-boost-persist] hardened persistBoostOrderMeta (' + text.length + ' bytes)');
