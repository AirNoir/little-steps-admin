export function Section({ title, subtitle, right, children, className = '' }: {
  title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`card p-5 md:p-6 ${className}`}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
