import { Inbox } from 'lucide-react';

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-10 text-center">
      <Inbox className="text-subtle" size={22} strokeWidth={1.6} />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
