import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  try {
    const { data, error } = await resend.emails.send({
      from: `ダンドリブッキング <${fromEmail}>`,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email] Sent successfully to ${payload.to}, messageId: ${data?.id}`);
    return { success: true, messageId: data?.id };
  } catch (err: any) {
    console.error('[Email] Exception:', err);
    return { success: false, error: err.message };
  }
}

// メールテンプレート生成
export const emailTemplates = {
  // 協力業者向け: 指名された
  nominated: (params: { companyName: string; jobTitle: string; projectName: string; tenantName: string }) => ({
    subject: `【指名】${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">案件に指名されました</h2>
        <p>${params.companyName} 様</p>
        <p>以下の案件に指名されました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
          <p style="margin: 4px 0;"><strong>元請け:</strong> ${params.tenantName}</p>
        </div>
        <p>ダンドリブッキングにログインして詳細をご確認ください。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【指名】${params.jobTitle}\n\n${params.companyName} 様\n\n以下の案件に指名されました。\n\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n元請け: ${params.tenantName}\n\nダンドリブッキングにログインして詳細をご確認ください。`,
  }),

  // 協力業者向け: 応募が承認された
  applicationApproved: (params: { companyName: string; jobTitle: string; projectName: string; workDate: string }) => ({
    subject: `【割当確定】${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">応募が承認されました</h2>
        <p>${params.companyName} 様</p>
        <p>以下の案件への応募が承認され、割当が確定しました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
          <p style="margin: 4px 0;"><strong>作業日:</strong> ${params.workDate}</p>
        </div>
        <p>作業完了後は完了報告をお忘れなくお願いいたします。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【割当確定】${params.jobTitle}\n\n${params.companyName} 様\n\n以下の案件への応募が承認され、割当が確定しました。\n\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n作業日: ${params.workDate}\n\n作業完了後は完了報告をお忘れなくお願いいたします。`,
  }),

  // 協力業者向け: 完了報告が差戻し
  reportRejected: (params: { companyName: string; jobTitle: string; projectName: string; reason?: string }) => ({
    subject: `【差戻し】完了報告 ${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">完了報告が差戻しされました</h2>
        <p>${params.companyName} 様</p>
        <p>以下の案件の完了報告が差戻しされました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
          ${params.reason ? `<p style="margin: 4px 0;"><strong>理由:</strong> ${params.reason}</p>` : ''}
        </div>
        <p>内容を修正のうえ、再度完了報告をお願いいたします。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【差戻し】完了報告 ${params.jobTitle}\n\n${params.companyName} 様\n\n以下の案件の完了報告が差戻しされました。\n\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n${params.reason ? `理由: ${params.reason}\n` : ''}\n内容を修正のうえ、再度完了報告をお願いいたします。`,
  }),

  // 協力業者向け: 評価が登録された
  evaluationReceived: (params: { companyName: string; jobTitle: string; projectName: string }) => ({
    subject: `【評価登録】${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">評価が登録されました</h2>
        <p>${params.companyName} 様</p>
        <p>以下の案件について評価が登録されました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
        </div>
        <p>ダンドリブッキングにログインして評価内容をご確認ください。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【評価登録】${params.jobTitle}\n\n${params.companyName} 様\n\n以下の案件について評価が登録されました。\n\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングにログインして評価内容をご確認ください。`,
  }),

  // 協力業者向け: 新規案件が公開
  newJobPost: (params: { companyName: string; jobTitle: string; projectName: string; tenantName: string; trade: string }) => ({
    subject: `【新規案件】${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">新しい案件が公開されました</h2>
        <p>${params.companyName} 様</p>
        <p>ご登録の職種に該当する新規案件が公開されました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
          <p style="margin: 4px 0;"><strong>元請け:</strong> ${params.tenantName}</p>
          <p style="margin: 4px 0;"><strong>職種:</strong> ${params.trade}</p>
        </div>
        <p>ダンドリブッキングにログインして詳細をご確認ください。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【新規案件】${params.jobTitle}\n\n${params.companyName} 様\n\nご登録の職種に該当する新規案件が公開されました。\n\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n元請け: ${params.tenantName}\n職種: ${params.trade}\n\nダンドリブッキングにログインして詳細をご確認ください。`,
  }),

  // 元請け向け: 応募があった
  applicationReceived: (params: { managerName: string; subcontractorName: string; jobTitle: string; projectName: string }) => ({
    subject: `【応募】${params.subcontractorName} - ${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">新しい応募がありました</h2>
        <p>${params.managerName} 様</p>
        <p>担当案件に新しい応募がありました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>応募者:</strong> ${params.subcontractorName}</p>
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
        </div>
        <p>ダンドリブッキングにログインして応募者を確認してください。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【応募】${params.subcontractorName} - ${params.jobTitle}\n\n${params.managerName} 様\n\n担当案件に新しい応募がありました。\n\n応募者: ${params.subcontractorName}\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングにログインして応募者を確認してください。`,
  }),

  // 元請け向け: 完了報告が提出された
  reportSubmitted: (params: { managerName: string; subcontractorName: string; jobTitle: string; projectName: string }) => ({
    subject: `【完了報告】${params.subcontractorName} - ${params.jobTitle} - ダンドリブッキング`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">完了報告が提出されました</h2>
        <p>${params.managerName} 様</p>
        <p>担当案件の完了報告が提出されました。</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>報告者:</strong> ${params.subcontractorName}</p>
          <p style="margin: 4px 0;"><strong>案件名:</strong> ${params.jobTitle}</p>
          <p style="margin: 4px 0;"><strong>現場:</strong> ${params.projectName}</p>
        </div>
        <p>ダンドリブッキングにログインして完了報告を確認・承認してください。</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #6b7280; font-size: 12px;">このメールはダンドリブッキングから自動送信されています。</p>
      </div>
    `,
    text: `【完了報告】${params.subcontractorName} - ${params.jobTitle}\n\n${params.managerName} 様\n\n担当案件の完了報告が提出されました。\n\n報告者: ${params.subcontractorName}\n案件名: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングにログインして完了報告を確認・承認してください。`,
  }),
};
