import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { Sparkline } from './charts/Sparkline';

type Delta = { pct: number | null; label: string };

export function StatCard({ label, value, hint, delta, spark, accent }: {
  label: string; value: string; hint?: string; delta?: Delta; spark?: number[]; accent?: string;
}) {
  const up = (delta?.pct ?? 0) > 0;
  const flat = delta?.pct == null || delta.pct === 0;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="label-caps">{label}</p>
        {spark && spark.some((v) => v > 0) ? <Sparkline data={spark} color={accent} /> : null}
      </div>
      <p className="mt-2 text-[28px] font-semibold leading-none tracking-tight tabular-nums">{value}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        {delta ? (
          <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-medium ${
            flat ? 'bg-bg text-muted' : up ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
          }`}>
            {flat ? <Minus size={12} /> : up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {delta.pct == null ? '—' : `${Math.abs(delta.pct).toFixed(0)}%`}
            <span className="ml-1 font-normal opacity-80">{delta.label}</span>
          </span>
        ) : null}
        {hint ? <span className="text-muted">{hint}</span> : null}
      </div>
    </div>
  );
}
