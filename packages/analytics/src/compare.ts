/** Pure period/date math. All dates are 'YYYY-MM-DD' strings handled in UTC. */

export interface DateRange {
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

export function toUtc(d: string): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y as number, (m as number) - 1, day as number);
}

export function toIsoDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function rangeDays(range: DateRange): number {
  return Math.round((toUtc(range.to) - toUtc(range.from)) / DAY_MS) + 1;
}

export function shiftDays(date: string, days: number): string {
  return toIsoDate(toUtc(date) + days * DAY_MS);
}

/** The comparison window for a range: same length immediately before, or same dates last year. */
export function comparisonRange(range: DateRange, mode: 'previous-period' | 'previous-year' | 'none'): DateRange | null {
  if (mode === 'none') return null;
  if (mode === 'previous-year') {
    return { from: shiftYear(range.from), to: shiftYear(range.to) };
  }
  const days = rangeDays(range);
  return { from: shiftDays(range.from, -days), to: shiftDays(range.from, -1) };
}

function shiftYear(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  // Feb 29 → Feb 28 on non-leap years
  const target = new Date(Date.UTC((y as number) - 1, (m as number) - 1, day as number));
  if (target.getUTCMonth() !== (m as number) - 1) target.setUTCDate(0);
  return target.toISOString().slice(0, 10);
}

/** Chart bucket size for a span. */
export function granularityFor(range: DateRange): 'day' | 'week' | 'month' {
  const days = rangeDays(range);
  if (days <= 45) return 'day';
  if (days <= 200) return 'week';
  return 'month';
}

export function pctChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined || previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export function absChange(current: number, previous: number | null | undefined): number | null {
  if (previous === null || previous === undefined) return null;
  return current - previous;
}

/** Percentage-point change between two rates (fractions). */
export function ppChange(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null) return null;
  return current - previous;
}
