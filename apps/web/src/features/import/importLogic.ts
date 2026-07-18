import Papa from 'papaparse';
import {
  CANONICAL_FIELDS,
  REQUIRED_KEYS,
  makeRowSchema,
  suggestMapping,
  type CanonicalKey,
  type CanonicalRow,
} from '@signalroom/schemas';

export interface ParsedFile {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  delimiter: string;
}

export type Mapping = Partial<Record<CanonicalKey, string>>; // canonical key → source header

export function parseCsvFile(file: File): Promise<ParsedFile> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      // no worker: callbacks aren't structured-cloneable, and main-thread
      // parsing handles the 250k-row perf dataset in a couple of seconds
      transformHeader: (h) => h.trim(),
      complete: (result) => {
        const headers = (result.meta.fields ?? []).filter(Boolean);
        if (headers.length < 2) {
          reject(new Error('This file doesn’t look like a delimited table — fewer than two columns were found.'));
          return;
        }
        if (result.data.length === 0) {
          reject(new Error('The file has headers but no data rows.'));
          return;
        }
        resolve({ fileName: file.name, headers, rows: result.data, delimiter: result.meta.delimiter ?? ',' });
      },
      error: (err) => reject(new Error(`Could not read the file: ${err.message}`)),
    });
  });
}

/** Auto-map source headers to canonical fields; first match wins per field. */
export function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {};
  for (const header of headers) {
    const key = suggestMapping(header);
    if (key && !mapping[key]) mapping[key] = header;
  }
  return mapping;
}

export function missingRequired(mapping: Mapping): CanonicalKey[] {
  return REQUIRED_KEYS.filter((k) => !mapping[k]);
}

/** Detect day-first dates by majority evidence in the mapped timestamp column. */
export function detectDayFirst(rows: Record<string, string>[], timestampHeader: string | undefined): boolean {
  if (!timestampHeader) return false;
  let dayFirstVotes = 0;
  let monthFirstVotes = 0;
  for (const row of rows.slice(0, 500)) {
    const m = String(row[timestampHeader] ?? '').trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-]\d{4}/);
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12 && b <= 12) dayFirstVotes++;
    else if (b > 12 && a <= 12) monthFirstVotes++;
  }
  return dayFirstVotes > monthFirstVotes;
}

export interface RowError {
  rowNumber: number; // 1-based data row number (excluding header)
  raw: Record<string, string>;
  errors: string[];
}

export interface ValidationResult {
  valid: CanonicalRow[];
  invalid: RowError[];
}

/** Apply the mapping, then validate every row with the shared schema (chunked
 * so the UI can show progress on large files). */
export async function validateRows(
  rows: Record<string, string>[],
  mapping: Mapping,
  dayFirst: boolean,
  onProgress?: (done: number, total: number) => void
): Promise<ValidationResult> {
  const schema = makeRowSchema({ dayFirst });
  const valid: CanonicalRow[] = [];
  const invalid: RowError[] = [];
  const CHUNK = 2000;

  for (let start = 0; start < rows.length; start += CHUNK) {
    const end = Math.min(start + CHUNK, rows.length);
    for (let i = start; i < end; i++) {
      const raw = rows[i]!;
      const candidate: Record<string, unknown> = {};
      for (const field of CANONICAL_FIELDS) {
        const source = mapping[field.key];
        if (source) candidate[field.key] = raw[source];
      }
      const result = schema.safeParse(candidate);
      if (result.success) valid.push(result.data);
      else invalid.push({ rowNumber: i + 1, raw, errors: result.error.issues.map((iss) => iss.message) });
    }
    onProgress?.(end, rows.length);
    // yield to the event loop so progress paints
    await new Promise((r) => setTimeout(r, 0));
  }
  return { valid, invalid };
}

export function rejectedCsv(headers: string[], invalid: RowError[]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const lines = [['row', ...headers, 'errors'].map(esc).join(',')];
  for (const r of invalid) {
    lines.push([r.rowNumber, ...headers.map((h) => r.raw[h] ?? ''), r.errors.join('; ')].map(esc).join(','));
  }
  return lines.join('\n');
}

/** Upload valid rows in batches; returns the completed job summary. */
export async function uploadRows(
  apiCall: <T>(path: string, init?: RequestInit & { signal?: AbortSignal }) => Promise<T>,
  fileName: string,
  valid: CanonicalRow[],
  rejectedCount: number,
  onProgress: (sent: number, total: number) => void
): Promise<{ id: number; dateMin: string | null; dateMax: string | null; importedRows: number }> {
  const { id } = await apiCall<{ id: number }>('/imports', {
    method: 'POST',
    body: JSON.stringify({ fileName, totalRows: valid.length + rejectedCount }),
  });
  const BATCH = 2000;
  for (let start = 0; start < valid.length; start += BATCH) {
    const batch = valid.slice(start, start + BATCH);
    await apiCall(`/imports/${id}/rows`, { method: 'POST', body: JSON.stringify({ rows: batch }) });
    onProgress(Math.min(start + BATCH, valid.length), valid.length);
  }
  return apiCall(`/imports/${id}/complete`, { method: 'POST', body: JSON.stringify({ rejectedRows: rejectedCount }) });
}
