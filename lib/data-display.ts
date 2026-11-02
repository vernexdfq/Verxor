/** Shared display helpers for data (and airtime) pages */
export function money(n: number): string {
  return '₦' + Math.round(n).toLocaleString('en-NG');
}

/** Volume label — Mbps (router) must never collapse to MB */
export function parseVolume(name: string): string {
  const speed = name.match(/(\d+(?:\.\d+)?)\s*(Mbps|MBPS|mbps)/i);
  if (speed) {
    return `${parseFloat(speed[1])} Mbps`;
  }
  const m = name.match(/(\d+(?:\.\d+)?)\s*(MB|GB|TB)\b/i);
  if (m) {
    const num = parseFloat(m[1]);
    const unit = m[2].toUpperCase();
    return `${num} ${unit}`;
  }
  return name;
}

export function parseValidity(days: string, name: string): string {
  const dStr = (days || '').trim().toLowerCase();
  const nStr = (name || '').trim().toLowerCase();

  const mNum = dStr.match(/\d+/);
  if (mNum) {
    const num = parseInt(mNum[0], 10);
    if (num === 1) return '1 Day';
    if (num <= 3 && num > 1) return `${num} Days`;
    if (num === 7) return '7 Days';
    if (num === 14) return '14 Days';
    if (num === 30) return '30 Days';
    if (num === 60) return '60 Days';
    if (num === 90) return '90 Days';
    if (num === 120) return '120 Days';
    if (num === 180) return '180 Days';
    if (num >= 365) return '1 Year';
    return `${num} Days`;
  }

  const matchInName = nStr.match(/(\d+)\s*(day|days|month|months|week|weeks|year|years)/i);
  if (matchInName) {
    const val = parseInt(matchInName[1], 10);
    const unit = matchInName[2].toLowerCase();
    if (unit.startsWith('year') || val >= 365) return '1 Year';
    if (unit.startsWith('month')) return val === 1 ? '30 Days' : `${val * 30} Days`;
    if (unit.startsWith('week')) return `${val * 7} Days`;
    return val === 1 ? '1 Day' : `${val} Days`;
  }

  if (nStr.includes('daily')) return '1 Day';
  if (nStr.includes('weekly')) return '7 Days';
  if (nStr.includes('monthly')) return '30 Days';
  if (nStr.includes('yearly') || nStr.includes('annual')) return '1 Year';

  return '30 Days';
}
