export function downloadCredentialsTxt(
  orderRef: string,
  platform: string,
  title: string,
  credentials: string[],
) {
  if (typeof window === 'undefined') return;
  const dateStr = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });
  const lines = [
    '============================================================',
    'VERXOR DIGITAL GOODS & ACCOUNTS — ORDER DELIVERED',
    '============================================================',
    `Order Reference : ${orderRef}`,
    `Platform        : ${platform}`,
    `Listing         : ${title}`,
    `Quantity        : ${credentials.length}`,
    `Delivery Date   : ${dateStr}`,
    `Status          : Delivered`,
    '------------------------------------------------------------',
    'DELIVERED CREDENTIALS (KEEP PRIVATE):',
    '------------------------------------------------------------',
    ...credentials,
    '------------------------------------------------------------',
    'USAGE INSTRUCTIONS:',
    '• Account Format: login:password (see listing details).',
    '• 2FA Security: If a 2FA secret key is included, enter it at',
    '  https://2fa.live or into your Google Authenticator app to generate',
    '  the 6-digit one-time login code.',
    '• Cookies: If cookies are provided, use a browser cookie editor',
    '  extension to import them before logging in.',
    '------------------------------------------------------------',
    '24-HOUR REPLACEMENT POLICY:',
    '• All accounts are covered by a 24-hour replacement window for any',
    '  credentials that are invalid on first login.',
    '• To claim a replacement, contact Verxor support within 24 hours with',
    `  your Order Reference: ${orderRef}`,
    '------------------------------------------------------------',
    'CUSTOMER SUPPORT CHANNELS:',
    '• Email    : support@verxor.com',
    '• WhatsApp : 08141620644 | 08062362896',
    '• Custom app / web development: admin@verxor.com',
    '============================================================',
  ];

  const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safePlatform = (platform || 'account').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.download = `verxor-${safePlatform}-order-${(orderRef || 'order').slice(0, 8)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
