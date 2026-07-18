import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReportBlock, Report } from '@signalroom/schemas';
import { api } from '../../lib/api';
import { useReports } from '../../lib/queries';
import { Dialog, useToast } from '../../design/overlay';
import { Button, Field, Input } from '../../design/primitives';

export interface PendingBlock {
  type: ReportBlock['type'];
  config: Record<string, unknown>;
}

export function AddToReportDialog({
  open,
  onClose,
  block,
}: {
  open: boolean;
  onClose: () => void;
  block: PendingBlock | null;
}) {
  const reports = useReports();
  const [newTitle, setNewTitle] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const add = useMutation({
    mutationFn: async ({ reportId }: { reportId: number }) => {
      await api(`/reports/${reportId}/blocks`, { method: 'POST', body: JSON.stringify(block) });
      return reportId;
    },
    onSuccess: (reportId) => {
      queryClient.invalidateQueries();
      toast('Added to report', {
        tone: 'success',
        action: { label: 'Open report', onClick: () => navigate(`/app/reports/${reportId}`) },
      });
      onClose();
    },
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  const createAndAdd = useMutation({
    mutationFn: async () => {
      const report = await api<Report>('/reports', { method: 'POST', body: JSON.stringify({ title: newTitle }) });
      await api(`/reports/${report.id}/blocks`, { method: 'POST', body: JSON.stringify(block) });
      return report.id;
    },
    onSuccess: (reportId) => {
      queryClient.invalidateQueries();
      setNewTitle('');
      toast('Report created', {
        tone: 'success',
        action: { label: 'Open report', onClick: () => navigate(`/app/reports/${reportId}`) },
      });
      onClose();
    },
    onError: (e) => toast(e.message, { tone: 'error' }),
  });

  const list = reports.data?.reports ?? [];

  return (
    <Dialog open={open} onClose={onClose} title="Add to report">
      {list.length > 0 && (
        <>
          <p className="mb-2 text-xs font-medium tracking-wide text-ink-3 uppercase">Existing reports</p>
          <div className="mb-4 flex flex-col gap-1">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => add.mutate({ reportId: r.id })}
                disabled={add.isPending}
                className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-left text-sm transition-colors hover:border-signal hover:bg-signal-wash/40"
              >
                <span className="font-medium text-ink">{r.title}</span>
                <span className="text-xs text-ink-3">{r.blockCount} blocks</span>
              </button>
            ))}
          </div>
        </>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (newTitle.trim()) createAndAdd.mutate();
        }}
      >
        <Field label={list.length > 0 ? 'Or start a new report' : 'Name your report'}>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g. July trading review" />
        </Field>
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={createAndAdd.isPending} disabled={!newTitle.trim()}>
            Create & add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
