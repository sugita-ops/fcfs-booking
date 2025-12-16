import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  apiError,
  errors,
  withErrorHandler,
  requireTenantUser,
} from '@/lib/api-utils';

// POST /api/v2/job-slots/[id]/assign - 業者選択・割当
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await requireTenantUser();
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Validation
    if (!body.subcontractor_id) {
      return apiError('subcontractor_id is required', 400);
    }

    // Get slot
    const { data: slot } = await supabase
      .from('job_slots')
      .select(`
        *,
        job_post:job_posts(id, title)
      `)
      .eq('id', id)
      .eq('tenant_id', authUser.tenantId)
      .single();

    if (!slot) {
      return errors.notFound('Job slot');
    }

    if (slot.status !== 'available' && slot.status !== 'applied') {
      return apiError('Slot is not available for assignment', 400);
    }

    // Verify subcontractor has applied
    const { data: application } = await supabase
      .from('slot_applications')
      .select('id, status')
      .eq('job_slot_id', id)
      .eq('subcontractor_id', body.subcontractor_id)
      .eq('status', 'pending')
      .single();

    if (!application) {
      return apiError('Subcontractor has not applied to this slot', 400);
    }

    // Get subcontractor info for notification
    const { data: subcontractor } = await supabase
      .from('subcontractors')
      .select('id, company_name')
      .eq('id', body.subcontractor_id)
      .single();

    // Update slot
    const { data: updatedSlot, error: slotError } = await supabase
      .from('job_slots')
      .update({
        status: 'assigned',
        assigned_subcontractor_id: body.subcontractor_id,
        assigned_at: new Date().toISOString(),
        assigned_by: authUser.tenantUser.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (slotError) throw slotError;

    // Update selected application
    await supabase
      .from('slot_applications')
      .update({ status: 'selected' })
      .eq('id', application.id);

    // Reject other applications
    const { data: otherApplications } = await supabase
      .from('slot_applications')
      .select('id, subcontractor_id')
      .eq('job_slot_id', id)
      .eq('status', 'pending')
      .neq('subcontractor_id', body.subcontractor_id);

    if (otherApplications && otherApplications.length > 0) {
      // Update status to rejected
      await supabase
        .from('slot_applications')
        .update({ status: 'rejected' })
        .in('id', otherApplications.map((a) => a.id));

      // Notify rejected subcontractors
      const jobPost = slot.job_post as any;
      const rejectionNotifications = otherApplications.map((app) => ({
        recipient_type: 'subcontractor' as const,
        recipient_id: app.subcontractor_id,
        type: 'application_rejected',
        title: '応募結果のお知らせ',
        body: `${jobPost?.title || '案件'}は他の業者が選ばれました。`,
        data: { job_slot_id: id },
      }));

      await supabase.from('notifications').insert(rejectionNotifications);
    }

    // Notify selected subcontractor
    const jobPost = slot.job_post as any;
    await supabase.from('notifications').insert({
      recipient_type: 'subcontractor',
      recipient_id: body.subcontractor_id,
      type: 'application_selected',
      title: '案件が確定しました',
      body: `${jobPost?.title || '案件'}への応募が承認されました。`,
      data: { job_slot_id: id },
    });

    return apiResponse({
      slot: updatedSlot,
      assigned_subcontractor: subcontractor,
    });
  });
}
