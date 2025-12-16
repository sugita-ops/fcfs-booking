/**
 * Demo用 Supabaseクライアント（認証なし）
 * 開発・デモ用途のみ使用
 */
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createDemoClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
