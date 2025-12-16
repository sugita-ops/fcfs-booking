import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  apiResponse,
  errors,
  withErrorHandler,
  requireTenantUser,
} from '@/lib/api-utils';

// POST /api/v2/completion-reports/[id]/confirm - 完了確認
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withErrorHandler(async () => {
    const authUser = await requireTenantUser();
    const { id } = await params;
    const supabase = await createClient();

    // Get completion report with job_slot to verify tenant
    const { data: report } = await supabase
      .from('completion_reports')
      .select(`
        *,
        job_slot:job_slots!inner(
          id,
          tenant_id,
          job_post:job_posts(title)
        )
      `)
      .eq('id', id)
      .single();

    if (!report) {
      return errors.notFound('Completion report');
    }

    // Verify tenant ownership
    const jobSlot = report.job_slot as any;
    if (jobSlot.tenant_id !== authUser.tenantId) {
      return errors.forbidden();
    }

    // Update report status
    const { data, error } = await supabase
      .from('completion_reports')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: authUser.tenantUser.id,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify subcontractor
    await supabase.from('notifications').insert({
      recipient_type: 'subcontractor',
      recipient_id: report.subcontractor_id,
      type: 'completion_confirmed',
      title: '完了報告が確認されました',
      body: `${jobSlot.job_post?.title || '案件'}の完了報告が確認されました。`,
      data: { completion_report_id: id, job_slot_id: jobSlot.id },
    });

    return apiResponse(data);
  });
}
