import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  errors,
  withErrorHandler,
} from '@/lib/api-utils';

// GET /api/v2/master/trades - 工種マスタ一覧（公開）
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('master_trades')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    // Group by category
    const byCategory = (data || []).reduce((acc: Record<string, any[]>, trade) => {
      const category = trade.category || 'その他';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(trade);
      return acc;
    }, {});

    return apiResponse({
      data: data || [],
      byCategory,
    });
  });
}
