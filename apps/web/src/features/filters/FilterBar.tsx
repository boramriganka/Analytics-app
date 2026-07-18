import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarRange, ChevronDown, Bookmark, BookmarkPlus, ListFilter, Trash2 } from 'lucide-react';
import { shiftDays } from '@signalroom/analytics';
import type { Filters } from '@signalroom/schemas';
import { useFilters, defaultRange, DIMENSION_FILTER_KEYS } from '../../lib/filters';
import { useMeta, useViews } from '../../lib/queries';
import { api } from '../../lib/api';
import { rangeLabel } from '../../lib/format';
import { Button, FilterChip, Input, Field, SegmentedControl } from '../../design/primitives';
import { Dialog, BottomSheet, useToast } from '../../design/overlay';

/* ------------------------------- date presets ------------------------------- */

interface Preset {
  key: string;
  label: string;
  range: (maxDay: string | null) => { from: string; to: string };
}

const today = () => new Date().toISOString().slice(0, 10);

const PRESETS: Preset[] = [
  { key: '7d', label: 'Last 7 days', range: () => ({ from: shiftDays(today(), -6), to: today() }) },
  { key: '30d', label: 'Last 30 days', range: () => ({ from: shiftDays(today(), -29), to: today() }) },
  { key: '90d', label: 'Last 90 days', range: () => ({ from: shiftDays(today(), -89), to: today() }) },
  { key: 'mtd', label: 'Month to date', range: () => ({ from: `${today().slice(0, 7)}-01`, to: today() }) },
  { key: '12m', label: 'Last 12 months', range: () => ({ from: shiftDays(today(), -364), to: today() }) },
];

function presetLabelFor(filters: Filters): string {
  for (const p of PRESETS) {
    const r = p.range(null);
    if (r.from === filters.from && r.to === filters.to) return p.label;
  }
  return rangeLabel(filters.from, filters.to);
}

/* --------------------------------- popover ---------------------------------- */

function Menu({ trigger, children, align = 'left' }: { trigger: (open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((v) => !v)}>{trigger(open)}</div>
      {open && (
        <div
          className={`absolute top-full z-40 mt-1.5 min-w-56 rounded-lg border border-line bg-panel p-1.5 shadow-lg ${align === 'right' ? 'right-0' : 'left-0'}`}
          role="menu"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ filter controls ------------------------------ */

const DIMENSION_LABELS: Record<string, string> = {
  category: 'Category',
  product: 'Product',
  channel: 'Channel',
  store: 'Store',
  country: 'Country',
  customerType: 'Customers',
  importId: 'Import',
};

function DateControl({ block = false }: { block?: boolean }) {
  const { filters, set } = useFilters();
  const [customFrom, setCustomFrom] = useState(filters.from);
  const [customTo, setCustomTo] = useState(filters.to);

  return (
    <Menu
      trigger={(open) => (
        <Button size="sm" aria-expanded={open} aria-haspopup="menu" className={block ? 'w-full justify-between' : ''}>
          <CalendarRange size={14} aria-hidden="true" />
          {presetLabelFor(filters)}
          <ChevronDown size={13} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
      )}
    >
      {(close) => (
        <div className="w-64">
          {PRESETS.map((p) => {
            const r = p.range(null);
            const active = r.from === filters.from && r.to === filters.to;
            return (
              <button
                key={p.key}
                role="menuitem"
                onClick={() => {
                  set({ from: r.from, to: r.to });
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-well ${active ? 'font-semibold text-ink' : 'text-ink-2'}`}
              >
                {p.label}
                {active && <span aria-hidden="true">✓</span>}
              </button>
            );
          })}
          <div className="mt-1.5 border-t border-line px-2.5 pt-2.5 pb-1">
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-ink-3 uppercase">Custom range</p>
            <div className="flex items-center gap-1.5">
              <label className="flex-1">
                <span className="sr-only">From date</span>
                <Input type="date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 px-2 text-xs" />
              </label>
              <span className="text-ink-3">–</span>
              <label className="flex-1">
                <span className="sr-only">To date</span>
                <Input type="date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} className="h-8 px-2 text-xs" />
              </label>
            </div>
            <Button
              variant="primary"
              size="sm"
              className="mt-2 w-full"
              disabled={!customFrom || !customTo || customFrom > customTo}
              onClick={() => {
                set({ from: customFrom, to: customTo });
                close();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      )}
    </Menu>
  );
}

function CompareControl() {
  const { filters, set } = useFilters();
  return (
    <SegmentedControl
      size="sm"
      label="Comparison period"
      value={filters.compare}
      onChange={(v) => set({ compare: v })}
      options={[
        { value: 'previous-period', label: 'vs prior' },
        { value: 'previous-year', label: 'vs last year' },
        { value: 'none', label: 'no compare' },
      ]}
    />
  );
}

function AddFilterMenu() {
  const { filters, set } = useFilters();
  const meta = useMeta();
  const [dimension, setDimension] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const values: { value: string; label: string }[] = useMemo(() => {
    if (!meta.data || !dimension) return [];
    switch (dimension) {
      case 'category': return meta.data.categories.map((v) => ({ value: v, label: v }));
      case 'product': return meta.data.products.map((v) => ({ value: v, label: v }));
      case 'channel': return meta.data.channels.map((v) => ({ value: v, label: v }));
      case 'store': return meta.data.stores.map((v) => ({ value: v, label: v }));
      case 'country': return meta.data.countries.map((v) => ({ value: v, label: v }));
      case 'customerType':
        return [
          { value: 'new', label: 'New customers' },
          { value: 'returning', label: 'Returning customers' },
        ];
      case 'importId': return meta.data.imports.map((i) => ({ value: String(i.id), label: i.fileName }));
      default: return [];
    }
  }, [meta.data, dimension]);

  const filtered = values.filter((v) => v.label.toLowerCase().includes(search.toLowerCase())).slice(0, 40);

  return (
    <Menu
      trigger={(open) => (
        <Button size="sm" aria-expanded={open} aria-haspopup="menu">
          <ListFilter size={14} aria-hidden="true" /> Filter
        </Button>
      )}
    >
      {(close) => (
        <div className="w-60">
          {dimension === null ? (
            Object.entries(DIMENSION_LABELS).map(([k, label]) => (
              <button
                key={k}
                role="menuitem"
                disabled={filters[k as keyof Filters] !== undefined}
                onClick={() => {
                  setDimension(k);
                  setSearch('');
                }}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm text-ink-2 hover:bg-well disabled:opacity-40"
              >
                {label} <span aria-hidden="true">›</span>
              </button>
            ))
          ) : (
            <>
              <button onClick={() => setDimension(null)} className="mb-1 flex w-full items-center gap-1 rounded-md px-2.5 py-1.5 text-left text-xs text-ink-3 hover:bg-well">
                ‹ {DIMENSION_LABELS[dimension]}
              </button>
              {values.length > 8 && (
                <Input
                  autoFocus
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mb-1 h-8 text-xs"
                  aria-label={`Search ${DIMENSION_LABELS[dimension]}`}
                />
              )}
              <div className="max-h-56 overflow-y-auto">
                {filtered.map((v) => (
                  <button
                    key={v.value}
                    role="menuitem"
                    onClick={() => {
                      set({ [dimension]: v.value } as Partial<Record<keyof Filters, string>>);
                      setDimension(null);
                      close();
                    }}
                    className="block w-full truncate rounded-md px-2.5 py-1.5 text-left text-sm text-ink-2 hover:bg-well"
                  >
                    {v.label}
                  </button>
                ))}
                {filtered.length === 0 && <p className="px-2.5 py-2 text-xs text-ink-3">No matches.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </Menu>
  );
}

function ActiveChips() {
  const { filters, set } = useFilters();
  const meta = useMeta();
  const chips = DIMENSION_FILTER_KEYS.filter((k) => filters[k] !== undefined);
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((k) => {
        let display = String(filters[k]);
        if (k === 'importId') display = meta.data?.imports.find((i) => String(i.id) === display)?.fileName ?? `#${display}`;
        if (k === 'customerType') display = display === 'new' ? 'New' : 'Returning';
        return <FilterChip key={k} label={DIMENSION_LABELS[k] ?? k} value={display} onClear={() => set({ [k]: undefined } as never)} />;
      })}
    </>
  );
}

/* ------------------------------- saved views -------------------------------- */

function SaveViewDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const location = useLocation();
  const { query } = useFilters();
  const queryClient = useQueryClient();
  const toast = useToast();

  const save = useMutation({
    mutationFn: () =>
      api('/views', { method: 'POST', body: JSON.stringify({ name, route: location.pathname, query }) }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('View saved', { tone: 'success' });
      setName('');
      onClose();
    },
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Save this view">
      <p className="mb-3 text-sm text-ink-2">Saves the current page, date range and filters so you can return to it or add it to a report.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) save.mutate();
        }}
      >
        <Field label="Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kitchen — last 30 days" required />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={save.isPending} disabled={!name.trim()}>
            Save view
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function ViewsMenu() {
  const views = useViews();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const del = useMutation({
    mutationFn: (id: number) => api(`/views/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('View deleted');
    },
  });

  return (
    <Menu
      align="right"
      trigger={(open) => (
        <Button size="sm" aria-expanded={open} aria-haspopup="menu">
          <Bookmark size={14} aria-hidden="true" /> Views
        </Button>
      )}
    >
      {(close) => (
        <div className="w-64">
          {(views.data?.views ?? []).length === 0 && <p className="px-2.5 py-2 text-xs text-ink-3">No saved views yet.</p>}
          {(views.data?.views ?? []).map((v) => (
            <div key={v.id} className="group flex items-center rounded-md hover:bg-well">
              <button
                role="menuitem"
                onClick={() => {
                  navigate(`${v.route}?${v.query}`);
                  close();
                }}
                className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left text-sm text-ink-2"
              >
                {v.name}
              </button>
              <button
                aria-label={`Delete view ${v.name}`}
                onClick={() => del.mutate(v.id)}
                className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-3 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 hover:text-down"
              >
                <Trash2 size={12} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Menu>
  );
}

/* --------------------------------- FilterBar --------------------------------- */

export function FilterBar({ title, lede }: { title: string; lede?: string }) {
  const { reset, activeDimensionCount } = useFilters();
  const [saveOpen, setSaveOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
          {lede && <p className="mt-0.5 text-sm text-ink-2">{lede}</p>}
        </div>

        {/* Desktop controls */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <DateControl />
          <CompareControl />
          <AddFilterMenu />
          <span className="mx-1 h-5 w-px bg-line-2" aria-hidden="true" />
          <Button size="sm" onClick={() => setSaveOpen(true)}>
            <BookmarkPlus size={14} aria-hidden="true" /> Save view
          </Button>
          <ViewsMenu />
        </div>

        {/* Mobile: one entry point, anchored sheet */}
        <div className="flex items-center gap-2 md:hidden">
          <Button size="sm" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
            <ListFilter size={14} aria-hidden="true" />
            Filters{activeDimensionCount > 0 ? ` (${activeDimensionCount})` : ''}
          </Button>
        </div>
      </div>

      <div className="mt-2.5 hidden flex-wrap items-center gap-1.5 empty:hidden md:flex">
        <ActiveChips />
        {activeDimensionCount > 0 && (
          <button onClick={reset} className="ml-1 text-xs text-ink-3 underline underline-offset-2 hover:text-ink">
            Reset all
          </button>
        )}
      </div>

      <SaveViewDialog open={saveOpen} onClose={() => setSaveOpen(false)} />

      <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Filters">
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-ink-3 uppercase">Date range</p>
            <DateControl block />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-ink-3 uppercase">Compare against</p>
            <CompareControl />
          </div>
          <div>
            <p className="mb-1.5 font-mono text-[10px] tracking-wide text-ink-3 uppercase">Dimensions</p>
            <div className="flex flex-wrap items-center gap-1.5">
              <ActiveChipsMobile />
              <AddFilterMenu />
            </div>
          </div>
          <div className="flex gap-2 border-t border-line pt-3">
            <Button className="flex-1" onClick={() => { reset(); }}>
              Reset all
            </Button>
            <Button variant="primary" className="flex-1" onClick={() => setSheetOpen(false)}>
              Done
            </Button>
          </div>
          <Button variant="ghost" onClick={() => { setSheetOpen(false); setSaveOpen(true); }}>
            <BookmarkPlus size={14} aria-hidden="true" /> Save current view
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}

function ActiveChipsMobile() {
  return <ActiveChips />;
}
