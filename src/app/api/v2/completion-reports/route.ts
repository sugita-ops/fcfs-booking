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
  requireSubcontractor,
  requireTenantUser,
} from '@/lib/api-utils';

// GET /api/v2/completion-reports - 完了報告一覧
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

    // Filter
    const status = searchParams.get('status');

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      let query = supabase
        .from('completion_reports')
        .select(`
          *,
          subcontractor:subcontractors(id, company_name, code),
          job_slot:job_slots!inner(
            id,
            work_date,
            tenant_id,
            job_post:job_posts(title, trade, project:projects(name))
          )
        `, { count: 'exact' })
        .eq('job_slot.tenant_id', authUser.tenantId);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('reported_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'subcontractor' && authUser.subcontractor) {
      let query = supabase
        .from('completion_reports')
        .select(`
          *,
          job_slot:job_slots(
            id,
            work_date,
            job_post:job_posts(title, trade, project:projects(name))
          )
        `, { count: 'exact' })
        .eq('subcontractor_id', authUser.subcontractor.id);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query
        .order('reported_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    return errors.forbidden();
  });
}

// POST /api/v2/completion-reports - 完了報告作成
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await requireSubcontractor();
    const body = await request.json();
    const supabase = await createClient();

    // Validation
    if (!body.job_slot_id) {
      return apiError('job_slot_id is required', 400);
    }
    if (!body.completion_date) {
      return apiError('completion_date is required', 400);
    }

    // Verify job_slot is assigned to this subcontractor
    const { data: slot } = await supabase
      .from('job_slots')
      .select('id, status, assigned_subcontractor_id, tenant_id')
      .eq('id', body.job_slot_id)
      .eq('assigned_subcontractor_id', authUser.subcontractor.id)
      .single();

    if (!slot) {
      return errors.notFound('Job slot');
    }

    if (slot.status !== 'assigned' && slot.status !== 'in_progress') {
      return apiError('Job slot is not in valid status for completion report', 400);
    }

    // Check if report already exists
    const { data: existing } = await supabase
      .from('completion_reports')
      .select('id')
      .eq('job_slot_id', body.job_slot_id)
      .single();

    if (existing) {
      return apiError('Completion report already exists for this job slot', 400);
    }

    // Create completion report
    const { data, error } = await supabase
      .from('completion_reports')
      .insert({
        job_slot_id: body.job_slot_id,
        subcontractor_id: authUser.subcontractor.id,
        completion_date: body.completion_date,
        summary: body.summary,
        photo_urls: body.photo_urls || [],
      })
      .select()
      .single();

    if (error) throw error;

    // Update job_slot status to completed
    await supabase
      .from('job_slots')
      .update({ status: 'completed' })
      .eq('id', body.job_slot_id);

    // Notify tenant users
    const { data: tenantUsers } = await supabase
      .from('tenant_users')
      .select('id')
      .eq('tenant_id', slot.tenant_id)
      .eq('status', 'active');

    if (tenantUsers) {
      const notifications = tenantUsers.map((user) => ({
        recipient_type: 'tenant_user' as const,
        recipient_id: user.id,
        type: 'completion_report_submitted',
        title: '完了報告が提出されました',
        body: `${authUser.subcontractor.company_name}から完了報告が届きました。`,
        data: { completion_report_id: data.id, job_slot_id: body.job_slot_id },
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return apiResponse(data, 201);
  });
}
