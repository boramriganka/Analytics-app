export interface Anomaly {
  index: number;
  zScore: number;
  direction: 'high' | 'low';
}

/**
 * Deterministic anomaly detection on a series using robust statistics
 * (median/MAD), so an outlier cannot inflate the spread and mask itself —
 * with mean/σ, a single huge day widens σ enough to hide its own spike.
 *
 * With `weekdays` supplied (day granularity), each point is scored against its
 * own weekday's distribution, which removes the weekly rhythm that would
 * otherwise flag every Saturday. Groups with fewer than 8 samples fall back to
 * the global distribution (a sample's max |z| within a tiny group is bounded
 * and can never cross the threshold).
 */
export function detectAnomalies(
  values: number[],
  opts: { threshold?: number; weekdays?: number[] } = {}
): Anomaly[] {
  const threshold = opts.threshold ?? 2.5;
  if (values.length < 8) return [];

  const groups = new Map<number, number[]>();
  const groupOf = (i: number) => (opts.weekdays ? (opts.weekdays[i] ?? 0) : 0);
  values.forEach((v, i) => {
    const g = groupOf(i);
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(v);
  });

  const median = (vs: number[]): number => {
    const s = [...vs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
  };
  const statsOf = (vs: number[]) => {
    const med = median(vs);
    const mad = median(vs.map((v) => Math.abs(v - med)));
    return { med, mad };
  };

  const global = statsOf(values);
  const stats = new Map<number, { med: number; mad: number }>();
  for (const [g, vs] of groups) {
    if (vs.length >= 8) {
      const s = statsOf(vs);
      // Floor the group spread at a fraction of the global spread: a weekday
      // whose samples happen to cluster tightly would otherwise flag ordinary
      // variation as anomalous.
      stats.set(g, { med: s.med, mad: Math.max(s.mad, 0.4 * global.mad) });
    } else {
      stats.set(g, global);
    }
  }

  const out: Anomaly[] = [];
  values.forEach((v, i) => {
    const st = stats.get(groupOf(i));
    if (!st || st.mad === 0) return;
    // 0.6745 scales MAD to be σ-comparable for normal data
    const z = (0.6745 * (v - st.med)) / st.mad;
    if (Math.abs(z) >= threshold) {
      out.push({ index: i, zScore: Math.round(z * 100) / 100, direction: z > 0 ? 'high' : 'low' });
    }
  });
  return out;
}

/**
 * Longest run of strictly declining values ending at the last element.
 * [10, 9, 8, 7] → 3 (three consecutive declines).
 */
export function trailingDeclineStreak(values: number[]): number {
  let streak = 0;
  for (let i = values.length - 1; i > 0; i--) {
    const cur = values[i]!;
    const prev = values[i - 1]!;
    if (cur < prev) streak++;
    else break;
  }
  return streak;
}
