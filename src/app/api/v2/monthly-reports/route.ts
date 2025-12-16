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
} from '@/lib/api-utils';

// GET /api/v2/monthly-reports - 月次情報一覧
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

    if (authUser.type === 'subcontractor' && authUser.subcontractor) {
      // Subcontractor sees their own reports
      const { data, error, count } = await supabase
        .from('monthly_reports')
        .select('*', { count: 'exact' })
        .eq('subcontractor_id', authUser.subcontractor.id)
        .order('report_month', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      // Tenant users see reports from invited subcontractors
      let query = supabase
        .from('monthly_reports')
        .select(`
          *,
          subcontractor:subcontractors!inner(
            id,
            company_name,
            code,
            tenant_subcontractors!inner(tenant_id, status)
          )
        `, { count: 'exact' })
        .eq('subcontractor.tenant_subcontractors.tenant_id', authUser.tenantId)
        .eq('subcontractor.tenant_subcontractors.status', 'active');

      if (subcontractorId) {
        query = query.eq('subcontractor_id', subcontractorId);
      }

      const { data, error, count } = await query
        .order('report_month', { ascending: false })
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    return errors.forbidden();
  });
}

// POST /api/v2/monthly-reports - 月次情報作成/更新
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await requireSubcontractor();
    const body = await request.json();
    const supabase = await createClient();

    // Determine report month (first day of month)
    const reportMonth = body.report_month
      ? new Date(body.report_month).toISOString().slice(0, 7) + '-01'
      : new Date().toISOString().slice(0, 7) + '-01';

    // Check if report already exists for this month
    const { data: existing } = await supabase
      .from('monthly_reports')
      .select('id')
      .eq('subcontractor_id', authUser.subcontractor.id)
      .eq('report_month', reportMonth)
      .single();

    const reportData = {
      subcontractor_id: authUser.subcontractor.id,
      report_month: reportMonth,
      trades: body.trades || [],
      service_areas: body.service_areas || { prefectures: [], cities: [] },
      availability_start: body.availability_start,
      availability_end: body.availability_end,
      certifications: body.certifications || [],
      capacity: body.capacity || { teams: 0, workers_per_team: 0, notes: '' },
    };

    let result;
    if (existing) {
      // Update existing report
      const { data, error } = await supabase
        .from('monthly_reports')
        .update(reportData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new report
      const { data, error } = await supabase
        .from('monthly_reports')
        .insert(reportData)
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Also update subcontractor master data
    await supabase
      .from('subcontractors')
      .update({
        trades: body.trades || authUser.subcontractor.trades,
        certifications: body.certifications || authUser.subcontractor.certifications,
        service_areas: body.service_areas || authUser.subcontractor.service_areas,
      })
      .eq('id', authUser.subcontractor.id);

    return apiResponse(result, existing ? 200 : 201);
  });
}
