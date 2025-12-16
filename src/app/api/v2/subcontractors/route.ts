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

// GET /api/v2/subcontractors - 協力業者一覧取得（テナント招待済みのみ）
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
    const trade = searchParams.get('trade');
    const prefecture = searchParams.get('prefecture');
    const search = searchParams.get('search');

    // Build query based on user type
    if (authUser.type === 'admin') {
      // Admin can see all subcontractors
      let query = supabase
        .from('subcontractors')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      if (trade) {
        query = query.contains('trades', [trade]);
      }
      if (search) {
        query = query.or(`company_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error, count } = await query
        .order('company_name')
        .range(from, to);

      if (error) throw error;

      return apiResponse(paginatedResponse(data || [], count || 0, page, limit));
    }

    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      // Tenant users see only invited subcontractors
      let query = supabase
        .from('tenant_subcontractors')
        .select(`
          id,
          status,
          invited_at,
          notes,
          subcontractor:subcontractors(*)
        `, { count: 'exact' })
        .eq('tenant_id', authUser.tenantId)
        .eq('status', 'active');

      const { data, error, count } = await query
        .order('invited_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Flatten and filter
      let subcontractors = (data || [])
        .map((item: any) => ({
          ...item.subcontractor,
          invitation_status: item.status,
          invited_at: item.invited_at,
          invitation_notes: item.notes,
        }))
        .filter((s: any) => s.status === 'active');

      // Apply filters
      if (trade) {
        subcontractors = subcontractors.filter((s: any) =>
          s.trades?.includes(trade)
        );
      }
      if (prefecture) {
        subcontractors = subcontractors.filter((s: any) =>
          s.service_areas?.prefectures?.includes(prefecture)
        );
      }
      if (search) {
        const searchLower = search.toLowerCase();
        subcontractors = subcontractors.filter((s: any) =>
          s.company_name?.toLowerCase().includes(searchLower) ||
          s.email?.toLowerCase().includes(searchLower)
        );
      }

      return apiResponse(paginatedResponse(subcontractors, count || 0, page, limit));
    }

    return errors.forbidden();
  });
}

// POST /api/v2/subcontractors - 協力業者新規登録
export async function POST(request: NextRequest) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const body = await request.json();
    const supabase = await createClient();

    // Validation
    if (!body.company_name) {
      return apiError('company_name is required', 400);
    }

    // Generate unique code if not provided
    const code = body.code || `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Check code uniqueness
    const { data: existing } = await supabase
      .from('subcontractors')
      .select('id')
      .eq('code', code)
      .single();

    if (existing) {
      return apiError('Code already exists', 400, 'DUPLICATE_CODE');
    }

    // Create subcontractor
    const { data, error } = await supabase
      .from('subcontractors')
      .insert({
        code,
        company_name: body.company_name,
        representative_name: body.representative_name,
        address: body.address,
        phone: body.phone,
        email: body.email,
        trades: body.trades || [],
        certifications: body.certifications || [],
        service_areas: body.service_areas || { prefectures: [], cities: [] },
      })
      .select()
      .single();

    if (error) throw error;

    // If created by tenant user, automatically invite
    if (authUser.type === 'tenant_user' && authUser.tenantId) {
      await supabase.from('tenant_subcontractors').insert({
        tenant_id: authUser.tenantId,
        subcontractor_id: data.id,
        invited_by: authUser.tenantUser?.id,
      });
    }

    return apiResponse(data, 201);
  });
}
