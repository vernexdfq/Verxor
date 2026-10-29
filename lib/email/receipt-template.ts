export type ReceiptService =
  | 'airtime'
  | 'data'
  | 'virtual-number'
  | 'number-rental'
  | 'smm'
  | 'gift-card'
  | 'virtual-card'
  | 'account-log'
  | 'proxy'
  | 'esim'
  | 'bet-wallet'
  | 'exam-pin'
  | 'tv'
  | 'electricity'
  | 'wallet-funding';

export type ReceiptStatus = 'successful' | 'pending' | 'failed';

export type ReceiptTemplateOptions = {
  service: ReceiptService;
  status: ReceiptStatus;
  amountNgn: number;
  reference: string;
  date?: Date | string;
  details?: Array<{ label: string; value: string }>;
  customerName?: string;
  balanceAfterNgn?: number;
};

const SERVICE_LABELS: Record<ReceiptService, string> = {
  airtime: 'Airtime purchase',
  data: 'Data purchase',
  'virtual-number': 'Virtual number purchase',
  'number-rental': 'Number rental',
  smm: 'Social media service',
  'gift-card': 'Gift card transaction',
  'virtual-card': 'Virtual card transaction',
  'account-log': 'Account access purchase',
  proxy: 'Proxy service',
  esim: 'eSIM purchase',
  'bet-wallet': 'Bet wallet funding',
  'exam-pin': 'Exam PIN purchase',
  tv: 'TV subscription',
  electricity: 'Electricity bill payment',
  'wallet-funding': 'Wallet funding',
};

const STATUS_COPY: Record<ReceiptStatus, { label: string; color: string; intro: string }> = {
  successful: { label: 'Successful', color: '#087443', intro: 'Your transaction was completed successfully.' },
  pending: { label: 'Processing', color: '#9a5b00', intro: 'Your transaction is being processed. We’ll update you when its status changes.' },
  failed: { label: 'Unsuccessful', color: '#b42318', intro: 'This transaction was not completed. If your wallet was charged, please contact support.' },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] || char);
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return '₦0.00';
  return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildFintechReceiptHtml(options: ReceiptTemplateOptions): string {
  const label = SERVICE_LABELS[options.service];
  const status = STATUS_COPY[options.status];
  const date = options.date ? new Date(options.date) : new Date();
  const dateLabel = Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-NG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
  });
  const safeRef = escapeHtml(options.reference || 'Not provided');
  const details = (options.details || []).filter(({ label: key }) => !/^(provider|supplier|gateway|vendor|upstream)$/i.test(key.trim())).slice(0, 8).map(({ label: key, value }) =>
    `<tr><td style="padding:12px 0;color:#667085;font-size:14px;border-bottom:1px solid #edf0f4">${escapeHtml(key)}</td><td style="padding:12px 0;color:#172033;font-size:14px;text-align:right;border-bottom:1px solid #edf0f4;font-weight:600">${escapeHtml(value)}</td></tr>`,
  ).join('');
  const balance = Number.isFinite(options.balanceAfterNgn)
    ? `<tr><td style="padding:12px 0;color:#667085;font-size:14px">Wallet balance</td><td style="padding:12px 0;color:#172033;font-size:14px;text-align:right;font-weight:600">${formatCurrency(options.balanceAfterNgn as number)}</td></tr>`
    : '';
  const greeting = options.customerName ? `Hello ${escapeHtml(options.customerName)},` : 'Hello,';

  const contactBlock = `<div style="margin-top:24px;padding:16px 18px;background:#f8fafc;border:1px solid #e8ebef;border-radius:12px"><div style="font-size:13px;font-weight:700;color:#172033;margin-bottom:8px">Customer support</div><div style="font-size:12px;line-height:1.7;color:#475467">Email: <a href="mailto:support@verxor.com" style="color:#382080;font-weight:600">support@verxor.com</a><br>WhatsApp: <a href="https://wa.me/2348141620644" style="color:#087443">08141620644</a> · <a href="https://wa.me/2348062362896" style="color:#087443">08062362896</a></div><div style="margin-top:12px;padding-top:12px;border-top:1px solid #e8ebef;font-size:12px;line-height:1.6;color:#475467"><strong style="color:#172033">Need a custom website or app like Verxor?</strong><br>Contact <a href="mailto:admin@verxor.com" style="color:#382080;font-weight:700">admin@verxor.com</a>.</div></div>`;

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(label)} receipt</title></head><body style="margin:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;color:#172033"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(label)} · ${status.label} · ${formatCurrency(options.amountNgn)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6f8;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fff;border:1px solid #e8ebef;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 28px;border-bottom:1px solid #edf0f4"><div style="font-size:20px;letter-spacing:.04em;font-weight:800;color:#382080">VERXOR</div><div style="margin-top:4px;font-size:12px;color:#667085">A secure record of your transaction</div></td></tr><tr><td style="padding:28px"><p style="margin:0 0 12px;font-size:15px">${greeting}</p><h1 style="margin:0 0 10px;font-size:22px;line-height:1.3;color:#172033">${escapeHtml(label)}</h1><p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#667085">${status.intro}</p><div style="padding:18px 20px;border-radius:12px;background:#f8f7fc;border:1px solid #ece8f7"><div style="font-size:12px;color:#667085">Amount</div><div style="margin-top:5px;font-size:28px;font-weight:750;letter-spacing:-.4px;color:#172033">${formatCurrency(options.amountNgn)}</div><div style="margin-top:12px"><span style="display:inline-block;padding:5px 10px;border-radius:999px;background:${status.color}14;color:${status.color};font-size:12px;font-weight:700">${status.label}</span></div></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px">${details}<tr><td style="padding:12px 0;color:#667085;font-size:14px;border-bottom:1px solid #edf0f4">Reference</td><td style="padding:12px 0;color:#172033;font-size:14px;text-align:right;border-bottom:1px solid #edf0f4;font-weight:600;word-break:break-all">${safeRef}</td></tr><tr><td style="padding:12px 0;color:#667085;font-size:14px;border-bottom:1px solid #edf0f4">Date</td><td style="padding:12px 0;color:#172033;font-size:14px;text-align:right;border-bottom:1px solid #edf0f4">${escapeHtml(dateLabel)}</td></tr>${balance}</table>${contactBlock}<div style="margin-top:24px;padding:14px 16px;background:#f8fafc;border-radius:10px;color:#667085;font-size:12px;line-height:1.6">Verxor will never ask you to share your password, PIN, or one-time verification code by email. Keep this receipt for your records.</div></td></tr><tr><td style="padding:18px 28px;background:#fafbfc;border-top:1px solid #edf0f4;color:#667085;font-size:12px;line-height:1.6">Need help? Contact Verxor support from your account. This is an automated transaction email. Please do not reply with sensitive account information.</td></tr></table><div style="padding:16px;color:#98a2b3;font-size:11px">© ${new Date().getFullYear()} Verxor</div></td></tr></table></body></html>`;
}

export function receiptSubject(options: ReceiptTemplateOptions): string {
  const label = SERVICE_LABELS[options.service];
  const status = STATUS_COPY[options.status].label;
  return `${label} ${status.toLowerCase()} · ${formatCurrency(options.amountNgn)}`;
}
