'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/requireAdmin';
import { supabaseAdmin } from '@/lib/supabase/admin';

// 手動調整 Pro。注意：RevenueCat webhook 下次收到該使用者的事件時會以商店狀態覆寫，
// 所以這是「補償／臨時開通」用，不是取代訂閱。每次操作都寫 app_events 留痕。
export async function setPro(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get('userId') ?? '');
  const value = formData.get('value') === 'true';
  const months = Number(formData.get('months') ?? 0);
  if (!userId) return;

  const expires = value && months > 0 ? new Date(Date.now() + months * 30 * 86400_000).toISOString() : null;
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      is_pro: value,
      subscription_id: value ? 'admin_comp' : null,
      subscription_expires_at: expires,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);

  await supabaseAdmin.from('app_events').insert({
    user_id: userId,
    name: 'admin_set_pro',
    props: { value, months, by: admin.email },
  });
  revalidatePath('/admin/users');
}
