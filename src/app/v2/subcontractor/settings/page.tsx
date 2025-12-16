'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { generateVerificationCode } from '@/lib/notifications/line-service';

interface UserWithSettings {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  line_user_id: string | null;
  line_linked_at: string | null;
  notification_settings: {
    notification_type: string;
    email_enabled: boolean;
    line_enabled: boolean;
  }[];
}

// デモ用：選択可能な協力業者
const DEMO_SUBCONTRACTORS = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: '株式会社山田電気工事' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: '佐藤配管工業' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: '高橋内装株式会社' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: '伊藤塗装工業' },
  { id: 'a5555555-5555-5555-5555-555555555555', name: '渡辺基礎工事' },
];

// 通知種別の定義（協力業者向け）
const NOTIFICATION_TYPES = [
  { type: 'nominated', label: '指名された時', description: '案件に指名された時に通知' },
  { type: 'application_approved', label: '応募が承認された時', description: '応募が承認され割当が確定した時に通知' },
  { type: 'report_rejected', label: '完了報告が差戻された時', description: '完了報告が差戻された時に通知' },
  { type: 'evaluation_received', label: '評価が登録された時', description: '元請けから評価が登録された時に通知' },
  { type: 'new_job_post', label: '新規案件が公開された時', description: '招待元テナントから新規案件が公開された時に通知' },
];

export default function SubcontractorSettingsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedSubcontractor, setSelectedSubcontractor] = useState(DEMO_SUBCONTRACTORS[0]);
  const [user, setUser] = useState<UserWithSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // LINE連携
  const [showLineModal, setShowLineModal] = useState(false);
  const [lineStep, setLineStep] = useState<'qr' | 'code'>('qr');
  const [verificationCode, setVerificationCode] = useState('');
  const [inputCode, setInputCode] = useState('');

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          name,
          email,
          phone,
          line_user_id,
          line_linked_at,
          notification_settings(
            notification_type,
            email_enabled,
            line_enabled
          )
        `)
        .eq('subcontractor_id', selectedSubcontractor.id)
        .eq('is_primary', true)
        .single();

      if (!error && userData) {
        setUser(userData as UserWithSettings);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSubcontractor]);

  // 通知設定の更新
  const updateNotificationSetting = async (
    type: string,
    field: 'email_enabled' | 'line_enabled',
    value: boolean
  ) => {
    if (!user) return;

    setSaving(true);
    try {
      // 既存の設定を確認
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_type', type)
        .single();

      if (existing) {
        // 更新
        await supabase
          .from('notification_settings')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        // 新規作成
        await supabase.from('notification_settings').insert({
          user_id: user.id,
          notification_type: type,
          email_enabled: field === 'email_enabled' ? value : true,
          line_enabled: field === 'line_enabled' ? value : true,
        });
      }

      // ローカル状態を更新
      setUser((prev) => {
        if (!prev) return prev;
        const newSettings = [...prev.notification_settings];
        const idx = newSettings.findIndex((s) => s.notification_type === type);
        if (idx >= 0) {
          newSettings[idx] = { ...newSettings[idx], [field]: value };
        } else {
          newSettings.push({
            notification_type: type,
            email_enabled: field === 'email_enabled' ? value : true,
            line_enabled: field === 'line_enabled' ? value : true,
          });
        }
        return { ...prev, notification_settings: newSettings };
      });
    } catch (error) {
      console.error('Update error:', error);
      alert('設定の更新に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // 設定値の取得
  const getSettingValue = (type: string, field: 'email_enabled' | 'line_enabled'): boolean => {
    if (!user) return true;
    const setting = user.notification_settings.find((s) => s.notification_type === type);
    return setting ? setting[field] : true;
  };

  // LINE連携開始
  const startLineLink = () => {
    const code = generateVerificationCode();
    setVerificationCode(code);
    setLineStep('qr');
    setInputCode('');
    setShowLineModal(true);

    // デモ用：認証コードをコンソールに出力
    console.log(`[LINE連携] 認証コード: ${code}`);
    console.log('[LINE連携] デモモードのため、上記コードを入力してください');
  };

  // LINE連携完了（デモ用）
  const completeLineLink = async () => {
    if (inputCode !== verificationCode) {
      alert('認証コードが一致しません');
      return;
    }

    if (!user) return;

    try {
      // デモ用：ダミーのLINEユーザーIDを設定
      const demoLineUserId = `U${user.id.replace(/-/g, '').substring(0, 32)}`;

      await supabase
        .from('users')
        .update({
          line_user_id: demoLineUserId,
          line_linked_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      setUser((prev) =>
        prev ? { ...prev, line_user_id: demoLineUserId, line_linked_at: new Date().toISOString() } : prev
      );

      alert('LINE連携が完了しました');
      setShowLineModal(false);
    } catch (error) {
      console.error('LINE link error:', error);
      alert('LINE連携に失敗しました');
    }
  };

  // LINE連携解除
  const unlinkLine = async () => {
    if (!user) return;
    if (!confirm('LINE連携を解除しますか？')) return;

    try {
      await supabase
        .from('users')
        .update({
          line_user_id: null,
          line_linked_at: null,
        })
        .eq('id', user.id);

      setUser((prev) =>
        prev ? { ...prev, line_user_id: null, line_linked_at: null } : prev
      );

      alert('LINE連携を解除しました');
    } catch (error) {
      console.error('LINE unlink error:', error);
      alert('解除に失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">通知設定（協力業者）</h1>
              <p className="text-sm text-gray-500 mt-1">v2 Supabase版</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedSubcontractor.id}
                onChange={(e) => {
                  const sub = DEMO_SUBCONTRACTORS.find((s) => s.id === e.target.value);
                  if (sub) setSelectedSubcontractor(sub);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DEMO_SUBCONTRACTORS.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/v2')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                v2トップへ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 現在のユーザー表示 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            ログイン中: <span className="font-bold">{selectedSubcontractor.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : !user ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">ユーザー情報が見つかりません</p>
            <p className="text-sm text-gray-400 mt-2">
              データベースにユーザーを登録してください
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 連絡先情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">連絡先情報</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">担当者名</label>
                  <p className="text-gray-900">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
                  <p className="text-gray-900">{user.email || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">電話番号</label>
                  <p className="text-gray-900">{user.phone || '未設定'}</p>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">LINE連携</label>
                  {user.line_user_id ? (
                    <div className="flex items-center gap-4">
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        連携済み
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(user.line_linked_at!).toLocaleDateString('ja-JP')}に連携
                      </span>
                      <button
                        onClick={unlinkLine}
                        className="text-sm text-red-600 hover:underline"
                      >
                        解除
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={startLineLink}
                      className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                    >
                      LINEと連携する
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 通知設定 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">通知設定</h2>
              <p className="text-sm text-gray-500 mb-4">
                各通知の受け取り方法を設定できます
              </p>
              <div className="space-y-4">
                {NOTIFICATION_TYPES.map((notif) => (
                  <div
                    key={notif.type}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">{notif.label}</h3>
                        <p className="text-sm text-gray-500">{notif.description}</p>
                      </div>
                    </div>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSettingValue(notif.type, 'email_enabled')}
                          onChange={(e) =>
                            updateNotificationSetting(notif.type, 'email_enabled', e.target.checked)
                          }
                          disabled={saving}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">メール</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={getSettingValue(notif.type, 'line_enabled')}
                          onChange={(e) =>
                            updateNotificationSetting(notif.type, 'line_enabled', e.target.checked)
                          }
                          disabled={saving || !user.line_user_id}
                          className="w-4 h-4 text-green-600 rounded disabled:opacity-50"
                        />
                        <span className={`text-sm ${user.line_user_id ? 'text-gray-700' : 'text-gray-400'}`}>
                          LINE
                        </span>
                        {!user.line_user_id && (
                          <span className="text-xs text-gray-400">（要連携）</span>
                        )}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 通知履歴 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-4">最近の通知履歴</h2>
              <NotificationHistory userId={user.id} />
            </div>
          </div>
        )}
      </div>

      {/* LINE連携モーダル */}
      {showLineModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">LINE連携</h3>
              <button
                onClick={() => setShowLineModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {lineStep === 'qr' ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  以下のQRコードを読み取り、公式アカウントを友だち追加してください
                </p>
                <div className="bg-gray-100 p-8 rounded-lg mb-4">
                  <div className="w-48 h-48 bg-gray-300 mx-auto flex items-center justify-center">
                    <span className="text-gray-500 text-sm">QRコード</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    ※デモ環境のためQRコードは表示されません
                  </p>
                </div>
                <button
                  onClick={() => setLineStep('code')}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                >
                  友だち追加しました
                </button>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  LINEに送信された認証コードを入力してください
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  ※デモモード: コンソールに表示されたコード「{verificationCode}」を入力
                </p>
                <input
                  type="text"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="6桁の認証コード"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-center text-2xl tracking-widest mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setLineStep('qr')}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                  >
                    戻る
                  </button>
                  <button
                    onClick={completeLineLink}
                    disabled={inputCode.length !== 6}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50"
                  >
                    連携する
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 通知履歴コンポーネント
function NotificationHistory({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createDemoClient();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notification_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      setLogs(data || []);
      setLoading(false);
    };

    fetchLogs();
  }, [userId]);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nominated: '指名通知',
      application_approved: '割当確定通知',
      report_rejected: '差戻し通知',
      evaluation_received: '評価通知',
      new_job_post: '新規案件通知',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <p className="text-gray-500 text-sm">読み込み中...</p>;
  }

  if (logs.length === 0) {
    return <p className="text-gray-500 text-sm">通知履歴はありません</p>;
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
        >
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-1 rounded text-xs ${
                log.channel === 'email'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-green-100 text-green-800'
              }`}
            >
              {log.channel === 'email' ? 'メール' : 'LINE'}
            </span>
            <span className="text-sm text-gray-700">{getTypeLabel(log.notification_type)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs ${
                log.status === 'sent'
                  ? 'text-green-600'
                  : log.status === 'failed'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {log.status === 'sent' ? '送信済' : log.status === 'failed' ? '失敗' : '処理中'}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(log.created_at).toLocaleString('ja-JP')}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
