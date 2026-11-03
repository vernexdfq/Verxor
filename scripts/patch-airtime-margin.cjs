#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'app', 'api', 'v1', 'airtime', 'route.ts');
if (!fs.existsSync(file)) {
  console.error('[patch-airtime-margin] route missing');
  process.exit(0);
}
let s = fs.readFileSync(file, 'utf8');

// Already wired in source (panel-auth helpers) — do not re-patch.
if (
  s.includes('panelAirtimeDebitAmount') ||
  s.includes('PANEL_AIRTIME_DISCOUNT_PCT') ||
  s.includes('PANEL_AIRTIME_MARGIN')
) {
  console.log('[patch-airtime-margin] already applied');
  process.exit(0);
}

const marginBlock = `
/** Child-panel wholesale discount (partner margin, not customer cashback). */
const PANEL_AIRTIME_MARGIN: Record<string, number> = {
  mtn: 0.02,
  airtel: 0.02,
  '9mobile': 0.02,
  glo: 0.06,
};

`;
if (!s.includes("const NETWORK_LABEL: Record<string, string> = {")) {
  console.error('[patch-airtime-margin] NETWORK_LABEL not found');
  process.exit(1);
}
s = s.replace(
  "airtel: 'Airtel',\n};\n\nfunction supabaseBase()",
  "airtel: 'Airtel',\n};\n" + marginBlock + "function supabaseBase()",
);

const oldDebit = `  const useReseller = Boolean(panel);
  const netLabel = NETWORK_LABEL[network] || network.toUpperCase();
  const successTitle = \`\${netLabel} airtime purchase of \${formatNaira(amount)} was successful\`;
  const debitDesc = \`\${netLabel} airtime purchase of \${formatNaira(amount)}\`;
  const debitRef = body.ref || \`at-\${(userId || 'panel').slice(0, 8)}-\${Date.now()}\`;
  let debited = false;

  try {
    if (useReseller) {
      await debitResellerWallet(userId, amount, debitRef);
    } else {
      await debitRetailWallet(userId, amount, debitRef, debitDesc);
    }`;

const newDebit = `  const useReseller = Boolean(panel);
  const netLabel = NETWORK_LABEL[network] || network.toUpperCase();
  const successTitle = \`\${netLabel} airtime purchase of \${formatNaira(amount)} was successful\`;
  const debitDesc = \`\${netLabel} airtime purchase of \${formatNaira(amount)}\`;
  const debitRef = body.ref || \`at-\${(userId || 'panel').slice(0, 8)}-\${Date.now()}\`;
  const margin = useReseller ? (PANEL_AIRTIME_MARGIN[network] || 0) : 0;
  const chargeAmount =
    useReseller && margin > 0
      ? Math.max(1, Math.round(amount * (1 - margin) * 100) / 100)
      : amount;
  let debited = false;

  try {
    if (useReseller) {
      await debitResellerWallet(userId, chargeAmount, debitRef);
    } else {
      await debitRetailWallet(userId, amount, debitRef, debitDesc);
    }`;

if (!s.includes(oldDebit)) {
  console.error('[patch-airtime-margin] debit block not found');
  process.exit(1);
}
s = s.replace(oldDebit, newDebit);
s = s.replace(
  /balanceDebited: amount,\n        walletMode: useReseller \? 'reseller_wallet' : 'retail',/g,
  "balanceDebited: useReseller ? chargeAmount : amount,\n        faceAmount: amount,\n        panelMargin: margin,\n        walletMode: useReseller ? 'reseller_wallet' : 'retail',",
);
s = s.replace(
  'await creditResellerWallet(userId, amount, `refund-${debitRef}`);',
  'await creditResellerWallet(userId, chargeAmount, `refund-${debitRef}`);',
);
fs.writeFileSync(file, s);
console.log('[patch-airtime-margin] applied', s.length, 'bytes');
