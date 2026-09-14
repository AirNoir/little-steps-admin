import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { supabaseAdmin } from './supabase/admin';

export async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data } = await supabaseAdmin.from('admins').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!data) redirect('/login?error=forbidden');
  return user;
}
