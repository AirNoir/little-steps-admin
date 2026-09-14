import 'server-only';
import { createClient } from '@supabase/supabase-js';

// service role：views 與 auth.users 只有它讀得到。這個檔案不能被任何 client component import。
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
