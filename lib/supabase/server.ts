import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// 帶登入者 cookie 的 client（anon key）。只用來辨識登入者，資料一律走 admin client。
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component 裡不能寫 cookie；session 更新交給 proxy.ts
          }
        },
      },
    },
  );
}
