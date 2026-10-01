import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import type { SortDir } from '@/lib/sort';

/** 欄位排序指示：未排序是淡色雙箭頭（hover 時變深），排序中是主色單箭頭。 */
export function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown aria-hidden size={12} strokeWidth={2.2} className="shrink-0 opacity-40 transition group-hover:opacity-80" />;
  const Icon = dir === 'asc' ? ChevronUp : ChevronDown;
  return <Icon aria-hidden size={13} strokeWidth={2.6} className="shrink-0 text-primary" />;
}

/** 表頭排序按鈕／連結共用的樣式。 */
export const sortTriggerClass = (active: boolean, align: 'left' | 'right' | 'center' = 'left') =>
  `group -mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 uppercase tracking-[0.08em] outline-none transition hover:bg-bg hover:text-ink focus-visible:ring-2 focus-visible:ring-primary/30 ${
    active ? 'text-primary hover:text-primary' : ''
  } ${align === 'right' ? 'flex-row-reverse' : ''} cursor-pointer select-none`;
