/** Prefer the most user-readable field from a 247API error payload. */
export function extract247ErrorMessage(data: unknown, status: number): string {
  if (!data) return `Provider error (HTTP ${status})`;
  if (typeof data === 'string') return data.slice(0, 280);
  if (typeof data !== 'object') return `Provider error (HTTP ${status})`;
  const obj = data as Record<string, unknown>;
  const parts: string[] = [];
  // Prefer short network-facing fields first
  for (const f of ['api_response', 'response', 'message', 'msg', 'error', 'detail']) {
    const val = obj[f];
    if (typeof val === 'string' && val.trim()) {
      const t = val.trim();
      if (!parts.includes(t)) parts.push(t);
    }
  }
  if (parts.length) return parts.join(' — ').slice(0, 280);
  if (obj.raw) return String(obj.raw).slice(0, 280);
  return `Provider error (HTTP ${status})`;
}

export function friendlyDataPurchaseError(raw: string): string {
  const clean = (raw || '').trim();
  if (/invalid\s+airtel\s+phone/i.test(clean)) {
    return 'This number was rejected for Airtel data. Confirm it is an Airtel line (or ported to Airtel), then try again.';
  }
  if (/invalid\s+mtn\s+phone/i.test(clean)) {
    return 'This number was rejected for MTN data. Confirm it is an MTN line, then try again.';
  }
  if (/invalid\s+.*phone/i.test(clean)) {
    return 'This phone number was rejected by the network. Check the number and network tab, then try again.';
  }
  if (/plan\s+field\s+is\s+required|invalid\s+plan|unknown\s+plan|plan\s+not\s+found/i.test(clean)) {
    return 'This data plan is not available right now. Please choose another bundle.';
  }
  if (/insufficient|low balance|fund your wallet/i.test(clean)) {
    return 'Provider wallet is low. Please try again shortly or contact support.';
  }
  return clean || 'Data purchase failed. Please try again shortly.';
}
