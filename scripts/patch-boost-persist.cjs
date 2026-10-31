#!/usr/bin/env node
/**
 * Harden boost route so every successful place stores boost-order-{JAP_ID}
 * with full meta. Works whether the restored route already has persistBoostOrderMeta
 * or not (current b64 restore does not include it).
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

const persistFn = [
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
  '',
].join('\n');

if (text.includes('async function persistBoostOrderMeta')) {
  const start = text.indexOf('async function persistBoostOrderMeta');
  const end = text.indexOf('async function debitRetailWallet', start);
  if (start >= 0 && end > start) {
    text = text.slice(0, start) + persistFn + text.slice(end);
    console.log('[patch-boost-persist] replaced existing persistBoostOrderMeta');
  } else {
    console.warn('[patch-boost-persist] found name but could not bound — injecting call only');
  }
} else {
  const anchor = text.indexOf('async function debitRetailWallet');
  if (anchor < 0) {
    console.error('[patch-boost-persist] debitRetailWallet not found — cannot inject');
    process.exit(1);
  }
  text = text.slice(0, anchor) + persistFn + text.slice(anchor);
  console.log('[patch-boost-persist] injected persistBoostOrderMeta');
}

if (!text.includes('await persistBoostOrderMeta(')) {
  const needle = `const result = await smmAddOrder({
      service: service.providerId,
      link,
      quantity,
    });`;
  const call = `const result = await smmAddOrder({
      service: service.providerId,
      link,
      quantity,
    });

    if (userId && result?.order) {
      await persistBoostOrderMeta(userId, debitRef, {
        providerOrderId: String(result.order),
        serviceId: String(service.id),
        serviceTitle: service.title,
        platform: service.platform,
        link,
        quantity,
        amountNgn: amount,
        status: 'processing',
      });
    }`;
  if (text.includes(needle)) {
    text = text.replace(needle, call);
    console.log('[patch-boost-persist] injected persist call after smmAddOrder');
  } else {
    const soft = 'const result = await smmAddOrder({';
    const idx = text.indexOf(soft);
    if (idx < 0) {
      console.error('[patch-boost-persist] smmAddOrder call not found');
      process.exit(1);
    }
    const after = text.indexOf('});', idx);
    if (after < 0) {
      console.error('[patch-boost-persist] could not find end of smmAddOrder');
      process.exit(1);
    }
    const insertAt = after + 3;
    const inject = `

    if (userId && result?.order) {
      await persistBoostOrderMeta(userId, debitRef, {
        providerOrderId: String(result.order),
        serviceId: String(service.id),
        serviceTitle: service.title,
        platform: service.platform,
        link,
        quantity,
        amountNgn: amount,
        status: 'processing',
      });
    }`;
    text = text.slice(0, insertAt) + inject + text.slice(insertAt);
    console.log('[patch-boost-persist] injected persist call (soft match)');
  }
} else {
  console.log('[patch-boost-persist] persist call already present');
}

fs.writeFileSync(target, text);
console.log('[patch-boost-persist] done (' + text.length + ' bytes)');
