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

// デモ用：選択可能なテナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

// 通知種別の定義（元請け向け）
const NOTIFICATION_TYPES = [
  { type: 'application_received', label: '応募があった時', description: '担当案件に応募があった時に通知' },
  { type: 'report_submitted', label: '完了報告が提出された時', description: '担当案件の完了報告が提出された時に通知' },
];

export default function ContractorSettingsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [users, setUsers] = useState<UserWithSettings[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithSettings | null>(null);
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
      const { data: usersData, error } = await supabase
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
        .eq('tenant_id', selectedTenant.id)
        .order('is_primary', { ascending: false });

      if (!error && usersData) {
        setUsers(usersData as UserWithSettings[]);
        if (usersData.length > 0 && !selectedUser) {
          setSelectedUser(usersData[0] as UserWithSettings);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenant]);

  // 通知設定の更新
  const updateNotificationSetting = async (
    type: string,
    field: 'email_enabled' | 'line_enabled',
    value: boolean
  ) => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      // 既存の設定を確認
      const { data: existing } = await supabase
        .from('notification_settings')
        .select('id')
        .eq('user_id', selectedUser.id)
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
          user_id: selectedUser.id,
          notification_type: type,
          email_enabled: field === 'email_enabled' ? value : true,
          line_enabled: field === 'line_enabled' ? value : true,
        });
      }

      // ローカル状態を更新
      setSelectedUser((prev) => {
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
    if (!selectedUser) return true;
    const setting = selectedUser.notification_settings.find((s) => s.notification_type === type);
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

    if (!selectedUser) return;

    try {
      // デモ用：ダミーのLINEユーザーIDを設定
      const demoLineUserId = `U${selectedUser.id.replace(/-/g, '').substring(0, 32)}`;

      await supabase
        .from('users')
        .update({
          line_user_id: demoLineUserId,
          line_linked_at: new Date().toISOString(),
        })
        .eq('id', selectedUser.id);

      setSelectedUser((prev) =>
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
    if (!selectedUser) return;
    if (!confirm('LINE連携を解除しますか？')) return;

    try {
      await supabase
        .from('users')
        .update({
          line_user_id: null,
          line_linked_at: null,
        })
        .eq('id', selectedUser.id);

      setSelectedUser((prev) =>
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
              <h1 className="text-xl font-bold text-gray-900">通知設定（元請け）</h1>
              <p className="text-sm text-gray-500 mt-1">v2 Supabase版</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTenant.id}
                onChange={(e) => {
                  const tenant = DEMO_TENANTS.find((t) => t.id === e.target.value);
                  if (tenant) {
                    setSelectedTenant(tenant);
                    setSelectedUser(null);
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DEMO_TENANTS.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
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
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            テナント: <span className="font-bold">{selectedTenant.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* ユーザー選択 */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="font-semibold text-gray-900 mb-4">ユーザー選択</h2>
                <div className="space-y-2">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={`w-full text-left px-4 py-3 rounded-md ${
                        selectedUser?.id === user.id
                          ? 'bg-orange-100 border-2 border-orange-500'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 設定エリア */}
            <div className="md:col-span-2 space-y-6">
              {selectedUser && (
                <>
                  {/* 連絡先情報 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="font-semibold text-gray-900 mb-4">連絡先情報</h2>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">メールアドレス</label>
                        <p className="text-gray-900">{selectedUser.email || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">LINE連携</label>
                        {selectedUser.line_user_id ? (
                          <div className="flex items-center gap-4">
                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                              連携済み
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(selectedUser.line_linked_at!).toLocaleDateString('ja-JP')}に連携
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
                                className="w-4 h-4 text-orange-600 rounded"
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
                                disabled={saving || !selectedUser.line_user_id}
                                className="w-4 h-4 text-green-600 rounded disabled:opacity-50"
                              />
                              <span className={`text-sm ${selectedUser.line_user_id ? 'text-gray-700' : 'text-gray-400'}`}>
                                LINE
                              </span>
                              {!selectedUser.line_user_id && (
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
                    <NotificationHistory userId={selectedUser.id} />
                  </div>
                </>
              )}
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
      application_received: '応募通知',
      report_submitted: '完了報告通知',
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
