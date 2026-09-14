# little-steps-admin — 小步腳印營運後台

Next.js 16（App Router）+ Supabase，只給 `public.admins` 名單裡的帳號看。規格：主 App repo 的 `docs/SPEC_BACKOFFICE.md` §2.4。

## 原則
- **所有資料一律在伺服器端用 service role 讀**（`lib/supabase/admin.ts`，有 `server-only`）。views（`v_*`）與 `auth.users` 只有 service role 讀得到。
- `SUPABASE_SERVICE_ROLE_KEY` 絕不加 `NEXT_PUBLIC_` 前綴、絕不 import 進 client component。
- 登入用 Supabase magic link（`shouldCreateUser: false`，不開放註冊）；每個 `/admin` 頁由 `app/admin/layout.tsx` 的 `requireAdmin()` 把關，不在 `admins` 表就 302 回 `/login`。
- 不裝任何第三方分析 SDK（兒童健康資料）。

## 環境變數（`.env.local` 本機、Vercel 上同名）
```
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY   ← 登入用
SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY                   ← server only
NEXT_PUBLIC_SITE_URL（選填，magic link 回跳網址；沒設就用請求的 host）
```
Supabase Auth 的 redirect 白名單已含 `http://localhost:3000/**` 與 `https://admin.littlestep.me/**`。

## 指令
```bash
npm run dev      # http://localhost:3000 → /admin（未登入轉 /login）
npm run build    # 型別檢查 + build
```

## 頁面
`/admin` 概況（活躍、錄音、訂閱、成本、近 30 天走勢、功能採用、錄音類型）、`/admin/retention` 週留存、
`/admin/cost` OpenAI 成本估算、`/admin/events` 行為事件與失敗紀錄。資料來源全是 DB 的 views，邏輯留在資料庫。

## 部署
Vercel，網域 `admin.littlestep.me`（DNS 在 Cloudflare，CNAME → `cname.vercel-dns.com`）。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
