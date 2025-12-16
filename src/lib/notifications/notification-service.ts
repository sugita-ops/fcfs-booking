import { createDemoClient } from '@/lib/supabase/demo-client';
import { sendEmail, emailTemplates } from './email-service';
import { sendLineMessage, lineTemplates } from './line-service';

export type NotificationType =
  | 'nominated'
  | 'application_approved'
  | 'report_rejected'
  | 'evaluation_received'
  | 'new_job_post'
  | 'application_received'
  | 'report_submitted';

export interface NotificationTarget {
  userId: string;
  email?: string;
  lineUserId?: string;
  name: string;
  companyName?: string;
}

interface NotificationPayload {
  type: NotificationType;
  targets: NotificationTarget[];
  data: Record<string, any>;
  relatedId?: string;
  relatedType?: string;
}

// 通知を送信する統合関数
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const supabase = createDemoClient();

  for (const target of payload.targets) {
    // ユーザーの通知設定を取得
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('email_enabled, line_enabled')
      .eq('user_id', target.userId)
      .eq('notification_type', payload.type)
      .single();

    const emailEnabled = settings?.email_enabled ?? true;
    const lineEnabled = settings?.line_enabled ?? true;

    // メール送信
    if (emailEnabled && target.email) {
      await sendEmailNotification(payload.type, target, payload.data, payload.relatedId, payload.relatedType, supabase);
    }

    // LINE送信
    if (lineEnabled && target.lineUserId) {
      await sendLineNotification(payload.type, target, payload.data, payload.relatedId, payload.relatedType, supabase);
    }
  }
}

// メール通知送信
async function sendEmailNotification(
  type: NotificationType,
  target: NotificationTarget,
  data: Record<string, any>,
  relatedId: string | undefined,
  relatedType: string | undefined,
  supabase: any
): Promise<void> {
  let emailContent: { subject: string; html: string; text?: string } | null = null;

  switch (type) {
    case 'nominated':
      emailContent = emailTemplates.nominated({
        companyName: target.companyName || target.name,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        tenantName: data.tenantName,
      });
      break;
    case 'application_approved':
      emailContent = emailTemplates.applicationApproved({
        companyName: target.companyName || target.name,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        workDate: data.workDate,
      });
      break;
    case 'report_rejected':
      emailContent = emailTemplates.reportRejected({
        companyName: target.companyName || target.name,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        reason: data.reason,
      });
      break;
    case 'evaluation_received':
      emailContent = emailTemplates.evaluationReceived({
        companyName: target.companyName || target.name,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
    case 'new_job_post':
      emailContent = emailTemplates.newJobPost({
        companyName: target.companyName || target.name,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        tenantName: data.tenantName,
        trade: data.trade,
      });
      break;
    case 'application_received':
      emailContent = emailTemplates.applicationReceived({
        managerName: target.name,
        subcontractorName: data.subcontractorName,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
    case 'report_submitted':
      emailContent = emailTemplates.reportSubmitted({
        managerName: target.name,
        subcontractorName: data.subcontractorName,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
  }

  if (!emailContent || !target.email) return;

  // 履歴を作成（pending状態）
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      user_id: target.userId,
      notification_type: type,
      channel: 'email',
      recipient: target.email,
      status: 'pending',
      related_id: relatedId,
      related_type: relatedType,
    })
    .select('id')
    .single();

  // メール送信
  const result = await sendEmail({
    to: target.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });

  // 履歴を更新
  if (log?.id) {
    await supabase
      .from('notification_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', log.id);
  }
}

// LINE通知送信
async function sendLineNotification(
  type: NotificationType,
  target: NotificationTarget,
  data: Record<string, any>,
  relatedId: string | undefined,
  relatedType: string | undefined,
  supabase: any
): Promise<void> {
  let messages: { type: 'text'; text: string }[] | null = null;

  switch (type) {
    case 'nominated':
      messages = lineTemplates.nominated({
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        tenantName: data.tenantName,
      });
      break;
    case 'application_approved':
      messages = lineTemplates.applicationApproved({
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        workDate: data.workDate,
      });
      break;
    case 'report_rejected':
      messages = lineTemplates.reportRejected({
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        reason: data.reason,
      });
      break;
    case 'evaluation_received':
      messages = lineTemplates.evaluationReceived({
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
    case 'new_job_post':
      messages = lineTemplates.newJobPost({
        jobTitle: data.jobTitle,
        projectName: data.projectName,
        tenantName: data.tenantName,
        trade: data.trade,
      });
      break;
    case 'application_received':
      messages = lineTemplates.applicationReceived({
        subcontractorName: data.subcontractorName,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
    case 'report_submitted':
      messages = lineTemplates.reportSubmitted({
        subcontractorName: data.subcontractorName,
        jobTitle: data.jobTitle,
        projectName: data.projectName,
      });
      break;
  }

  if (!messages || !target.lineUserId) return;

  // 履歴を作成（pending状態）
  const { data: log } = await supabase
    .from('notification_logs')
    .insert({
      user_id: target.userId,
      notification_type: type,
      channel: 'line',
      recipient: target.lineUserId,
      status: 'pending',
      related_id: relatedId,
      related_type: relatedType,
    })
    .select('id')
    .single();

  // LINE送信
  const result = await sendLineMessage(target.lineUserId, messages);

  // 履歴を更新
  if (log?.id) {
    await supabase
      .from('notification_logs')
      .update({
        status: result.success ? 'sent' : 'failed',
        error_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      })
      .eq('id', log.id);
  }
}

// ヘルパー関数: 協力業者の代表者を取得
export async function getSubcontractorPrimaryUser(subcontractorId: string): Promise<NotificationTarget | null> {
  const supabase = createDemoClient();

  const { data: user } = await supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      line_user_id,
      subcontractor:subcontractors!inner(company_name)
    `)
    .eq('subcontractor_id', subcontractorId)
    .eq('is_primary', true)
    .single();

  if (!user) return null;

  return {
    userId: user.id,
    email: user.email,
    lineUserId: user.line_user_id,
    name: user.name,
    companyName: (user.subcontractor as any)?.company_name,
  };
}

// ヘルパー関数: 案件担当者を取得
export async function getJobPostManagers(jobPostId: string): Promise<NotificationTarget[]> {
  const supabase = createDemoClient();

  const { data: managers } = await supabase
    .from('job_post_managers')
    .select(`
      user:users!inner(
        id,
        name,
        email,
        line_user_id
      )
    `)
    .eq('job_post_id', jobPostId);

  if (!managers) return [];

  return managers.map((m: any) => ({
    userId: m.user.id,
    email: m.user.email,
    lineUserId: m.user.line_user_id,
    name: m.user.name,
  }));
}

// ヘルパー関数: テナントに招待されている協力業者の代表者一覧を取得
export async function getTenantSubcontractorUsers(tenantId: string, trade?: string): Promise<NotificationTarget[]> {
  const supabase = createDemoClient();

  // 招待済み協力業者を取得
  const { data: relations } = await supabase
    .from('tenant_subcontractors')
    .select('subcontractor_id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (!relations || relations.length === 0) return [];

  const subcontractorIds = relations.map((r) => r.subcontractor_id);

  // 代表者ユーザーを取得
  let query = supabase
    .from('users')
    .select(`
      id,
      name,
      email,
      line_user_id,
      subcontractor:subcontractors!inner(
        id,
        company_name,
        trades
      )
    `)
    .in('subcontractor_id', subcontractorIds)
    .eq('is_primary', true);

  const { data: users } = await query;

  if (!users) return [];

  // 職種フィルタ
  let filteredUsers = users;
  if (trade) {
    filteredUsers = users.filter((u: any) =>
      u.subcontractor?.trades?.includes(trade)
    );
  }

  return filteredUsers.map((u: any) => ({
    userId: u.id,
    email: u.email,
    lineUserId: u.line_user_id,
    name: u.name,
    companyName: u.subcontractor?.company_name,
  }));
}
