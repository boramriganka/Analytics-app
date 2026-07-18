import { Link } from 'react-router-dom';
import { ArrowRight, FilePlus2 } from 'lucide-react';
import type { Insight } from '@signalroom/schemas';

const SEVERITY: Record<Insight['severity'], { label: string; cls: string }> = {
  attention: { label: 'Needs attention', cls: 'bg-down-wash text-down border-down/25' },
  notable: { label: 'Notable', cls: 'bg-warn-wash text-warn border-warn/25' },
  info: { label: 'Observed', cls: 'bg-well text-ink-2 border-line-2' },
};

export function InsightCard({ insight, onAddToReport }: { insight: Insight; onAddToReport?: () => void }) {
  const sev = SEVERITY[insight.severity];
  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-line bg-panel p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase ${sev.cls}`}>{sev.label}</span>
          <span className="rounded border border-line-2 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-ink-3 uppercase">
            {insight.kind}
          </span>
        </div>
        {onAddToReport && (
          <button
            aria-label="Add insight to report"
            title="Add to report"
            onClick={onAddToReport}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-3 transition-colors hover:bg-well hover:text-ink"
          >
            <FilePlus2 size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      <h3 className="mt-2.5 text-[15px] leading-snug font-semibold text-ink">{insight.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{insight.body}</p>
      <p className="mt-2 text-xs text-ink-3">{insight.comparison}</p>
      <Link
        to={insight.href}
        className="group mt-3 inline-flex items-center gap-1 text-xs font-medium text-signal-ink hover:underline"
      >
        See the supporting view
        <ArrowRight size={12} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </article>
  );
}
