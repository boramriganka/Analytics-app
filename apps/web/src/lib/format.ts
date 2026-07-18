let currencyCode = 'USD';

export function setCurrency(code: string | null) {
  if (code) currencyCode = code;
}

export function money(n: number | null | undefined, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents && !opts.compact ? 2 : 0,
  }).format(n);
}

export function num(n: number | null | undefined, opts: { compact?: boolean } = {}): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: opts.compact ? 'compact' : 'standard',
    maximumFractionDigits: opts.compact ? 1 : 0,
  }).format(n);
}

/** 0.184 → "18.4%" */
export function pct(f: number | null | undefined, opts: { signed?: boolean; digits?: number } = {}): string {
  if (f === null || f === undefined) return '—';
  const digits = opts.digits ?? 1;
  const v = (f * 100).toFixed(digits).replace(new RegExp(`\\.0{${digits}}$`), '');
  return `${opts.signed && f > 0 ? '+' : ''}${v}%`;
}

/** Percentage-point change: 0.021 → "2.1pt" */
export function pts(f: number | null | undefined): string {
  if (f === null || f === undefined) return '—';
  const v = (f * 100).toFixed(1).replace(/\.0$/, '');
  return `${f > 0 ? '+' : ''}${v}pt`;
}

export function isoDate(d: string): string {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function shortDate(d: string): string {
  return new Date(`${d.length === 7 ? `${d}-01` : d}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: d.length === 7 ? undefined : 'numeric',
    year: d.length === 7 ? '2-digit' : undefined,
    timeZone: 'UTC',
  });
}

export function rangeLabel(from: string, to: string): string {
  const f = new Date(`${from}T00:00:00Z`);
  const t = new Date(`${to}T00:00:00Z`);
  const sameYear = f.getUTCFullYear() === t.getUTCFullYear();
  const fmt = (d: Date, year: boolean) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: year ? 'numeric' : undefined, timeZone: 'UTC' });
  return `${fmt(f, !sameYear)} – ${fmt(t, true)}`;
}

export function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
