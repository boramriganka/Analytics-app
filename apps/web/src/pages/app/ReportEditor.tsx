import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowDown, ArrowUp, Printer, Trash2, Type, StickyNote } from 'lucide-react';
import type { Report, ReportBlock, Insight } from '@signalroom/schemas';
import { api } from '../../lib/api';
import { useReport, useSummary, useTimeseries, useBreakdown } from '../../lib/queries';
import { Button, ErrorState, Skeleton } from '../../design/primitives';
import { useToast } from '../../design/overlay';
import { RevenuePulse } from '../../features/charts/RevenuePulse';
import { BreakdownBars } from '../../features/charts/BreakdownBars';
import { Metric } from '../../design/Metric';
import { KPI_META } from '../../features/kpi/kpiMeta';
import { InsightCard } from '../../features/insights/InsightCard';
import { money, isoDate } from '../../lib/format';

export default function ReportEditor() {
  const { id } = useParams();
  const reportId = Number(id);
  const report = useReport(Number.isFinite(reportId) ? reportId : null);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [titleDraft, setTitleDraft] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries();

  const patchTitle = useMutation({
    mutationFn: (title: string) => api(`/reports/${reportId}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
    onSuccess: invalidate,
  });
  const addBlock = useMutation({
    mutationFn: (b: { type: ReportBlock['type']; config: Record<string, unknown> }) =>
      api(`/reports/${reportId}/blocks`, { method: 'POST', body: JSON.stringify(b) }),
    onSuccess: invalidate,
  });
  const patchBlock = useMutation({
    mutationFn: ({ blockId, config }: { blockId: number; config: Record<string, unknown> }) =>
      api(`/reports/${reportId}/blocks/${blockId}`, { method: 'PATCH', body: JSON.stringify({ config }) }),
    onSuccess: invalidate,
  });
  const deleteBlock = useMutation({
    mutationFn: (blockId: number) => api(`/reports/${reportId}/blocks/${blockId}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
  const reorder = useMutation({
    mutationFn: (order: number[]) => api(`/reports/${reportId}/blocks`, { method: 'PUT', body: JSON.stringify({ order }) }),
    onSuccess: invalidate,
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  if (report.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (report.isError || !report.data) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <ErrorState message={(report.error as Error | undefined)?.message ?? 'Report not found'} retry={() => report.refetch()} />
      </div>
    );
  }

  const r: Report = report.data;
  const blocks = [...r.blocks].sort((a, b) => a.position - b.position);

  function move(blockId: number, dir: -1 | 1) {
    const ids = blocks.map((b) => b.id);
    const i = ids.indexOf(blockId);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    next[i] = ids[j]!;
    next[j] = ids[i]!;
    reorder.mutate(next);
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      {/* Editor chrome — hidden when printing */}
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link to="/app/reports" className="inline-flex items-center gap-1.5 text-sm text-ink-2 hover:text-ink">
          <ArrowLeft size={14} aria-hidden="true" /> All reports
        </Link>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => addBlock.mutate({ type: 'heading', config: { text: 'Section title' } })}>
            <Type size={13} aria-hidden="true" /> Heading
          </Button>
          <Button size="sm" onClick={() => addBlock.mutate({ type: 'note', config: { text: '' } })}>
            <StickyNote size={13} aria-hidden="true" /> Note
          </Button>
          <Button variant="primary" size="sm" onClick={() => window.print()}>
            <Printer size={13} aria-hidden="true" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Document */}
      <article className="rounded-[var(--radius-card)] border border-line bg-panel px-6 py-8 print:border-0 print:px-0 sm:px-10">
        <header className="border-b border-line pb-5">
          <input
            value={titleDraft ?? r.title}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={() => {
              if (titleDraft && titleDraft.trim() && titleDraft !== r.title) patchTitle.mutate(titleDraft.trim());
              setTitleDraft(null);
            }}
            aria-label="Report title"
            className="w-full bg-transparent text-2xl font-semibold tracking-tight text-ink outline-none print:pointer-events-none"
          />
          <p className="mt-1.5 font-mono text-[11px] tracking-wide text-ink-3 uppercase">
            Signalroom report · {isoDate(r.updatedAt.slice(0, 10))}
          </p>
        </header>

        {blocks.length === 0 && (
          <p className="py-10 text-center text-sm text-ink-3">
            This report is empty. Add a heading or note here, or use <span className="font-medium">Add to report</span> on any chart
            or insight in the app.
          </p>
        )}

        <ol className="flex flex-col">
          {blocks.map((block, i) => (
            <li key={block.id} className="group relative border-b border-line/60 py-5 last:border-0 print:break-inside-avoid">
              {/* block controls */}
              <div className="no-print absolute top-4 -right-2 flex flex-col gap-0.5 rounded-md border border-line bg-panel opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 sm:-right-4">
                <button aria-label="Move block up" disabled={i === 0} onClick={() => move(block.id, -1)} className="flex h-6 w-6 items-center justify-center text-ink-3 hover:text-ink disabled:opacity-30">
                  <ArrowUp size={12} aria-hidden="true" />
                </button>
                <button aria-label="Move block down" disabled={i === blocks.length - 1} onClick={() => move(block.id, 1)} className="flex h-6 w-6 items-center justify-center text-ink-3 hover:text-ink disabled:opacity-30">
                  <ArrowDown size={12} aria-hidden="true" />
                </button>
                <button aria-label="Delete block" onClick={() => deleteBlock.mutate(block.id)} className="flex h-6 w-6 items-center justify-center text-ink-3 hover:text-down">
                  <Trash2 size={12} aria-hidden="true" />
                </button>
              </div>

              <BlockView
                block={block}
                onSaveText={(text) => patchBlock.mutate({ blockId: block.id, config: { ...block.config, text } })}
              />
            </li>
          ))}
        </ol>
      </article>

      <p className="no-print mt-3 text-center text-xs text-ink-3">
        “Export PDF” uses your browser’s print dialog — choose “Save as PDF” as the destination.
      </p>
    </div>
  );
}

/* ------------------------------- block renderers ------------------------------ */

function BlockView({ block, onSaveText }: { block: ReportBlock; onSaveText: (text: string) => void }) {
  switch (block.type) {
    case 'heading':
      return <EditableText tag="h2" initial={(block.config.text as string) ?? ''} onSave={onSaveText} className="text-lg font-semibold tracking-tight text-ink" placeholder="Section title" />;
    case 'note':
      return <EditableText tag="p" initial={(block.config.text as string) ?? ''} onSave={onSaveText} className="text-sm leading-relaxed text-ink-2" placeholder="Write a short note…" multiline />;
    case 'insight': {
      const ins = block.config.insight as Insight;
      return (
        <div>
          <InsightCard insight={ins} />
          <p className="mt-1.5 font-mono text-[10px] text-ink-3">
            Captured {isoDate(String(block.config.capturedAt ?? '').slice(0, 10) || new Date().toISOString().slice(0, 10))} ·{' '}
            {String(block.config.periodLabel ?? '')}
          </p>
        </div>
      );
    }
    case 'chart':
      return <ChartBlock config={block.config} />;
    case 'kpis':
      return <KpisBlock query={String(block.config.query ?? '')} />;
    default:
      return null;
  }
}

function EditableText({
  tag: Tag,
  initial,
  onSave,
  className,
  placeholder,
  multiline = false,
}: {
  tag: 'h2' | 'p';
  initial: string;
  onSave: (text: string) => void;
  className: string;
  placeholder: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? initial;
  const commit = () => {
    if (draft !== null && draft !== initial) onSave(draft);
    setDraft(null);
  };
  if (multiline) {
    return (
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        rows={Math.max(2, value.split('\n').length)}
        aria-label="Note text"
        className={`${className} w-full resize-y bg-transparent outline-none placeholder:text-ink-3 print:pointer-events-none`}
      />
    );
  }
  return (
    <Tag className={className}>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        aria-label="Heading text"
        className="w-full bg-transparent outline-none placeholder:text-ink-3 print:pointer-events-none"
      />
    </Tag>
  );
}

function ChartBlock({ config }: { config: Record<string, unknown> }) {
  const query = String(config.query ?? '');
  const kind = String(config.chart ?? '');
  const title = String(config.title ?? 'Chart');
  return (
    <figure>
      <figcaption className="mb-2 text-[15px] font-semibold text-ink">{title}</figcaption>
      {kind === 'revenue-pulse' ? <PulseBlock query={query} /> : <BreakdownBlock query={query} dimension={String(config.dimension ?? 'category')} />}
    </figure>
  );
}

function PulseBlock({ query }: { query: string }) {
  const ts = useTimeseries(query);
  if (ts.isLoading) return <Skeleton className="h-64" />;
  if (ts.isError || !ts.data) return <p className="text-sm text-ink-3">This chart could not be loaded.</p>;
  return <RevenuePulse data={ts.data} height={260} />;
}

function BreakdownBlock({ query, dimension }: { query: string; dimension: string }) {
  const bd = useBreakdown(query, dimension as never);
  if (bd.isLoading) return <Skeleton className="h-48" />;
  if (bd.isError || !bd.data) return <p className="text-sm text-ink-3">This chart could not be loaded.</p>;
  return (
    <div className="-mx-4">
      <BreakdownBars
        rows={bd.data.rows.map((r) => ({ key: r.key, label: r.label, value: r.netSales, previous: r.previousNetSales }))}
        format={(v) => money(v, { compact: true })}
      />
    </div>
  );
}

function KpisBlock({ query }: { query: string }) {
  const summary = useSummary(query);
  if (summary.isLoading) return <Skeleton className="h-32" />;
  if (summary.isError || !summary.data) return <p className="text-sm text-ink-3">These figures could not be loaded.</p>;
  const keys = ['netSales', 'orders', 'avgOrderValue', 'refundRate'] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {keys.map((k) => {
        const kpi = summary.data.kpis.find((x) => x.key === k);
        return kpi ? <Metric key={k} kpi={kpi} meta={KPI_META[k]} compact /> : null;
      })}
    </div>
  );
}
