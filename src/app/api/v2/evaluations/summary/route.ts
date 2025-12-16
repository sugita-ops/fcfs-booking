import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  errors,
  getAuthUser,
  withErrorHandler,
} from '@/lib/api-utils';

// GET /api/v2/evaluations/summary - 評価集計（業者別）
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const subcontractorId = searchParams.get('subcontractor_id');

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      // Get all evaluations for the tenant
      let query = supabase
        .from('evaluations')
        .select(`
          subcontractor_id,
          schedule_rating,
          safety_rating,
          quality_rating,
          cost_rating,
          subcontractor:subcontractors(id, company_name, code, trades)
        `)
        .eq('tenant_id', authUser.tenantId);

      if (subcontractorId) {
        query = query.eq('subcontractor_id', subcontractorId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by subcontractor
      const summaryMap = new Map<string, {
        subcontractor_id: string;
        company_name: string;
        code: string;
        trades: string[];
        evaluation_count: number;
        schedule_avg: number;
        safety_avg: number;
        quality_avg: number;
        cost_avg: number;
        overall_avg: number;
        schedule_sum: number;
        safety_sum: number;
        quality_sum: number;
        cost_sum: number;
      }>();

      for (const evaluation of data || []) {
        const sub = evaluation.subcontractor as any;
        if (!sub) continue;

        const existing = summaryMap.get(evaluation.subcontractor_id);

        if (existing) {
          existing.evaluation_count++;
          existing.schedule_sum += evaluation.schedule_rating || 0;
          existing.safety_sum += evaluation.safety_rating || 0;
          existing.quality_sum += evaluation.quality_rating || 0;
          existing.cost_sum += evaluation.cost_rating || 0;
        } else {
          summaryMap.set(evaluation.subcontractor_id, {
            subcontractor_id: evaluation.subcontractor_id,
            company_name: sub.company_name,
            code: sub.code,
            trades: sub.trades || [],
            evaluation_count: 1,
            schedule_avg: 0,
            safety_avg: 0,
            quality_avg: 0,
            cost_avg: 0,
            overall_avg: 0,
            schedule_sum: evaluation.schedule_rating || 0,
            safety_sum: evaluation.safety_rating || 0,
            quality_sum: evaluation.quality_rating || 0,
            cost_sum: evaluation.cost_rating || 0,
          });
        }
      }

      // Calculate averages
      const summaries = Array.from(summaryMap.values()).map((s) => {
        const count = s.evaluation_count;
        s.schedule_avg = Math.round((s.schedule_sum / count) * 10) / 10;
        s.safety_avg = Math.round((s.safety_sum / count) * 10) / 10;
        s.quality_avg = Math.round((s.quality_sum / count) * 10) / 10;
        s.cost_avg = Math.round((s.cost_sum / count) * 10) / 10;
        s.overall_avg = Math.round(
          ((s.schedule_avg + s.safety_avg + s.quality_avg + s.cost_avg) / 4) * 10
        ) / 10;

        // Remove sum fields
        const { schedule_sum, safety_sum, quality_sum, cost_sum, ...result } = s;
        return result;
      });

      // Sort by overall average (descending)
      summaries.sort((a, b) => b.overall_avg - a.overall_avg);

      return apiResponse({
        data: summaries,
        total: summaries.length,
      });
    }

    if (authUser.type === 'subcontractor' && authUser.subcontractor) {
      // Subcontractor can see their own summary across all tenants
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          schedule_rating,
          safety_rating,
          quality_rating,
          cost_rating,
          tenant:tenants(name)
        `)
        .eq('subcontractor_id', authUser.subcontractor.id);

      if (error) throw error;

      const count = data?.length || 0;
      if (count === 0) {
        return apiResponse({
          evaluation_count: 0,
          schedule_avg: 0,
          safety_avg: 0,
          quality_avg: 0,
          cost_avg: 0,
          overall_avg: 0,
        });
      }

      const totals = (data || []).reduce(
        (acc, e) => ({
          schedule: acc.schedule + (e.schedule_rating || 0),
          safety: acc.safety + (e.safety_rating || 0),
          quality: acc.quality + (e.quality_rating || 0),
          cost: acc.cost + (e.cost_rating || 0),
        }),
        { schedule: 0, safety: 0, quality: 0, cost: 0 }
      );

      const schedule_avg = Math.round((totals.schedule / count) * 10) / 10;
      const safety_avg = Math.round((totals.safety / count) * 10) / 10;
      const quality_avg = Math.round((totals.quality / count) * 10) / 10;
      const cost_avg = Math.round((totals.cost / count) * 10) / 10;
      const overall_avg = Math.round(
        ((schedule_avg + safety_avg + quality_avg + cost_avg) / 4) * 10
      ) / 10;

      return apiResponse({
        evaluation_count: count,
        schedule_avg,
        safety_avg,
        quality_avg,
        cost_avg,
        overall_avg,
      });
    }

    return errors.forbidden();
  });
}
