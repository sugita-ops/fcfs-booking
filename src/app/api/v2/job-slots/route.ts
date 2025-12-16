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

// GET /api/v2/job-slots - 工事スロット一覧
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
    const status = searchParams.get('status');
    const trade = searchParams.get('trade');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      let query = supabase
        .from('job_slots')
        .select(`
          *,
          job_post:job_posts(
            id,
            title,
            trade,
            unit_price,
            recruitment_type,
            project:projects(id, name, address)
          ),
          assigned_subcontractor:subcontractors(id, company_name, code),
          applications:slot_applications(count)
        `, { count: 'exact' })
        .eq('tenant_id', authUser.tenantId);

      if (status) {
        query = query.eq('status', status);
      }
      if (dateFrom) {
        query = query.gte('work_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('work_date', dateTo);
      }

      const { data, error, count } = await query
        .order('work_date', { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Filter by trade if specified (need to filter after query due to relation)
      let filteredData = data || [];
      if (trade) {
        filteredData = filteredData.filter((slot: any) =>
          slot.job_post?.trade === trade
        );
      }

      return apiResponse(paginatedResponse(filteredData, count || 0, page, limit));
    }

    if (authUser.type === 'subcontractor' && authUser.subcontractor) {
      // Get tenants that invited this subcontractor
      const { data: invitations } = await supabase
        .from('tenant_subcontractors')
        .select('tenant_id')
        .eq('subcontractor_id', authUser.subcontractor.id)
        .eq('status', 'active');

      const tenantIds = invitations?.map((i) => i.tenant_id) || [];

      if (tenantIds.length === 0) {
        return apiResponse(paginatedResponse([], 0, page, limit));
      }

      // Get available slots from invited tenants
      let query = supabase
        .from('job_slots')
        .select(`
          *,
          job_post:job_posts!inner(
            id,
            title,
            trade,
            unit_price,
            recruitment_type,
            project:projects(id, name, address)
          )
        `, { count: 'exact' })
        .in('tenant_id', tenantIds)
        .in('status', ['available', 'applied']);

      if (dateFrom) {
        query = query.gte('work_date', dateFrom);
      }
      if (dateTo) {
        query = query.lte('work_date', dateTo);
      }

      const { data, error, count } = await query
        .order('work_date', { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Filter by trade and recruitment type
      let filteredData = (data || []).filter((slot: any) => {
        const jobPost = slot.job_post;
        if (!jobPost) return false;

        // Trade filter
        if (trade && jobPost.trade !== trade) return false;

        // For nominated slots, check if subcontractor is nominated
        if (jobPost.recruitment_type === 'nominated') {
          // Will need additional check for nominated_subcontractors
          // For now, show all slots (RLS should handle this)
        }

        return true;
      });

      // Add application status for subcontractor
      for (const slot of filteredData as any[]) {
        const { data: application } = await supabase
          .from('slot_applications')
          .select('id, status')
          .eq('job_slot_id', slot.id)
          .eq('subcontractor_id', authUser.subcontractor.id)
          .single();

        slot.my_application = application || null;
      }

      return apiResponse(paginatedResponse(filteredData, count || 0, page, limit));
    }

    return errors.forbidden();
  });
}

// POST /api/v2/job-slots - 工事スロット作成
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await requireTenantUser();
    const body = await request.json();
    const supabase = await createClient();

    // Validation
    if (!body.job_post_id) {
      return apiError('job_post_id is required', 400);
    }
    if (!body.work_date) {
      return apiError('work_date is required', 400);
    }

    // Verify job_post belongs to tenant
    const { data: jobPost } = await supabase
      .from('job_posts')
      .select('id, tenant_id')
      .eq('id', body.job_post_id)
      .eq('tenant_id', authUser.tenantId)
      .single();

    if (!jobPost) {
      return errors.notFound('Job post');
    }

    // Create slot
    const { data, error } = await supabase
      .from('job_slots')
      .insert({
        tenant_id: authUser.tenantId,
        job_post_id: body.job_post_id,
        work_date: body.work_date,
        status: 'available',
      })
      .select()
      .single();

    if (error) throw error;

    return apiResponse(data, 201);
  });
}
