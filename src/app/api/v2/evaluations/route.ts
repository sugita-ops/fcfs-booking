import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  apiError,
  errors,
  getAuthUser,
  getPagination,
  paginatedResponse,
  withErrorHandler,
  requireTenantUser,
} from '@/lib/api-utils';

// GET /api/v2/evaluations - 評価一覧
export async function GET(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    // Pagination
    const { page, limit, from, to } = getPagination({
      page: Number(searchParams.get('page')) || 1,
      limit: Number(searchParams.get('limit')) || 20,
    });

    // Filters
    const subcontractorId = searchParams.get('subcontractor_id');

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      let query = supabase
        .from('evaluations')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, code),
          job_slot:job_slots(
            id,
            work_date,
            job_post:job_posts(title, trade, project:projects(name))
          ),
          evaluated_by_user:tenant_users!evaluations_evaluated_by_fkey(name)
        `, { count: 'exact' })
        .eq('tenant_id', authUser.tenantId);

      if (subcontractorId) {
        query = query.eq('subcontractor_id', subcontractorId);
      }

      const { data, error, count } = await query
        .order('evaluated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'subcontractor' && authUser.subcontractor) {
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
        .eq('subcontractor_id', authUser.subcontractor.id)
        .order('evaluated_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    return errors.forbidden();
  });
}

// POST /api/v2/evaluations - 評価作成
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await requireTenantUser();
    const body = await request.json();
    const supabase = await createClient();

    // Validation
    if (!body.job_slot_id) {
      return apiError('job_slot_id is required', 400);
    }
    if (!body.subcontractor_id) {
      return apiError('subcontractor_id is required', 400);
    }

    // Verify job_slot belongs to tenant
    const { data: slot } = await supabase
      .from('job_slots')
      .select('id, tenant_id, status')
      .eq('id', body.job_slot_id)
      .eq('tenant_id', authUser.tenantId)
      .single();

    if (!slot) {
      return errors.notFound('Job slot');
    }

    // Check if evaluation already exists
    const { data: existing } = await supabase
      .from('evaluations')
      .select('id')
      .eq('job_slot_id', body.job_slot_id)
      .single();

    if (existing) {
      return apiError('Evaluation already exists for this job slot', 400, 'DUPLICATE_EVALUATION');
    }

    // Create evaluation
    const { data, error } = await supabase
      .from('evaluations')
      .insert({
        tenant_id: authUser.tenantId,
        completion_report_id: body.completion_report_id,
        subcontractor_id: body.subcontractor_id,
        job_slot_id: body.job_slot_id,
        schedule_rating: body.schedule_rating,
        safety_rating: body.safety_rating,
        quality_rating: body.quality_rating,
        cost_rating: body.cost_rating,
        comment: body.comment,
        evaluated_by: authUser.tenantUser.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for subcontractor
    await supabase.from('notifications').insert({
      recipient_type: 'subcontractor',
      recipient_id: body.subcontractor_id,
      type: 'evaluation_received',
      title: '新しい評価を受け取りました',
      body: `工事の評価が完了しました。`,
      data: { evaluation_id: data.id, job_slot_id: body.job_slot_id },
    });

    return apiResponse(data, 201);
  });
}
