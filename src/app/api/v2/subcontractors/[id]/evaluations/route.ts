import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  errors,
  getAuthUser,
  getPagination,
  paginatedResponse,
  withErrorHandler,
} from '@/lib/api-utils';

// GET /api/v2/subcontractors/[id]/evaluations - 特定協力業者の評価一覧
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const { id } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const { page, limit, from, to } = getPagination({
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    });

    // Check access permission
    if (authUser.type === 'subcontractor') {
      // Subcontractors can only see their own evaluations
      if (authUser.subcontractor?.id !== id) {
        return errors.forbidden();
      }

      const { data, error, count } = await supabase
        .from('evaluations')
        .select(`
          *,
          job_slot:job_slots(
            id,
            work_date,
            job_post:job_posts(title, trade)
          )
        `, { count: 'exact' })
        .eq('subcontractor_id', id)
        .order('evaluated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      // Tenant users see evaluations within their tenant
      const { data, error, count } = await supabase
        .from('evaluations')
        .select(`
          *,
          job_slot:job_slots(
            id,
            work_date,
            job_post:job_posts(title, trade)
          ),
          evaluated_by_user:tenant_users!evaluations_evaluated_by_fkey(name)
        `, { count: 'exact' })
        .eq('subcontractor_id', id)
        .eq('tenant_id', authUser.tenantId)
        .order('evaluated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'admin') {
      // Admins can see all evaluations
      const { data, error, count } = await supabase
        .from('evaluations')
        .select(`
          *,
          tenant:tenants(name),
          job_slot:job_slots(
            id,
            work_date,
            job_post:job_posts(title, trade)
          )
        `, { count: 'exact' })
        .eq('subcontractor_id', id)
        .order('evaluated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    return errors.forbidden();
  });
}
