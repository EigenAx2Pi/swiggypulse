interface MetricCardProps {
  label: string;
  value: string;
  delta?: { pct: number; positiveIsGood?: boolean };
  hint?: string;
}

export function MetricCard({ label, value, delta, hint }: MetricCardProps) {
  const positiveIsGood = delta?.positiveIsGood ?? true;
  const deltaSign = delta && delta.pct > 0;
  const deltaColor =
    !delta || delta.pct === 0
      ? 'text-slate-400'
      : deltaSign === positiveIsGood
        ? 'text-teal-400'
        : 'text-red-400';
  const arrow = !delta || delta.pct === 0 ? '–' : deltaSign ? '↑' : '↓';

  return (
    <div className="rounded-xl bg-slate-850 border border-slate-800 p-5">
      <div className="text-xs text-slate-400 uppercase tracking-wide">{label}</div>
      <div className="mt-2 flex items-baseline gap-3">
        <div className="text-2xl font-semibold text-slate-100">{value}</div>
        {delta && (
          <div className={`text-sm font-medium ${deltaColor}`}>
            {arrow} {Math.abs(delta.pct).toFixed(1)}%
          </div>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}
