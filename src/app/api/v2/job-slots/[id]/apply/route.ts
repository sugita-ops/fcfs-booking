import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  apiError,
  errors,
  withErrorHandler,
  requireSubcontractor,
} from '@/lib/api-utils';

// POST /api/v2/job-slots/[id]/apply - スロット応募
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await requireSubcontractor();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();

    // Get slot with job_post
    const { data: slot } = await supabase
      .from('job_slots')
      .select(`
        *,
        job_post:job_posts(
          id,
          title,
          recruitment_type,
          tenant_id
        )
      `)
      .eq('id', id)
      .single();

    if (!slot) {
      return errors.notFound('Job slot');
    }

    // Check slot is available
    if (slot.status !== 'available' && slot.status !== 'applied') {
      return apiError('Slot is not available for application', 400);
    }

    // Check if subcontractor is invited to this tenant
    const { data: invitation } = await supabase
      .from('tenant_subcontractors')
      .select('id')
      .eq('tenant_id', slot.tenant_id)
      .eq('subcontractor_id', authUser.subcontractor.id)
      .eq('status', 'active')
      .single();

    if (!invitation) {
      return errors.forbidden();
    }

    // For nominated recruitment, check if subcontractor is nominated
    const jobPost = slot.job_post as any;
    if (jobPost?.recruitment_type === 'nominated') {
      const { data: nomination } = await supabase
        .from('nominated_subcontractors')
        .select('id')
        .eq('job_post_id', jobPost.id)
        .eq('subcontractor_id', authUser.subcontractor.id)
        .single();

      if (!nomination) {
        return apiError('You are not nominated for this job', 403);
      }
    }

    // Check if already applied
    const { data: existingApplication } = await supabase
      .from('slot_applications')
      .select('id, status')
      .eq('job_slot_id', id)
      .eq('subcontractor_id', authUser.subcontractor.id)
      .single();

    if (existingApplication) {
      if (existingApplication.status === 'pending') {
        return apiError('Already applied to this slot', 400, 'ALREADY_APPLIED');
      }
      if (existingApplication.status === 'selected') {
        return apiError('Already selected for this slot', 400);
      }
    }

    // Create application
    const { data: application, error } = await supabase
      .from('slot_applications')
      .insert({
        job_slot_id: id,
        subcontractor_id: authUser.subcontractor.id,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) throw error;

    // Update slot status if first application
    if (slot.status === 'available') {
      await supabase
        .from('job_slots')
        .update({ status: 'applied' })
        .eq('id', id);
    }

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
        type: 'new_application',
        title: '新しい応募がありました',
        body: `${authUser.subcontractor.company_name}が${jobPost?.title || '案件'}に応募しました。`,
        data: { application_id: application.id, job_slot_id: id },
      }));

      await supabase.from('notifications').insert(notifications);
    }

    return apiResponse(application, 201);
  });
}

// DELETE /api/v2/job-slots/[id]/apply - 応募取り消し
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await requireSubcontractor();
    const { id } = await params;
    const supabase = await createClient();

    // Get application
    const { data: application } = await supabase
      .from('slot_applications')
      .select('id, status')
      .eq('job_slot_id', id)
      .eq('subcontractor_id', authUser.subcontractor.id)
      .single();

    if (!application) {
      return errors.notFound('Application');
    }

    if (application.status !== 'pending') {
      return apiError('Cannot withdraw application with status: ' + application.status, 400);
    }

    // Update to withdrawn
    const { error } = await supabase
      .from('slot_applications')
      .update({ status: 'withdrawn' })
      .eq('id', application.id);

    if (error) throw error;

    return apiResponse({ success: true });
  });
}
