'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JobSlot, ClaimRequest, AlternativesResponse } from '@/types/api';
import BookingForm from '@/components/BookingForm';
import BookingHistory from '@/components/BookingHistory';
import SearchFilterForm from '@/components/SearchFilterForm';
import MobileBottomNav from '@/components/MobileBottomNav';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import { getSlots, SearchParams, MockJobSlotWithPost } from '@/lib/mock-data';
import { getCompanyProfile, hasCompanyProfile } from '@/lib/company-profile';
import { filterSlotsByCompanyProfile } from '@/lib/company-profile-filter';

export const dynamic = 'force-dynamic';

interface JobPost {
  id: string;
  title: string;
  trade: string;
  description: string | null;
  unit_price: number;
  currency: string;
  start_date: string;
  end_date: string;
}

interface JobSlotWithPost extends JobSlot {
  job_post: JobPost;
}

export default function SubcontractorDashboard() {
  const [availableSlots, setAvailableSlots] = useState<MockJobSlotWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingSlot, setClaimingSlot] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [alternatives, setAlternatives] = useState<AlternativesResponse | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<MockJobSlotWithPost | null>(null);
  const [showBookingHistory, setShowBookingHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchParams, setSearchParams] = useState<SearchParams>({ status: 'available' });
  const [companyFilterEnabled, setCompanyFilterEnabled] = useState(true);
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);
  const router = useRouter();

  // モックデータから利用可能なスロットを取得
  const fetchAvailableSlots = (params: SearchParams = { status: 'available' }) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      let slots = getSlots(params);

      // 自社条件フィルタが有効な場合
      if (companyFilterEnabled) {
        const profile = getCompanyProfile(currentUser.id);
        slots = filterSlotsByCompanyProfile(slots, profile);
      }

      setAvailableSlots(slots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // 検索実行ハンドラ
  const handleSearch = (params: SearchParams) => {
    setSearchParams({ ...params, status: params.status || 'available' });
    fetchAvailableSlots({ ...params, status: params.status || 'available' });
  };

  // 自社条件フィルタトグル
  const handleCompanyFilterToggle = (enabled: boolean) => {
    setCompanyFilterEnabled(enabled);
  };

  // 詳細予約フォームを開く
  const openBookingForm = (slot: MockJobSlotWithPost) => {
    setSelectedSlot(slot);
    setShowBookingForm(true);
  };

  // 簡単予約（従来の方法）
  const quickClaim = async (slotId: string) => {
    if (!companyId.trim()) {
      alert('会社IDを入力してください');
      return;
    }

    try {
      setClaimingSlot(slotId);

      const claimRequest: ClaimRequest = {
        slotId,
        companyId: companyId.trim(),
        requestId: `req-${Date.now()}`
      };

      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimRequest),
      });

      if (response.ok) {
        alert('予約が完了しました！');
        fetchAvailableSlots(); // リストを更新
      } else {
        const error = await response.json();
        alert(`予約に失敗しました: ${error.message || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Claim failed:', error);
      alert('予約処理中にエラーが発生しました');
    } finally {
      setClaimingSlot(null);
    }
  };

  // 代替案を取得
  const fetchAlternatives = async (slotId: string) => {
    try {
      const response = await fetch(`/api/alternatives?slotId=${slotId}&days=7`);
      if (response.ok) {
        const data = await response.json();
        setAlternatives(data);
      }
    } catch (error) {
      console.error('Failed to fetch alternatives:', error);
    }
  };

  useEffect(() => {
    // ユーザー情報の確認
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(user);
    setCurrentUser(parsedUser);

    // 初回登録チェック & 自社条件フィルタの初期値設定
    const hasProfile = hasCompanyProfile(parsedUser.id);
    if (!hasProfile) {
      setShowFirstTimeModal(true);
      setCompanyFilterEnabled(false); // 未登録時はフィルタOFF
    }
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      fetchAvailableSlots();
    }
  }, [currentUser, companyFilterEnabled]);

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    router.push('/');
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* ナビゲーションバー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* モバイル: タイトルのみ表示 */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <h1 className="text-base md:text-xl font-bold text-gray-900">
                🏗️ ダンドリブッキング
              </h1>
              <span className="hidden md:inline text-sm text-gray-500">下請け業者向け</span>
            </div>

            {/* デスクトップ: 全ボタン表示 */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{currentUser.name}</span>
                <span>({currentUser.role})</span>
              </div>
              <button
                onClick={() => router.push('/subcontractor/settings')}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                自社情報設定
              </button>
              <button
                onClick={() => router.push('/contractor')}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                元請けビュー
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 transition-colors"
              >
                ダッシュボード
              </button>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        {/* ヘッダー - モバイル最適化 */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2 md:mb-4">
            工事スロット予約
          </h1>
          <p className="text-sm md:text-xl text-gray-600">
            利用可能な工事スロットから選択して予約
          </p>
        </div>

        {/* 予約情報と操作 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div className="flex-1 max-w-md">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">予約情報</h2>
              <label htmlFor="companyId" className="block text-sm font-medium text-gray-700 mb-2">
                会社ID *
              </label>
              <input
                type="text"
                id="companyId"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: company-123"
                required
              />
            </div>

            <div className="ml-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">マイページ</h3>
              <button
                onClick={() => setShowBookingHistory(true)}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                予約履歴を見る
              </button>
            </div>
          </div>
        </div>

        {/* 検索フィルタフォーム */}
        <SearchFilterForm
          onSearch={handleSearch}
          initialParams={searchParams}
          showCompanyFilter={true}
          companyFilterEnabled={companyFilterEnabled}
          onCompanyFilterToggle={handleCompanyFilterToggle}
        />

        {/* 利用可能なスロット */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">
            利用可能な工事スロット ({availableSlots.length}件)
          </h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : availableSlots.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">現在利用可能なスロットはありません</p>
              <button
                onClick={fetchAvailableSlots}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                更新
              </button>
            </div>
          ) : (
            <div className="space-y-4 md:grid md:gap-6 md:grid-cols-2 lg:grid-cols-3 md:space-y-0">
              {availableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    {/* モバイル最適化: 情報優先度 = 日付 > 価格 > エリア > 職種 */}
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-3">
                      {slot.job_post.title}
                    </h3>

                    {/* 日付（最優先） */}
                    <div className="mb-2 p-2 bg-blue-50 rounded">
                      <p className="text-sm font-bold text-blue-900">
                        📅 {slot.work_date}
                      </p>
                    </div>

                    {/* 価格（2番目） */}
                    <div className="mb-2 p-2 bg-green-50 rounded">
                      <p className="text-lg font-bold text-green-900">
                        ¥{slot.job_post.unit_price.toLocaleString()}
                      </p>
                    </div>

                    {/* エリア（3番目） */}
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">📍 エリア:</span> {slot.project.address}
                    </p>

                    {/* 職種（4番目） */}
                    <p className="text-sm text-gray-700 mb-1">
                      <span className="font-medium">🔧 職種:</span> {slot.job_post.trade}
                    </p>

                    {/* その他情報 */}
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">プロジェクト:</span> {slot.project.name}
                    </p>

                    {slot.job_post.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{slot.job_post.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => openBookingForm(slot)}
                      className="w-full px-4 py-3 md:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-base md:text-sm"
                    >
                      詳細予約フォーム
                    </button>

                    <button
                      onClick={() => quickClaim(slot.id)}
                      disabled={!companyId.trim() || claimingSlot === slot.id}
                      className="w-full px-4 py-3 md:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-base md:text-sm"
                    >
                      {claimingSlot === slot.id ? '予約中...' : '簡単予約'}
                    </button>

                    <button
                      onClick={() => fetchAlternatives(slot.id)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                    >
                      代替案を見る
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 代替案表示 */}
        {alternatives && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">代替案</h3>
            {alternatives.alternatives.length === 0 ? (
              <p className="text-gray-600">代替案はありません</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {alternatives.alternatives.map((alt) => (
                  <div key={alt.slot_id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold">{alt.job_post.title}</h4>
                    <p className="text-sm text-gray-600">職種: {alt.job_post.trade}</p>
                    <p className="text-sm text-gray-600">作業日: {alt.work_date}</p>
                    <button
                      onClick={() => quickClaim(alt.slot_id)}
                      disabled={!companyId.trim() || claimingSlot === alt.slot_id}
                      className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      {claimingSlot === alt.slot_id ? '予約中...' : 'この代替案を予約'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setAlternatives(null)}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        )}

        {/* フッター */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2024 ダンドリブッキング</p>
          <div className="mt-2 space-x-4">
            <a href="/dashboard" className="hover:text-gray-700 transition-colors">
              予約状況ダッシュボード
            </a>
            <a href="/contractor" className="hover:text-gray-700 transition-colors">
              元請け管理画面
            </a>
            <a href="/api/openapi.json" className="hover:text-gray-700 transition-colors">
              API仕様
            </a>
          </div>
        </div>

        {/* 詳細予約フォーム */}
        {showBookingForm && selectedSlot && (
          <BookingForm
            slot={selectedSlot}
            onClose={() => {
              setShowBookingForm(false);
              setSelectedSlot(null);
            }}
            onSuccess={() => {
              fetchAvailableSlots();
            }}
          />
        )}

        {/* 予約履歴 */}
        <BookingHistory
          isOpen={showBookingHistory}
          onClose={() => setShowBookingHistory(false)}
        />

        {/* 初回登録モーダル */}
        {showFirstTimeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">自社情報を登録してください</h2>
              <p className="text-gray-600 mb-6">
                対応可能な職種やエリアなどの自社情報を登録すると、あなたの会社に合った案件のみが表示されます。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowFirstTimeModal(false);
                    router.push('/subcontractor/settings');
                  }}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  登録する
                </button>
                <button
                  onClick={() => {
                    setShowFirstTimeModal(false);
                    setCompanyFilterEnabled(false);
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  後で
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* モバイルボトムナビゲーション */}
      <MobileBottomNav />

      {/* Push通知許可リクエストプロンプト */}
      <PushNotificationPrompt />
    </div>
  );
}