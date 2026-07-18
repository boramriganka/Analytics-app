import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Trash2, Bookmark } from 'lucide-react';
import type { Report } from '@signalroom/schemas';
import { api } from '../../lib/api';
import { useReports, useViews } from '../../lib/queries';
import { Button, EmptyState, Field, Input, Skeleton } from '../../design/primitives';
import { Dialog, useToast } from '../../design/overlay';
import { timeAgo } from '../../lib/format';

export default function Reports() {
  const reports = useReports();
  const views = useViews();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  const create = useMutation({
    mutationFn: () => api<Report>('/reports', { method: 'POST', body: JSON.stringify({ title }) }),
    onSuccess: (r) => {
      queryClient.invalidateQueries();
      setCreateOpen(false);
      setTitle('');
      navigate(`/app/reports/${r.id}`);
    },
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  const del = useMutation({
    mutationFn: (id: number) => api(`/reports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Report deleted');
    },
  });

  const delView = useMutation({
    mutationFn: (id: number) => api(`/views/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries(),
  });

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Reports</h1>
          <p className="mt-0.5 text-sm text-ink-2">Compose charts, insights and notes into a document you can share or print.</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={14} aria-hidden="true" /> New report
        </Button>
      </div>

      {reports.isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      ) : (reports.data?.reports ?? []).length === 0 ? (
        <EmptyState
          title="No reports yet"
          body="Use “Add to report” on any chart or insight, or start a blank report here."
          action={
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={14} aria-hidden="true" /> New report
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {reports.data!.reports.map((r) => (
            <li key={r.id} className="group relative rounded-[var(--radius-card)] border border-line bg-panel p-4 transition-colors hover:border-line-2">
              <Link to={`/app/reports/${r.id}`} className="block">
                <FileText size={16} className="text-ink-3" aria-hidden="true" />
                <p className="mt-2 font-semibold text-ink">{r.title}</p>
                <p className="mt-1 text-xs text-ink-3">
                  {r.blockCount} {r.blockCount === 1 ? 'block' : 'blocks'} · updated {timeAgo(r.updatedAt)}
                </p>
              </Link>
              <button
                aria-label={`Delete report ${r.title}`}
                onClick={() => del.mutate(r.id)}
                className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded text-ink-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-down-wash hover:text-down"
              >
                <Trash2 size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Saved views */}
      <section className="mt-8" aria-label="Saved views">
        <h2 className="mb-2.5 text-[15px] font-semibold text-ink">Saved views</h2>
        {(views.data?.views ?? []).length === 0 ? (
          <p className="text-sm text-ink-3">
            Nothing saved yet — use <span className="font-medium text-ink-2">Save view</span> on any analytics page to bookmark a
            filtered slice.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-[var(--radius-card)] border border-line bg-panel">
            {views.data!.views.map((v) => (
              <li key={v.id} className="group flex items-center gap-3 px-4 py-2.5">
                <Bookmark size={14} className="shrink-0 text-ink-3" aria-hidden="true" />
                <Link to={`${v.route}?${v.query}`} className="min-w-0 flex-1 truncate text-sm font-medium text-ink hover:text-signal-ink">
                  {v.name}
                </Link>
                <span className="hidden font-mono text-[10px] text-ink-3 sm:block">{v.route.replace('/app/', '')}</span>
                <button
                  aria-label={`Delete view ${v.name}`}
                  onClick={() => delView.mutate(v.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-ink-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-down-wash hover:text-down"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New report">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create.mutate();
          }}
        >
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. July trading review" required />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={create.isPending} disabled={!title.trim()}>
              Create report
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
