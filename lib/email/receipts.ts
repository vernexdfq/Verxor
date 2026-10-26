import { sbSelect } from '@/lib/supabase-admin';
import { buildFintechReceiptHtml, receiptSubject, type ReceiptTemplateOptions } from './receipt-template';
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
