import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiltersSchema, type Filters } from '@signalroom/schemas';
import { shiftDays } from '@signalroom/analytics';

/** Yesterday-anchored default: last 30 full days ending today. */
export function defaultRange(): { from: string; to: string } {
  const to = new Date().toISOString().slice(0, 10);
  return { from: shiftDays(to, -29), to };
}

export const DIMENSION_FILTER_KEYS = [
  'category',
  'product',
  'channel',
  'store',
  'country',
  'customerType',
  'importId',
] as const;

/**
 * The single filter system. Filters live in the URL so views are shareable,
 * back-button-safe, and savable; every consumer (desktop toolbar, mobile
 * sheet, insight links) reads and writes through this hook.
 */
export function useFilters() {
  const [params, setParams] = useSearchParams();

  const filters: Filters = useMemo(() => {
    const raw = Object.fromEntries(params.entries());
    const def = defaultRange();
    const parsed = FiltersSchema.safeParse({ from: def.from, to: def.to, ...raw });
    return parsed.success ? parsed.data : FiltersSchema.parse(def);
  }, [params]);

  const set = useCallback(
    (patch: Partial<Record<keyof Filters, string | number | undefined>>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === '') next.delete(k);
            else next.set(k, String(v));
          }
          return next;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const reset = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const k of [...DIMENSION_FILTER_KEYS, 'from', 'to', 'compare']) next.delete(k);
        return next;
      },
      { replace: true }
    );
  }, [setParams]);

  const activeDimensionCount = DIMENSION_FILTER_KEYS.filter((k) => filters[k] !== undefined).length;

  const query = useMemo(() => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined && v !== null) q.set(k, String(v));
    }
    return q.toString();
  }, [filters]);

  return { filters, set, reset, query, activeDimensionCount };
}
