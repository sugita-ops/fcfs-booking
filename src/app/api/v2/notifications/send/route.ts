import { NextRequest, NextResponse } from 'next/server';
import {
  sendNotification,
  getSubcontractorPrimaryUser,
  getJobPostManagers,
  getTenantSubcontractorUsers,
  NotificationType,
} from '@/lib/notifications/notification-service';
import { createDemoClient } from '@/lib/supabase/demo-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Missing type or data' }, { status: 400 });
    }

    const supabase = createDemoClient();

    switch (type as NotificationType) {
      case 'nominated': {
        // 指名通知 - 協力業者の代表者へ
        const { subcontractorId, jobPostId, jobTitle, projectName, tenantName } = data;
        const target = await getSubcontractorPrimaryUser(subcontractorId);
        if (target) {
          await sendNotification({
            type: 'nominated',
            targets: [target],
            data: { jobTitle, projectName, tenantName },
            relatedId: jobPostId,
            relatedType: 'job_post',
          });
        }
        break;
      }

      case 'application_approved': {
        // 割当確定通知 - 協力業者の代表者へ
        const { subcontractorId, jobSlotId, jobTitle, projectName, workDate } = data;
        const target = await getSubcontractorPrimaryUser(subcontractorId);
        if (target) {
          await sendNotification({
            type: 'application_approved',
            targets: [target],
            data: { jobTitle, projectName, workDate },
            relatedId: jobSlotId,
            relatedType: 'job_slot',
          });
        }
        break;
      }

      case 'report_rejected': {
        // 差戻し通知 - 協力業者の代表者へ
        const { subcontractorId, reportId, jobTitle, projectName, reason } = data;
        const target = await getSubcontractorPrimaryUser(subcontractorId);
        if (target) {
          await sendNotification({
            type: 'report_rejected',
            targets: [target],
            data: { jobTitle, projectName, reason },
            relatedId: reportId,
            relatedType: 'completion_report',
          });
        }
        break;
      }

      case 'evaluation_received': {
        // 評価通知 - 協力業者の代表者へ
        const { subcontractorId, evaluationId, jobTitle, projectName } = data;
        const target = await getSubcontractorPrimaryUser(subcontractorId);
        if (target) {
          await sendNotification({
            type: 'evaluation_received',
            targets: [target],
            data: { jobTitle, projectName },
            relatedId: evaluationId,
            relatedType: 'evaluation',
          });
        }
        break;
      }

      case 'new_job_post': {
        // 新規案件通知 - 招待済み協力業者の代表者へ
        const { tenantId, jobPostId, jobTitle, projectName, tenantName, trade } = data;
        const targets = await getTenantSubcontractorUsers(tenantId, trade);
        if (targets.length > 0) {
          await sendNotification({
            type: 'new_job_post',
            targets,
            data: { jobTitle, projectName, tenantName, trade },
            relatedId: jobPostId,
            relatedType: 'job_post',
          });
        }
        break;
      }

      case 'application_received': {
        // 応募通知 - 案件担当者へ
        const { jobPostId, subcontractorName, jobTitle, projectName } = data;
        const managers = await getJobPostManagers(jobPostId);
        if (managers.length > 0) {
          await sendNotification({
            type: 'application_received',
            targets: managers,
            data: { subcontractorName, jobTitle, projectName },
            relatedId: jobPostId,
            relatedType: 'job_post',
          });
        }
        break;
      }

      case 'report_submitted': {
        // 完了報告通知 - 案件担当者へ
        const { jobPostId, reportId, subcontractorName, jobTitle, projectName } = data;
        const managers = await getJobPostManagers(jobPostId);
        if (managers.length > 0) {
          await sendNotification({
            type: 'report_submitted',
            targets: managers,
            data: { subcontractorName, jobTitle, projectName },
            relatedId: reportId,
            relatedType: 'completion_report',
          });
        }
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Notification API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
