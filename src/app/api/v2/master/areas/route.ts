import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  errors,
  withErrorHandler,
} from '@/lib/api-utils';

// GET /api/v2/master/areas - エリアマスタ一覧（公開）
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const prefecture = searchParams.get('prefecture');

    let query = supabase
      .from('master_areas')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (prefecture) {
      query = query.eq('prefecture', prefecture);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Group by prefecture
    const byPrefecture = (data || []).reduce((acc: Record<string, any[]>, area) => {
      if (!acc[area.prefecture]) {
        acc[area.prefecture] = [];
      }
      if (area.city) {
        acc[area.prefecture].push(area);
      }
      return acc;
    }, {});

    // Get prefectures list (entries with null city)
    const prefectures = (data || [])
      .filter((a) => !a.city)
      .map((a) => a.prefecture);

    return apiResponse({
      data: data || [],
      prefectures,
      byPrefecture,
    });
  });
}
