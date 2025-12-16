import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  apiError,
  errors,
  getAuthUser,
  withErrorHandler,
} from '@/lib/api-utils';

// GET /api/v2/subcontractors/[id] - 協力業者詳細
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('subcontractors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return errors.notFound('Subcontractor');
    }

    // Check access permission
    if (authUser.type === 'subcontractor') {
      if (authUser.subcontractor?.id !== id) {
        return errors.forbidden();
      }
    } else if (authUser.type === 'tenant_user' && authUser.tenantId) {
      // Check if invited
      const { data: invitation } = await supabase
        .from('tenant_subcontractors')
        .select('id')
        .eq('tenant_id', authUser.tenantId)
        .eq('subcontractor_id', id)
        .eq('status', 'active')
        .single();

      if (!invitation) {
        return errors.forbidden();
      }
    }

    return apiResponse(data);
  });
}

// PATCH /api/v2/subcontractors/[id] - 協力業者更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser) return errors.unauthorized();

    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Check ownership or admin
    if (authUser.type === 'subcontractor' && authUser.subcontractor?.id !== id) {
      return errors.forbidden();
    }
    if (authUser.type === 'tenant_user') {
      return errors.forbidden(); // Tenant users cannot edit subcontractor profiles
    }

    // Update allowed fields
    const allowedFields = [
      'company_name',
      'representative_name',
      'address',
      'phone',
      'email',
      'trades',
      'certifications',
      'service_areas',
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const { data, error } = await supabase
      .from('subcontractors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return apiResponse(data);
  });
}

// DELETE /api/v2/subcontractors/[id] - 協力業者削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await getAuthUser();
    if (!authUser || authUser.type !== 'admin') {
      return errors.forbidden();
    }

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('subcontractors')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) throw error;

    return apiResponse({ success: true });
  });
}
