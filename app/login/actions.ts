'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function sendMagicLink(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email) redirect('/login?error=missing');

  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`;

  const supabase = await createClient();
  // shouldCreateUser: false —— 只有已存在的帳號收得到連結，後台不開放註冊
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback`, shouldCreateUser: false },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect('/login?sent=1');
}
