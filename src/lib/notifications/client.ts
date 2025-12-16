// クライアントサイドから通知を送信するためのユーティリティ

export type NotificationType =
  | 'nominated'
  | 'application_approved'
  | 'report_rejected'
  | 'evaluation_received'
  | 'new_job_post'
  | 'application_received'
  | 'report_submitted';

interface NotificationData {
  type: NotificationType;
  data: Record<string, any>;
}

export async function triggerNotification(notification: NotificationData): Promise<boolean> {
  try {
    const response = await fetch('/api/v2/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      console.error('Notification API error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Notification error:', error);
    return false;
  }
}

// 便利な通知送信関数

// 指名通知
export const notifyNominated = (data: {
  subcontractorId: string;
  jobPostId: string;
  jobTitle: string;
  projectName: string;
  tenantName: string;
}) => triggerNotification({ type: 'nominated', data });

// 割当確定通知
export const notifyApplicationApproved = (data: {
  subcontractorId: string;
  jobSlotId: string;
  jobTitle: string;
  projectName: string;
  workDate: string;
}) => triggerNotification({ type: 'application_approved', data });

// 差戻し通知
export const notifyReportRejected = (data: {
  subcontractorId: string;
  reportId: string;
  jobTitle: string;
  projectName: string;
  reason?: string;
}) => triggerNotification({ type: 'report_rejected', data });

// 評価通知
export const notifyEvaluationReceived = (data: {
  subcontractorId: string;
  evaluationId: string;
  jobTitle: string;
  projectName: string;
}) => triggerNotification({ type: 'evaluation_received', data });

// 新規案件通知
export const notifyNewJobPost = (data: {
  tenantId: string;
  jobPostId: string;
  jobTitle: string;
  projectName: string;
  tenantName: string;
  trade: string;
}) => triggerNotification({ type: 'new_job_post', data });

// 応募通知
export const notifyApplicationReceived = (data: {
  jobPostId: string;
  subcontractorName: string;
  jobTitle: string;
  projectName: string;
}) => triggerNotification({ type: 'application_received', data });

// 完了報告通知
export const notifyReportSubmitted = (data: {
  jobPostId: string;
  reportId: string;
  subcontractorName: string;
  jobTitle: string;
  projectName: string;
}) => triggerNotification({ type: 'report_submitted', data });
