/**
 * XixaPay Provider Client
 * Handles Identity Verification (BVN/NIN), Customer KYC onboarding,
 * Permanent/Static Virtual Account generation, and USD/NGN Virtual Card issuance.
 */

export interface XixapayIdentityVerifyResult {
  ok: boolean;
  message: string;
  data?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    gender?: string;
    phone_number?: string;
    verification_type?: string;
  };
  raw?: unknown;
}

export interface XixapayCustomerResult {
  ok: boolean;
  message: string;
  customer_id?: string;
  raw?: unknown;
}

export interface XixapayStaticAccountResult {
  ok: boolean;
  message: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  customer_id?: string;
  raw?: unknown;
}

export interface XixapayCardCreateResult {
  ok: boolean;
  message: string;
  card_id?: string;
  card_number?: string;
  expiry?: string;
  cvv?: string;
  currency?: string;
  balance?: number;
  raw?: unknown;
}

export function isXixapayConfigured(): boolean {
  return Boolean(process.env.XIXAPAY_SECRET_KEY && process.env.XIXAPAY_API_KEY);
}

function xixapayBaseUrl(): string {
  return (process.env.XIXAPAY_BASE_URL || 'https://api.xixapay.com').replace(/\/$/, '');
}

function getAuthHeaders(): Record<string, string> {
  const secret = process.env.XIXAPAY_SECRET_KEY || '';
  const apiKey = process.env.XIXAPAY_API_KEY || '';
  return {
    Authorization: `Bearer ${secret}`,
    'api-key': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * ID Verification (BVN or NIN)
 * POST https://api.xixapay.com/api/identity/verify
 */
export async function verifyXixapayIdentity(params: {
  idNumber: string;
  idType: 'bvn' | 'nin';
}): Promise<XixapayIdentityVerifyResult> {
  if (!isXixapayConfigured()) {
    return {
      ok: true,
      message: 'Demo mode: verification simulated server-side',
      data: {
        verification_type: params.idType,
      },
    };
  }

  const businessId = process.env.XIXAPAY_BUSINESS_ID || 'verxor_biz';
  try {
    const res = await fetch(`${xixapayBaseUrl()}/api/identity/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        businessId,
        id_number: params.idNumber.trim(),
        id_type: params.idType,
      }),
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(json.status || '').toLowerCase();
    const data = (json.data || {}) as Record<string, unknown>;
    const personal = (data.personal_details || {}) as Record<string, unknown>;

    if (res.ok && (status === 'success' || status === 'true')) {
      return {
        ok: true,
        message: String(json.message || 'Verification successful'),
        data: {
          first_name: personal.first_name ? String(personal.first_name) : undefined,
          last_name: personal.last_name ? String(personal.last_name) : undefined,
          date_of_birth: personal.date_of_birth ? String(personal.date_of_birth) : undefined,
          gender: personal.gender ? String(personal.gender) : undefined,
          verification_type: params.idType,
        },
        raw: json,
      };
    }

    return {
      ok: false,
      message: String(json.message || json.error || `Verification provider error (${res.status})`),
      raw: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Identity verification network error: ${msg}` };
  }
}

/**
 * Customer KYC Onboarding
 * POST https://api.xixapay.com/api/customer/create
 */
export async function createXixapayCustomer(params: {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  address: string;
  state: string;
  city: string;
  postalCode: string;
  dateOfBirth: string;
  idType: 'bvn' | 'nin';
  idNumber: string;
}): Promise<XixapayCustomerResult> {
  if (!isXixapayConfigured()) {
    const mockId = `cus_demo_${Date.now().toString(36)}`;
    return {
      ok: true,
      message: 'Demo mode: customer created server-side',
      customer_id: mockId,
    };
  }

  const businessId = process.env.XIXAPAY_BUSINESS_ID || 'verxor_biz';
  try {
    const res = await fetch(`${xixapayBaseUrl()}/api/customer/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone_number: params.phoneNumber,
        address: params.address,
        state: params.state,
        city: params.city,
        postal_code: params.postalCode,
        date_of_birth: params.dateOfBirth,
        id_type: params.idType,
        id_number: params.idNumber,
        businessId,
      }),
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const data = (json.data || json) as Record<string, unknown>;
    const customerId = String(data.customer_id || data.id || json.customer_id || '');

    if (res.ok && (json.status === 'success' || customerId)) {
      return {
        ok: true,
        message: String(json.message || 'Customer created'),
        customer_id: customerId,
        raw: json,
      };
    }

    return {
      ok: false,
      message: String(json.message || json.error || `Customer creation error (${res.status})`),
      raw: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Customer creation network error: ${msg}` };
  }
}

/**
 * Create Static Permanent Virtual Account
 * POST https://api.xixapay.com/api/v1/createVirtualAccount
 * Safehaven MFB: 29007 (supports static), Palmpay: 20867
 */
export async function createXixapayStaticAccount(params: {
  customerId?: string;
  name: string;
  email: string;
  phoneNumber: string;
  idType?: 'bvn' | 'nin';
  idNumber?: string;
}): Promise<XixapayStaticAccountResult> {
  if (!isXixapayConfigured()) {
    // Generate deterministic demo permanent account
    const cleanPhone = params.phoneNumber.replace(/\D/g, '').slice(-10) || '9012345678';
    return {
      ok: true,
      message: 'Demo mode: permanent account assigned',
      bank_name: 'Safehaven MFB',
      account_number: cleanPhone,
      account_name: `Verxor - ${params.name.trim() || 'Valued Client'}`,
      customer_id: params.customerId || 'cus_demo_static',
    };
  }

  const businessId = process.env.XIXAPAY_BUSINESS_ID || 'verxor_biz';
  // Safehaven supports both dynamic & static
  const bankCode = ['29007'];

  const payload: Record<string, unknown> = {
    businessId,
    accountType: 'static',
    bankCode,
  };

  if (params.customerId) {
    payload.customer_id = params.customerId;
  } else {
    payload.name = params.name;
    payload.email = params.email;
    payload.phoneNumber = params.phoneNumber;
    if (params.idType && params.idNumber) {
      payload.id_type = params.idType;
      payload.id_number = params.idNumber;
    }
  }

  try {
    const res = await fetch(`${xixapayBaseUrl()}/api/v1/createVirtualAccount`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const data = (json.data || json) as Record<string, unknown>;
    const accounts = (Array.isArray(data.account) ? data.account : [data]) as Array<Record<string, unknown>>;
    const primary = accounts[0] || {};

    const accNum = String(primary.accountNumber || primary.account_number || primary.virtualAccountNumber || '');
    const accName = String(primary.accountName || primary.account_name || params.name);
    const bankName = String(primary.bankName || primary.bank_name || 'Safehaven MFB');

    if (res.ok && accNum) {
      return {
        ok: true,
        message: 'Permanent static account created',
        bank_name: bankName,
        account_number: accNum,
        account_name: accName,
        customer_id: params.customerId || String(data.customer_id || ''),
        raw: json,
      };
    }

    return {
      ok: false,
      message: String(json.message || json.error || `Static account generation error (${res.status})`),
      raw: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Static account network error: ${msg}` };
  }
}

/**
 * Create Virtual Dollar Card (or NGN Card)
 * POST https://api.xixapay.com/api/card/create
 */
export async function createXixapayCard(params: {
  customerId: string;
  country?: 'US' | 'NG';
  amount?: number;
}): Promise<XixapayCardCreateResult> {
  const country = params.country || 'US';
  const amount = params.amount || 5.0;

  if (!isXixapayConfigured()) {
    // Generate deterministic demo card
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return {
      ok: true,
      message: 'Demo card provisioned',
      card_id: `card_demo_${Date.now()}`,
      card_number: `5078 7490 2814 ${randomSuffix}`,
      expiry: '08/29',
      cvv: '812',
      currency: country === 'US' ? 'USD' : 'NGN',
      balance: amount,
    };
  }

  const businessId = process.env.XIXAPAY_BUSINESS_ID || 'verxor_biz';

  try {
    const res = await fetch(`${xixapayBaseUrl()}/api/card/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        customer_id: params.customerId,
        businessId,
        country,
        amount,
      }),
      cache: 'no-store',
    });

    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const status = String(json.status || '').toLowerCase();
    const data = (json.data || {}) as Record<string, unknown>;

    if (res.ok && status === 'success') {
      return {
        ok: true,
        message: String(json.message || 'Card created successfully'),
        card_id: String(data.card_id || ''),
        card_number: String(data.card_number || ''),
        expiry: String(data.expiry || ''),
        cvv: String(data.cvv || ''),
        currency: String(data.currency || 'USD'),
        balance: Number(data.balance ?? amount),
        raw: json,
      };
    }

    return {
      ok: false,
      message: String(json.message || json.error || `Card creation provider error (${res.status})`),
      raw: json,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, message: `Card creation network error: ${msg}` };
  }
}
