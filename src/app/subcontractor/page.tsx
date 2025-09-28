'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { JobSlot, ClaimRequest, AlternativesResponse } from '@/types/api';
import BookingForm from '@/components/BookingForm';
import BookingHistory from '@/components/BookingHistory';

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
  const [availableSlots, setAvailableSlots] = useState<JobSlotWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingSlot, setClaimingSlot] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState('');
  const [alternatives, setAlternatives] = useState<AlternativesResponse | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<JobSlotWithPost | null>(null);
  const [showBookingHistory, setShowBookingHistory] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  // 利用可能なスロットを取得（実際のAPIエンドポイントを作成する必要があります）
  const fetchAvailableSlots = async () => {
    try {
      setLoading(true);
      // TODO: 実際のAPIエンドポイント '/api/slots' を実装する必要があります
      // const response = await fetch('/api/slots');
      // const slots = await response.json();
      // setAvailableSlots(slots);

      // 一時的なダミーデータ
      const dummySlots: JobSlotWithPost[] = [
        {
          id: 'slot-1',
          tenant_id: 'tenant-1',
          job_post_id: 'job-1',
          work_date: '2024-12-01',
          status: 'available',
          claimed_by_company: null,
          claimed_by_user: null,
          claimed_at: null,
          created_at: '2024-11-01T00:00:00Z',
          updated_at: '2024-11-01T00:00:00Z',
          job_post: {
            id: 'job-1',
            title: '基礎工事',
            trade: '基礎工',
            description: '住宅の基礎工事を行います',
            unit_price: 150000,
            currency: 'JPY',
            start_date: '2024-12-01',
            end_date: '2024-12-05'
          }
        },
        {
          id: 'slot-2',
          tenant_id: 'tenant-1',
          job_post_id: 'job-2',
          work_date: '2024-12-03',
          status: 'available',
          claimed_by_company: null,
          claimed_by_user: null,
          claimed_at: null,
          created_at: '2024-11-01T00:00:00Z',
          updated_at: '2024-11-01T00:00:00Z',
          job_post: {
            id: 'job-2',
            title: '鉄筋工事',
            trade: '鉄筋工',
            description: 'RC構造の鉄筋組立作業',
            unit_price: 200000,
            currency: 'JPY',
            start_date: '2024-12-03',
            end_date: '2024-12-07'
          }
        }
      ];
      setAvailableSlots(dummySlots);
    } catch (error) {
      console.error('Failed to fetch slots:', error);
    } finally {
      setLoading(false);
    }
  };

  // 詳細予約フォームを開く
  const openBookingForm = (slot: JobSlotWithPost) => {
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
    setCurrentUser(JSON.parse(user));

    fetchAvailableSlots();
  }, [router]);

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
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションバー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gray-900">
                🏗️ FCFS工事予約システム
              </h1>
              <span className="text-sm text-gray-500">下請け業者向け</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span className="font-medium">{currentUser.name}</span>
                <span>({currentUser.role})</span>
              </div>
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            工事スロット予約
          </h1>
          <p className="text-xl text-gray-600">
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

        {/* 利用可能なスロット */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">利用可能な工事スロット</h2>

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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">
                      {slot.job_post.title}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><span className="font-medium">職種:</span> {slot.job_post.trade}</p>
                      <p><span className="font-medium">作業日:</span> {slot.work_date}</p>
                      <p><span className="font-medium">単価:</span> ¥{slot.job_post.unit_price.toLocaleString()}</p>
                      <p><span className="font-medium">期間:</span> {slot.job_post.start_date} 〜 {slot.job_post.end_date}</p>
                    </div>
                    {slot.job_post.description && (
                      <p className="mt-2 text-sm text-gray-700">{slot.job_post.description}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => openBookingForm(slot)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      詳細予約フォーム
                    </button>

                    <button
                      onClick={() => quickClaim(slot.id)}
                      disabled={!companyId.trim() || claimingSlot === slot.id}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                    >
                      {claimingSlot === slot.id ? '予約中...' : '簡単予約'}
                    </button>

                    <button
                      onClick={() => fetchAlternatives(slot.id)}
                      className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
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
          <p>© 2024 FCFS工事予約システム</p>
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
      </div>
    </div>
  );
}