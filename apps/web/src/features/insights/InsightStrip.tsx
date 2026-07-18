import { useState } from 'react';
import { useInsights } from '../../lib/queries';
import { InsightCard } from './InsightCard';
import { AddToReportDialog, type PendingBlock } from '../reports/AddToReportDialog';

/** Insights relevant to the current section, filterable by rule id prefix. */
export function InsightStrip({
  query,
  include,
  periodLabel,
  max = 3,
}: {
  query: string;
  include: (id: string) => boolean;
  periodLabel: string;
  max?: number;
}) {
  const insights = useInsights(query);
  const [pending, setPending] = useState<PendingBlock | null>(null);
  const relevant = (insights.data?.insights ?? []).filter((i) => include(i.id)).slice(0, max);
  if (relevant.length === 0) return null;
  return (
    <section aria-label="Insights" className="mt-4">
      <div className={`grid gap-3 ${relevant.length > 1 ? 'md:grid-cols-2' : ''} ${relevant.length > 2 ? 'xl:grid-cols-3' : ''}`}>
        {relevant.map((ins) => (
          <InsightCard
            key={ins.id}
            insight={ins}
            onAddToReport={() =>
              setPending({ type: 'insight', config: { insight: ins, capturedAt: new Date().toISOString(), periodLabel } })
            }
          />
        ))}
      </div>
      <AddToReportDialog open={pending !== null} onClose={() => setPending(null)} block={pending} />
    </section>
  );
}
