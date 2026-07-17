export function money(n, { compact = false } = {}) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function num(n, { compact = false } = {}) {
  if (n == null) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function pct(n, { signed = true } = {}) {
  if (n == null) return '—';
  const v = (n * 100).toFixed(1);
  return `${signed && n > 0 ? '+' : ''}${v}%`;
}

export function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function shortMonth(period) {
  // period is "YYYY-MM" or "YYYY-MM-DD"
  const [y, m, d] = period.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d || 1));
  return d
    ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    : date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
