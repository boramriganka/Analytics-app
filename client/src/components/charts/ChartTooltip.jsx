export default function ChartTooltip({ active, payload, label, formatLabel, rows }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-raised px-3.5 py-2.5 shadow-xl shadow-black/40">
      {label != null && (
        <p className="mb-1.5 text-xs font-medium text-fog">{formatLabel ? formatLabel(label) : label}</p>
      )}
      <div className="space-y-1">
        {(rows ? rows(payload) : payload).map((r, i) => (
          <p key={i} className="flex items-center gap-2 text-sm">
            {r.color && <span className="h-2 w-2 rounded-full" style={{ background: r.color }} aria-hidden="true" />}
            <span className="text-fog">{r.name}</span>
            <span className="tabular ml-auto pl-4 font-medium text-cream">{r.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
