const LINE_API_BASE = 'https://api.line.me/v2/bot';

export interface LineMessage {
  type: 'text';
  text: string;
}

export interface LineResult {
  success: boolean;
  error?: string;
}

// LINE Messaging APIでメッセージを送信
export async function sendLineMessage(userId: string, messages: LineMessage[]): Promise<LineResult> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!accessToken) {
    console.error('[LINE] Channel access token not configured');
    return { success: false, error: 'LINE access token not configured' };
  }

  try {
    const response = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        to: userId,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[LINE] Push message error:', errorData);
      return { success: false, error: errorData.message || `HTTP ${response.status}` };
    }

    console.log(`[LINE] Message sent successfully to ${userId}`);
    return { success: true };
  } catch (err: any) {
    console.error('[LINE] Exception:', err);
    return { success: false, error: err.message };
  }
}

// 認証コード生成（6桁）
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// LINEメッセージテンプレート
export const lineTemplates = {
  // 協力業者向け: 指名された
  nominated: (params: { jobTitle: string; projectName: string; tenantName: string }): LineMessage[] => [{
    type: 'text',
    text: `【指名のお知らせ】\n\n以下の案件に指名されました。\n\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n元請け: ${params.tenantName}\n\nダンドリブッキングで詳細をご確認ください。`,
  }],

  // 協力業者向け: 応募が承認された
  applicationApproved: (params: { jobTitle: string; projectName: string; workDate: string }): LineMessage[] => [{
    type: 'text',
    text: `【割当確定】\n\n応募が承認されました！\n\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n作業日: ${params.workDate}\n\n作業完了後は完了報告をお忘れなく。`,
  }],

  // 協力業者向け: 完了報告が差戻し
  reportRejected: (params: { jobTitle: string; projectName: string; reason?: string }): LineMessage[] => [{
    type: 'text',
    text: `【差戻し】\n\n完了報告が差戻しされました。\n\n案件: ${params.jobTitle}\n現場: ${params.projectName}${params.reason ? `\n理由: ${params.reason}` : ''}\n\n修正のうえ、再度報告をお願いします。`,
  }],

  // 協力業者向け: 評価が登録された
  evaluationReceived: (params: { jobTitle: string; projectName: string }): LineMessage[] => [{
    type: 'text',
    text: `【評価登録】\n\n新しい評価が登録されました。\n\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングで評価内容をご確認ください。`,
  }],

  // 協力業者向け: 新規案件が公開
  newJobPost: (params: { jobTitle: string; projectName: string; tenantName: string; trade: string }): LineMessage[] => [{
    type: 'text',
    text: `【新規案件】\n\n新しい案件が公開されました。\n\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n元請け: ${params.tenantName}\n職種: ${params.trade}\n\nダンドリブッキングで詳細をご確認ください。`,
  }],

  // 元請け向け: 応募があった
  applicationReceived: (params: { subcontractorName: string; jobTitle: string; projectName: string }): LineMessage[] => [{
    type: 'text',
    text: `【応募あり】\n\n新しい応募がありました。\n\n応募者: ${params.subcontractorName}\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングで応募者を確認してください。`,
  }],

  // 元請け向け: 完了報告が提出された
  reportSubmitted: (params: { subcontractorName: string; jobTitle: string; projectName: string }): LineMessage[] => [{
    type: 'text',
    text: `【完了報告】\n\n完了報告が提出されました。\n\n報告者: ${params.subcontractorName}\n案件: ${params.jobTitle}\n現場: ${params.projectName}\n\nダンドリブッキングで確認・承認してください。`,
  }],

  // LINE連携: 認証コード送信
  verificationCode: (code: string): LineMessage[] => [{
    type: 'text',
    text: `【ダンドリブッキング LINE連携】\n\n認証コード: ${code}\n\nこのコードをダンドリブッキングの画面に入力してください。\n\n※このコードは10分間有効です。`,
  }],
};
