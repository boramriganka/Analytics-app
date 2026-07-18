import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  ArrowLeft, ArrowRight, Check, Download, FileUp, RotateCcw, Save, UploadCloud, X,
} from 'lucide-react';
import { CANONICAL_FIELDS } from '@signalroom/schemas';
import { api } from '../../lib/api';
import { useMappings } from '../../lib/queries';
import { Button, Field, Input, Skeleton } from '../../design/primitives';
import { Dialog, useToast } from '../../design/overlay';
import { Logo } from '../../shell/AppShell';
import {
  parseCsvFile, autoMap, missingRequired, detectDayFirst, validateRows, rejectedCsv, uploadRows,
  type ParsedFile, type Mapping, type ValidationResult,
} from '../../features/import/importLogic';

type Step = 'upload' | 'map' | 'validate' | 'import' | 'done';
const STEPS: { key: Step; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'map', label: 'Map columns' },
  { key: 'validate', label: 'Validate' },
  { key: 'import', label: 'Import' },
];

export default function ImportWizard() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [dayFirst, setDayFirst] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validateProgress, setValidateProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{ id: number; dateMin: string | null; dateMax: string | null; importedRows: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

  async function onFile(f: File) {
    setError(null);
    try {
      const parsed = await parseCsvFile(f);
      const auto = autoMap(parsed.headers);
      setFile(parsed);
      setMapping(auto);
      setDayFirst(detectDayFirst(parsed.rows, auto.timestamp));
      setStep('map');
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function runValidation() {
    if (!file) return;
    setStep('validate');
    setValidation(null);
    setValidateProgress(0);
    const res = await validateRows(file.rows, mapping, dayFirst, (done, total) => setValidateProgress(done / total));
    setValidation(res);
  }

  async function runImport() {
    if (!file || !validation) return;
    setStep('import');
    setUploadProgress(0);
    try {
      const job = await uploadRows(api, file.fileName, validation.valid, validation.invalid.length, (sent, total) =>
        setUploadProgress(sent / total)
      );
      setResult(job);
      queryClient.invalidateQueries();
      setStep('done');
    } catch (e) {
      setError((e as Error).message);
      setStep('validate');
    }
  }

  const undo = useMutation({
    mutationFn: () => api(`/imports/${result!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Import removed', { tone: 'success' });
      navigate('/app/data-quality');
    },
  });

  const stepIndex = STEPS.findIndex((s) => s.key === (step === 'done' ? 'import' : step));

  return (
    <div className="min-h-dvh bg-paper">
      <header className="flex h-14 items-center justify-between border-b border-line px-4 sm:px-6">
        <Link to="/app/overview" className="flex items-center gap-2 font-semibold text-ink">
          <Logo /> Signalroom
        </Link>
        <Link to="/app/overview" className="text-sm text-ink-2 hover:text-ink">
          Exit import
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {/* Stepper */}
        <ol className="mb-8 flex items-center gap-2" aria-label="Import steps">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex items-center gap-2">
              <span
                aria-current={i === stepIndex ? 'step' : undefined}
                className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] ${
                  i < stepIndex || step === 'done'
                    ? 'bg-up text-white'
                    : i === stepIndex
                      ? 'bg-signal text-white'
                      : 'border border-line-2 text-ink-3'
                }`}
              >
                {i < stepIndex || step === 'done' ? <Check size={12} aria-hidden="true" /> : i + 1}
              </span>
              <span className={`hidden text-sm sm:inline ${i === stepIndex ? 'font-medium text-ink' : 'text-ink-3'}`}>
                {s.label}
              </span>
              {i < STEPS.length - 1 && <span className="mx-1 h-px w-4 bg-line-2 sm:w-10" aria-hidden="true" />}
            </li>
          ))}
        </ol>

        {error && (
          <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-down/30 bg-down-wash px-4 py-3 text-sm text-down">
            {error}
            <button aria-label="Dismiss error" onClick={() => setError(null)}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {step === 'upload' && <UploadStep onFile={onFile} />}
        {step === 'map' && file && (
          <MapStep
            file={file}
            mapping={mapping}
            setMapping={setMapping}
            dayFirst={dayFirst}
            setDayFirst={setDayFirst}
            onBack={() => {
              setFile(null);
              setStep('upload');
            }}
            onNext={runValidation}
          />
        )}
        {step === 'validate' && file && (
          <ValidateStep
            file={file}
            validation={validation}
            progress={validateProgress}
            onBack={() => setStep('map')}
            onImport={runImport}
          />
        )}
        {step === 'import' && (
          <section aria-live="polite">
            <h1 className="text-lg font-semibold text-ink">Importing…</h1>
            <p className="mt-1 text-sm text-ink-2">Rows are validated again on the server as they arrive.</p>
            <Progress value={uploadProgress} label="Upload progress" className="mt-5" />
          </section>
        )}
        {step === 'done' && result && (
          <section>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-up text-white">
                <Check size={16} aria-hidden="true" />
              </span>
              <h1 className="text-lg font-semibold text-ink">Import complete</h1>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-ink-3">Rows imported</dt>
                <dd className="tabular mt-1 text-xl font-semibold">{result.importedRows.toLocaleString()}</dd>
              </div>
              <div className="rounded-lg border border-line bg-panel p-3">
                <dt className="text-xs text-ink-3">Rows rejected</dt>
                <dd className="tabular mt-1 text-xl font-semibold">{validation?.invalid.length.toLocaleString() ?? 0}</dd>
              </div>
              <div className="col-span-2 rounded-lg border border-line bg-panel p-3 sm:col-span-1">
                <dt className="text-xs text-ink-3">Date range</dt>
                <dd className="tabular mt-1 text-sm font-medium">
                  {result.dateMin} → {result.dateMax}
                </dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="primary"
                onClick={() =>
                  navigate(
                    result.dateMin && result.dateMax
                      ? `/app/overview?from=${result.dateMin}&to=${result.dateMax}&importId=${result.id}`
                      : '/app/overview'
                  )
                }
              >
                See the analytics <ArrowRight size={14} aria-hidden="true" />
              </Button>
              <Button onClick={() => navigate('/app/data-quality')}>Data quality report</Button>
              <Button variant="danger" onClick={() => undo.mutate()} loading={undo.isPending}>
                <RotateCcw size={13} aria-hidden="true" /> Undo this import
              </Button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

/* --------------------------------- step 1 ---------------------------------- */

function UploadStep({ onFile }: { onFile: (f: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handle(f: File | undefined) {
    if (!f) return;
    setBusy(true);
    await onFile(f);
    setBusy(false);
  }

  return (
    <section>
      <h1 className="text-lg font-semibold text-ink">Upload your sales export</h1>
      <p className="mt-1 max-w-lg text-sm text-ink-2">
        A CSV export from your POS, shop platform or marketplace. You’ll map its columns in the next step — no fixed template
        required.
      </p>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload CSV file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed px-6 py-14 text-center transition-colors ${
          dragOver ? 'border-signal bg-signal-wash/50' : 'border-line-2 bg-panel hover:border-ink-3'
        }`}
      >
        {busy ? (
          <>
            <Skeleton className="h-8 w-8 rounded-full" />
            <p className="text-sm text-ink-2">Reading file…</p>
          </>
        ) : (
          <>
            <UploadCloud size={28} className="text-ink-3" aria-hidden="true" />
            <p className="text-sm font-medium text-ink">Drop a CSV here, or click to choose a file</p>
            <p className="font-mono text-[11px] text-ink-3">.csv · comma, semicolon or tab delimited</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv,text/tab-separated-values"
          className="sr-only"
          onChange={(e) => void handle(e.target.files?.[0])}
        />
      </div>
      <p className="mt-4 text-xs leading-relaxed text-ink-3">
        Required information: an order ID, a date, a product name, a quantity and a gross sales amount. Everything else —
        discounts, refunds, cost, customers, channel, store, country — unlocks more analytics when present.
      </p>
    </section>
  );
}

/* --------------------------------- step 2 ---------------------------------- */

function MapStep({
  file, mapping, setMapping, dayFirst, setDayFirst, onBack, onNext,
}: {
  file: ParsedFile;
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
  dayFirst: boolean;
  setDayFirst: (v: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const missing = missingRequired(mapping);
  const presets = useMappings();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [presetName, setPresetName] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);

  const usedHeaders = useMemo(() => new Set(Object.values(mapping).filter(Boolean)), [mapping]);

  const savePreset = useMutation({
    mutationFn: () => api('/mappings', { method: 'POST', body: JSON.stringify({ name: presetName, mapping }) }),
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast('Mapping preset saved', { tone: 'success' });
      setSaveOpen(false);
      setPresetName('');
    },
  });

  const sample = (header: string | undefined): string => {
    if (!header) return '';
    for (const row of file.rows.slice(0, 20)) {
      const v = String(row[header] ?? '').trim();
      if (v) return v;
    }
    return '';
  };

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-ink">Map your columns</h1>
          <p className="mt-1 text-sm text-ink-2">
            <span className="font-mono text-xs">{file.fileName}</span> · {file.rows.length.toLocaleString()} rows ·{' '}
            {file.headers.length} columns
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(presets.data?.presets ?? []).length > 0 && (
            <select
              aria-label="Apply a saved mapping preset"
              className="h-8 rounded-[var(--radius-control)] border border-line-2 bg-panel px-2 text-xs"
              defaultValue=""
              onChange={(e) => {
                const p = presets.data!.presets.find((x) => String(x.id) === e.target.value);
                if (p) {
                  setMapping(p.mapping as Mapping);
                  toast(`Applied preset “${p.name}”`);
                }
              }}
            >
              <option value="" disabled>
                Apply preset…
              </option>
              {presets.data!.presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          <Button size="sm" onClick={() => setSaveOpen(true)}>
            <Save size={13} aria-hidden="true" /> Save preset
          </Button>
        </div>
      </div>

      <div className="mt-5 overflow-x-auto rounded-[var(--radius-card)] border border-line bg-panel">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-3">
              <th scope="col" className="px-4 py-2.5 font-medium">Signalroom field</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Your column</th>
              <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Sample value</th>
            </tr>
          </thead>
          <tbody>
            {CANONICAL_FIELDS.map((field) => {
              const selected = mapping[field.key] ?? '';
              return (
                <tr key={field.key} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-2">
                    <span className="font-medium text-ink">{field.label}</span>
                    {field.required && (
                      <span className="ml-1.5 rounded bg-signal-wash px-1 py-0.5 font-mono text-[9px] tracking-wide text-signal-ink uppercase">
                        required
                      </span>
                    )}
                    <p className="mt-0.5 max-w-xs text-[11px] leading-snug text-ink-3">{field.description}</p>
                  </td>
                  <td className="px-4 py-2 align-top">
                    <select
                      aria-label={`Column for ${field.label}`}
                      value={selected}
                      onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value || undefined })}
                      className={`h-8 w-full max-w-44 rounded-[var(--radius-control)] border bg-panel px-2 text-xs ${
                        field.required && !selected ? 'border-down/50' : 'border-line-2'
                      }`}
                    >
                      <option value="">— not in this file —</option>
                      {file.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                          {usedHeaders.has(h) && h !== selected ? ' (used)' : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hidden max-w-40 truncate px-4 py-2 align-top font-mono text-[11px] text-ink-3 sm:table-cell">
                    {sample(selected)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={dayFirst}
          onChange={(e) => setDayFirst(e.target.checked)}
          className="h-4 w-4 accent-[var(--color-signal)]"
        />
        Dates are day-first (31/12/2025)
        <span className="text-xs text-ink-3">— detected automatically, override if needed</span>
      </label>

      {missing.length > 0 && (
        <p role="status" className="mt-3 text-sm text-down">
          Still needed: {missing.map((k) => CANONICAL_FIELDS.find((f) => f.key === k)!.label).join(', ')}.
        </p>
      )}

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Different file
        </Button>
        <Button variant="primary" disabled={missing.length > 0} onClick={onNext}>
          Validate rows <ArrowRight size={14} aria-hidden="true" />
        </Button>
      </div>

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title="Save mapping preset">
        <p className="mb-3 text-sm text-ink-2">Reuse this column mapping the next time you import from the same system.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (presetName.trim()) savePreset.mutate();
          }}
        >
          <Field label="Preset name">
            <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="e.g. Shopify export" required />
          </Field>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={savePreset.isPending} disabled={!presetName.trim()}>
              Save preset
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}

/* --------------------------------- step 3 ---------------------------------- */

function ValidateStep({
  file, validation, progress, onBack, onImport,
}: {
  file: ParsedFile;
  validation: ValidationResult | null;
  progress: number;
  onBack: () => void;
  onImport: () => void;
}) {
  if (!validation) {
    return (
      <section aria-live="polite">
        <h1 className="text-lg font-semibold text-ink">Checking every row…</h1>
        <p className="mt-1 text-sm text-ink-2">Dates, numbers and required fields are validated before anything is imported.</p>
        <Progress value={progress} label="Validation progress" className="mt-5" />
      </section>
    );
  }

  const { valid, invalid } = validation;
  return (
    <section>
      <h1 className="text-lg font-semibold text-ink">Validation results</h1>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-up/25 bg-up-wash p-3">
          <dt className="text-xs text-up">Ready to import</dt>
          <dd className="tabular mt-1 text-2xl font-semibold text-up">{valid.length.toLocaleString()}</dd>
        </div>
        <div className={`rounded-lg border p-3 ${invalid.length ? 'border-down/25 bg-down-wash' : 'border-line bg-panel'}`}>
          <dt className={`text-xs ${invalid.length ? 'text-down' : 'text-ink-3'}`}>Rows with problems</dt>
          <dd className={`tabular mt-1 text-2xl font-semibold ${invalid.length ? 'text-down' : 'text-ink-3'}`}>
            {invalid.length.toLocaleString()}
          </dd>
        </div>
      </dl>

      {invalid.length > 0 && (
        <>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-2">
              These rows will be skipped. Fix them in your source file and re-import, or continue without them.
            </p>
            <Button
              size="sm"
              onClick={() => {
                const blob = new Blob([rejectedCsv(file.headers, invalid)], { type: 'text/csv;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `rejected-rows-${file.fileName}`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={13} aria-hidden="true" /> Download rejected rows
            </Button>
          </div>
          <div className="mt-3 max-h-64 overflow-auto rounded-[var(--radius-card)] border border-line bg-panel">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-panel">
                <tr className="border-b border-line text-left text-ink-3">
                  <th scope="col" className="px-3 py-2 font-medium">Row</th>
                  <th scope="col" className="px-3 py-2 font-medium">Problems</th>
                </tr>
              </thead>
              <tbody>
                {invalid.slice(0, 100).map((r) => (
                  <tr key={r.rowNumber} className="border-b border-line/60 align-top last:border-0">
                    <td className="tabular px-3 py-2 font-mono text-ink-3">#{r.rowNumber}</td>
                    <td className="px-3 py-2 text-down">{r.errors.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {invalid.length > 100 && (
              <p className="border-t border-line px-3 py-2 text-[11px] text-ink-3">
                Showing the first 100 of {invalid.length.toLocaleString()} — the download contains all of them.
              </p>
            )}
          </div>
        </>
      )}

      <div className="mt-5 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Adjust mapping
        </Button>
        <Button variant="primary" disabled={valid.length === 0} onClick={onImport}>
          <FileUp size={14} aria-hidden="true" />
          Import {valid.length.toLocaleString()} rows
        </Button>
      </div>
    </section>
  );
}

function Progress({ value, label, className = '' }: { value: number; label: string; className?: string }) {
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className="h-2 overflow-hidden rounded-full bg-well"
      >
        <div className="h-full rounded-full bg-signal transition-[width] duration-200" style={{ width: `${value * 100}%` }} />
      </div>
      <p className="tabular mt-1.5 font-mono text-[11px] text-ink-3">{Math.round(value * 100)}%</p>
    </div>
  );
}
