import { sbSelect } from '@/lib/supabase-admin';
import {
  buildFintechReceiptHtml,
  receiptSubject,
  type ReceiptTemplateOptions,
  buildPanelAdminAlertHtml,
  panelAdminAlertSubject,
  type PanelAdminAlertOptions,
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
  adminEmail: string,
  alert: PanelAdminAlertOptions,
): Promise<SendEmailResult> {
  try {
    const to = (adminEmail || '').trim().toLowerCase();
    if (!to || !to.includes('@')) {
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
