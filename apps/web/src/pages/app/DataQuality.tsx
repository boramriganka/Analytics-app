import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RotateCcw, Upload } from 'lucide-react';
import { useDataQuality } from '../../lib/queries';
import { api } from '../../lib/api';
import { Button, EmptyState, ErrorState, Skeleton } from '../../design/primitives';
import { useToast } from '../../design/overlay';
import { num, pct, timeAgo } from '../../lib/format';

const FIELD_LABELS: Record<string, { label: string; consequence: string }> = {
  category: { label: 'Category', consequence: 'Rows appear as “Uncategorized” in category analytics.' },
  customerId: { label: 'Customer ID', consequence: 'Rows are excluded from repeat-customer and cohort analytics.' },
  channel: { label: 'Channel', consequence: 'Rows appear as “Unattributed” in channel analytics.' },
  storeOnStoreChannel: { label: 'Store (on store-channel rows)', consequence: 'Store comparisons undercount these sales.' },
  country: { label: 'Country', consequence: 'Rows appear as “Unknown” in country breakdowns.' },
  cost: { label: 'Cost', consequence: 'Gross margin is computed without these rows.' },
  transactionId: { label: 'Transaction ID', consequence: 'Duplicate detection cannot see these rows.' },
};

export default function DataQuality() {
  const dq = useDataQuality();
  const queryClient = useQueryClient();
  const toast = useToast();

  const undo = useMutation({
    mutationFn: (id: number) => api(`/imports/${id}`, { method: 'DELETE' }),
    onSuccess: (r) => {
      queryClient.invalidateQueries();
      toast(`Import removed (${(r as { removedTransactions: number }).removedTransactions.toLocaleString()} transactions)`, {
        tone: 'success',
      });
    },
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  if (dq.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (dq.isError || !dq.data) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <ErrorState message={(dq.error as Error | undefined)?.message ?? 'Could not load'} retry={() => dq.refetch()} />
      </div>
    );
  }

  const d = dq.data;
  const total = d.transactionCount || 1;
  const missingRows = Object.entries(d.missingFieldCounts)
    .filter(([k]) => FIELD_LABELS[k])
    .map(([k, v]) => ({ key: k, ...FIELD_LABELS[k]!, count: v, share: v / total }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Data quality</h1>
        <p className="mt-0.5 text-sm text-ink-2">
          What your analytics can and can’t see, across {num(d.transactionCount)} transactions.
        </p>
      </div>

      {/* Headline checks */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QualityStat label="Transactions" value={num(d.transactionCount)} tone="neutral" />
        <QualityStat
          label="Duplicate transaction IDs"
          value={num(d.duplicateTransactionIds)}
          tone={d.duplicateTransactionIds > 0 ? 'warn' : 'good'}
          hint={d.duplicateTransactionIds > 0 ? 'Same ID appears on multiple rows — check the source export.' : 'No duplicates found.'}
        />
        <QualityStat
          label="Negative net rows"
          value={num(d.negativeNetRows)}
          tone={d.negativeNetRows > 0 ? 'warn' : 'good'}
          hint={d.negativeNetRows > 0 ? 'Refunds exceed gross on these rows.' : 'None found.'}
        />
        <QualityStat
          label="Unidentified customers"
          value={pct(d.unidentifiedCustomerRows / total)}
          tone={d.unidentifiedCustomerRows / total > 0.2 ? 'warn' : 'good'}
          hint="Share of rows without a customer ID."
        />
      </div>

      {/* Missing fields */}
      <section className="mt-5 rounded-[var(--radius-card)] border border-line bg-panel" aria-label="Missing fields">
        <h2 className="border-b border-line px-4 py-3 text-[15px] font-semibold text-ink sm:px-5">Missing fields</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-ink-3">
                <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">Field</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Rows missing</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Share</th>
                <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">What that means</th>
              </tr>
            </thead>
            <tbody>
              {missingRows.map((r) => (
                <tr key={r.key} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2.5 font-medium text-ink sm:px-5">{r.label}</td>
                  <td className="tabular px-4 py-2.5 text-right">{num(r.count)}</td>
                  <td className={`tabular px-4 py-2.5 text-right ${r.share > 0.2 ? 'text-warn' : 'text-ink-2'}`}>{pct(r.share)}</td>
                  <td className="hidden px-4 py-2.5 text-xs text-ink-3 sm:table-cell">{r.consequence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Import history */}
      <section className="mt-5" aria-label="Import history">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Import history</h2>
          <Link to="/onboarding/import" className="inline-flex items-center gap-1.5 text-sm font-medium text-signal-ink hover:underline">
            <Upload size={13} aria-hidden="true" /> New import
          </Link>
        </div>
        {d.imports.length === 0 ? (
          <EmptyState title="No imports yet" body="Everything you see is the seeded sample dataset." />
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-panel">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-3">
                  <th scope="col" className="px-4 py-2.5 font-medium sm:px-5">File</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Imported</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Rejected</th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">Data range</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">When</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {d.imports.map((job) => (
                  <tr key={job.id} className="border-b border-line/60 last:border-0">
                    <td className="max-w-44 truncate px-4 py-2.5 font-medium text-ink sm:px-5">{job.fileName}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] tracking-wide uppercase ${
                          job.status === 'complete'
                            ? 'bg-up-wash text-up'
                            : job.status === 'undone'
                              ? 'bg-well text-ink-3'
                              : 'bg-warn-wash text-warn'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="tabular px-4 py-2.5 text-right">{num(job.importedRows)}</td>
                    <td className={`tabular px-4 py-2.5 text-right ${job.rejectedRows > 0 ? 'text-warn' : 'text-ink-3'}`}>
                      {num(job.rejectedRows)}
                    </td>
                    <td className="tabular hidden px-4 py-2.5 font-mono text-xs text-ink-2 md:table-cell">
                      {job.dateMin ? `${job.dateMin} → ${job.dateMax}` : '—'}
                    </td>
                    <td className="hidden px-4 py-2.5 text-right text-xs text-ink-3 sm:table-cell">{timeAgo(job.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {job.status === 'complete' && job.dateMin && (
                          <Link
                            to={`/app/overview?from=${job.dateMin}&to=${job.dateMax}&importId=${job.id}`}
                            className="text-xs font-medium text-signal-ink hover:underline"
                          >
                            Analyze
                          </Link>
                        )}
                        {job.status === 'complete' && (
                          <Button size="sm" variant="ghost" onClick={() => undo.mutate(job.id)} disabled={undo.isPending} aria-label={`Undo import ${job.fileName}`}>
                            <RotateCcw size={12} aria-hidden="true" /> Undo
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function QualityStat({ label, value, tone, hint }: { label: string; value: string; tone: 'good' | 'warn' | 'neutral'; hint?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-panel p-4">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={`tabular mt-1.5 text-2xl font-semibold ${tone === 'warn' ? 'text-warn' : tone === 'good' ? 'text-up' : 'text-ink'}`}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] leading-snug text-ink-3">{hint}</p>}
    </div>
  );
}
