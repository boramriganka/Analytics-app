import { useId, useState, type ReactNode } from 'react';
import { Download, FilePlus2, Table2 } from 'lucide-react';
import { IconButton } from './primitives';

export interface ChartColumn {
  key: string;
  label: string;
  numeric?: boolean;
  format?: (v: unknown) => string;
}

export function downloadCsv(fileName: string, columns: ChartColumn[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [columns.map((c) => esc(c.label)).join(',')];
  for (const row of rows) lines.push(columns.map((c) => esc(row[c.key])).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Frame for every visualization: title, plain-text summary for screen readers,
 * a data-table alternative, CSV export, and an add-to-report action.
 */
export function ChartContainer({
  title,
  subtitle,
  summary,
  columns,
  rows,
  csvName,
  onAddToReport,
  children,
  height,
}: {
  title: string;
  subtitle?: string;
  /** one-sentence accessible description of what the chart currently shows */
  summary: string;
  columns: ChartColumn[];
  rows: Record<string, unknown>[];
  csvName: string;
  onAddToReport?: () => void;
  children: ReactNode;
  height?: string;
}) {
  const [tableView, setTableView] = useState(false);
  const summaryId = useId();

  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-panel">
      <header className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1 sm:px-5">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-3">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            label={tableView ? 'Show chart' : 'Show data table'}
            size="sm"
            aria-pressed={tableView}
            onClick={() => setTableView((v) => !v)}
            className={tableView ? 'bg-well text-ink' : ''}
          >
            <Table2 size={15} aria-hidden="true" />
          </IconButton>
          <IconButton label="Download data as CSV" size="sm" onClick={() => downloadCsv(csvName, columns, rows)}>
            <Download size={15} aria-hidden="true" />
          </IconButton>
          {onAddToReport && (
            <IconButton label="Add to report" size="sm" onClick={onAddToReport}>
              <FilePlus2 size={15} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </header>
      <p id={summaryId} className="sr-only">
        {summary}
      </p>
      <div aria-describedby={summaryId} className="px-1 pb-3 sm:px-2">
        {tableView ? (
          <div className="max-h-80 overflow-auto px-3 pt-2 sm:px-3">
            <DataTable columns={columns} rows={rows} dense />
          </div>
        ) : (
          <div style={height ? { height } : undefined}>{children}</div>
        )}
      </div>
    </section>
  );
}

export function DataTable({
  columns,
  rows,
  dense = false,
  caption,
}: {
  columns: ChartColumn[];
  rows: Record<string, unknown>[];
  dense?: boolean;
  caption?: string;
}) {
  const pad = dense ? 'px-2.5 py-1.5' : 'px-3 py-2.5';
  return (
    <table className="w-full text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b border-line text-left">
          {columns.map((c) => (
            <th key={c.key} scope="col" className={`${pad} text-xs font-medium text-ink-3 ${c.numeric ? 'text-right' : ''}`}>
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b border-line/60 last:border-0">
            {columns.map((c) => (
              <td key={c.key} className={`${pad} ${c.numeric ? 'tabular text-right' : ''} text-ink`}>
                {c.format ? c.format(row[c.key]) : String(row[c.key] ?? '—')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
