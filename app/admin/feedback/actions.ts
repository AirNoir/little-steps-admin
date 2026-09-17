'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** 更新一則回饋的處理狀態。new → in_progress → done，也可以直接跳。 */
export async function setFeedbackStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (!id || !['new', 'in_progress', 'done'].includes(status)) return;

  const { error } = await supabaseAdmin.from('feedback').update({ status }).eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/feedback');
}

/** 留一則內部備註（使用者看不到，只是給自己記處理經過）。 */
export async function setFeedbackNote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get('id') ?? '');
  const note = String(formData.get('note') ?? '').slice(0, 2000);
  if (!id) return;

  const { error } = await supabaseAdmin
    .from('feedback')
    .update({ admin_note: note || null })
    .eq('id', id);
  if (error) throw error;
  revalidatePath('/admin/feedback');
}
