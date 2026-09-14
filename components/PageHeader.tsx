export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </header>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted">{children}</span>;
}
