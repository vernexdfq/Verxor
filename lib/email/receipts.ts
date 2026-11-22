import { sbSelect } from '@/lib/supabase-admin';
import {
  buildFintechReceiptHtml,
  receiptSubject,
  type ReceiptTemplateOptions,
  buildPanelAdminAlertHtml,
  panelAdminAlertSubject,
  type PanelAdminAlertOptions,
  buildAccountDeliveryReceiptHtml,
  accountDeliveryReceiptSubject,
  type AccountDeliveryReceiptOptions,
} from './receipt-template';
import { sendEmail, type SendEmailResult } from './resend';

/** Best-effort receipt dispatch. Email delivery must never undo or fail a completed purchase. */
export async function sendFintechReceipt(
  userId: string,
  receipt: ReceiptTemplateOptions,
): Promise<SendEmailResult> {
  try {
    const rows = (await sbSelect('profiles', `select=email,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`)) as Array<{
      email?: string | null;
      full_name?: string | null;
    }>;
    const profile = rows?.[0];
    if (!profile?.email) return { ok: false, error: 'Customer email not found' };
    return await sendEmail({
      to: profile.email,
      subject: receiptSubject(receipt),
      html: buildFintechReceiptHtml({ ...receipt, customerName: receipt.customerName || profile.full_name || undefined }),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Receipt dispatch failed' };
  }
}

export const sendAirtimeReceipt = (userId: string, receipt: Omit<ReceiptTemplateOptions, 'service'>) =>
  sendFintechReceipt(userId, { ...receipt, service: 'airtime' });

export const sendDataReceipt = (userId: string, receipt: Omit<ReceiptTemplateOptions, 'service'>) =>
  sendFintechReceipt(userId, { ...receipt, service: 'data' });

export const sendVirtualNumberReceipt = (userId: string, receipt: Omit<ReceiptTemplateOptions, 'service'>) =>
  sendFintechReceipt(userId, { ...receipt, service: 'virtual-number' });

export const sendWalletFundingReceipt = (userId: string, receipt: Omit<ReceiptTemplateOptions, 'service'>) =>
  sendFintechReceipt(userId, { ...receipt, service: 'wallet-funding' });

import {
  buildBoostReceiptHtml,
  boostReceiptSubject,
  type BoostReceiptOptions,
} from './receipt-template';

/** Rent-SMS receipt sent to a child-panel customer's email (supplied by the panel). */
export async function sendRentSmsPanelCustomerReceipt(
  to: string,
  receipt: Omit<ReceiptTemplateOptions, 'service'>,
): Promise<SendEmailResult> {
  const email = (to || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return { ok: false, error: 'Customer email required' };
  try {
    return await sendEmail({
      to: email,
      subject: receiptSubject({ ...receipt, service: 'number-rental' }),
      html: buildFintechReceiptHtml({ ...receipt, service: 'number-rental' }),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Receipt dispatch failed' };
  }
}

export async function sendBoostReceipt(
  userId: string,
  receipt: BoostReceiptOptions,
): Promise<SendEmailResult> {
  try {
    const rows = (await sbSelect(
      'profiles',
      `select=email,full_name&id=eq.${encodeURIComponent(userId)}&limit=1`,
    )) as Array<{
      email?: string | null;
      full_name?: string | null;
    }>;
    const profile = rows?.[0];
    if (!profile?.email) return { ok: false, error: 'Customer email not found' };
    return await sendEmail({
      to: profile.email,
      subject: boostReceiptSubject(receipt),
      html: buildBoostReceiptHtml({
        ...receipt,
        customerName: receipt.customerName || profile.full_name || undefined,
      }),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Boost receipt dispatch failed' };
  }
}

export async function sendPanelAdminOrderAlert(
  adminEmail: string | string[] | null | undefined,
  alert: PanelAdminAlertOptions,
): Promise<SendEmailResult> {
  try {
    const recipients = new Set<string>();

    // Designated child panel admin notification addresses
    for (const email of [
      'prozydata@gmail.com',
      'vernexdfq@gmail.com',
      'support@vernexdigital.com',
      'admin@vernexdigital.com',
    ]) {
      recipients.add(email.trim().toLowerCase());
    }

    if (adminEmail) {
      const list = Array.isArray(adminEmail)
        ? adminEmail
        : typeof adminEmail === 'string'
          ? adminEmail.split(/[,;\n\r\s]+/)
          : [];
      for (const item of list) {
        const clean = item.trim().toLowerCase();
        if (clean && clean.includes('@')) recipients.add(clean);
      }
    }

    const to = Array.from(recipients);
    if (to.length === 0) {
      return { ok: false, error: 'Valid panel admin email required' };
    }

    return await sendEmail({
      to,
      subject: panelAdminAlertSubject(alert),
      html: buildPanelAdminAlertHtml(alert),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Panel admin alert dispatch failed' };
  }
}


export interface VirtualNumberDeliveryReceiptOptions {
  userId: string;
  orderId: string;
  phone: string;
  service: string;
  country?: string;
  amountNgn: number;
  customerName?: string;
}

/** Dispatched only when the verification code (OTP) is successfully delivered. */
export async function sendVirtualNumberDeliveredReceipt(
  options: VirtualNumberDeliveryReceiptOptions,
): Promise<SendEmailResult> {
  return await sendVirtualNumberReceipt(options.userId, {
    status: 'successful',
    amountNgn: options.amountNgn,
    reference: options.orderId,
    customerName: options.customerName,
    details: [
      { label: 'Service', value: (options.service || 'Virtual Number').toUpperCase() },
      { label: 'Phone number', value: options.phone },
      { label: 'Verification status', value: 'Code delivered; view it securely in your Verxor account' },
      ...(options.country ? [{ label: 'Country', value: options.country }] : []),
    ],
  });
}


export async function sendAccountDeliveryReceipt(
  options: AccountDeliveryReceiptOptions & { userId?: string; customerEmail?: string },
): Promise<SendEmailResult> {
  let toEmail = (options.customerEmail || "").trim().toLowerCase();
  let customerName = (options.customerName || "").trim();

  if ((!toEmail || !toEmail.includes("@")) && options.userId) {
    try {
      const rows = (await sbSelect(
        "profiles",
        `select=email,full_name&id=eq.${encodeURIComponent(options.userId)}&limit=1`,
      )) as Array<{ email?: string | null; full_name?: string | null }>;
      const profile = rows?.[0];
      if (profile?.email) {
        toEmail = profile.email.trim().toLowerCase();
      }
      if (!customerName && profile?.full_name) {
        customerName = profile.full_name.trim();
      }
    } catch {
      /* ignore */
    }
  }

  if (!toEmail || !toEmail.includes("@")) {
    return { ok: false, error: "Customer email not found" };
  }

  try {
    return await sendEmail({
      to: toEmail,
      subject: accountDeliveryReceiptSubject(options),
      html: buildAccountDeliveryReceiptHtml({
        ...options,
        customerName: customerName || undefined,
      }),
    });
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Account delivery receipt dispatch failed",
    };
  }
}
