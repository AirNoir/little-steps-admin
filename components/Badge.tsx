const TONES = {
  neutral: 'bg-bg text-muted',
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-[#8a5a2b]',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-[#3a5a7a]',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
