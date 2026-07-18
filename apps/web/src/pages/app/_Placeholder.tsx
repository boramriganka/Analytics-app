export function Placeholder({ title, stage }: { title: string; stage: string }) {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-[var(--radius-card)] border border-line bg-panel p-10 text-center">
        <p className="text-sm text-ink-2">This section arrives in {stage} of the rebuild.</p>
      </div>
    </div>
  );
}
