'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import { getClaims, MockClaim } from '@/lib/mock-data';

export default function ClaimsPage() {
  const [claims, setClaims] = useState<MockClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }
    const parsedUser = JSON.parse(user);
    setCurrentUser(parsedUser);
  }, [router]);

  useEffect(() => {
    if (currentUser) {
      setLoading(true);
      // 下請けユーザーの予約のみ取得
      const userClaims = getClaims().filter(
        claim => claim.subcontractor_company_id === currentUser.company_id
      );
      setClaims(userClaims);
      setLoading(false);
    }
  }, [currentUser]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      claimed: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      claimed: '予約済み',
      confirmed: '確定',
      cancelled: 'キャンセル',
      completed: '完了'
    };
    return (
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">予約履歴</h1>
              <p className="text-sm text-gray-600 mt-1">{currentUser.name} さんの予約</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              戻る
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : claims.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">予約履歴はありません</p>
            <button
              onClick={() => router.push('/subcontractor')}
              className="mt-4 px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              案件を探す
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {claims.map(claim => (
              <div
                key={claim.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 md:p-6"
              >
                {/* モバイル最適化: 1列表示、タップしやすいカード */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex-1">
                    {/* 案件名（太字） */}
                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                      {claim.job_slot.job_post.title}
                    </h3>

                    {/* 日付 */}
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">📅 作業日:</span> {claim.job_slot.work_date}
                    </p>

                    {/* プロジェクト・エリア */}
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">🏗️ 現場:</span> {claim.job_slot.project.name}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">📍 エリア:</span> {claim.job_slot.project.address}
                    </p>

                    {/* 職種・単価 */}
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">🔧 職種:</span> {claim.job_slot.job_post.trade}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      <span className="font-medium">💰 単価:</span> ¥{claim.job_slot.job_post.unit_price.toLocaleString()}
                    </p>

                    {/* 予約日時 */}
                    <p className="text-xs text-gray-500 mt-2">
                      予約日時: {new Date(claim.created_at).toLocaleString('ja-JP')}
                    </p>
                  </div>

                  {/* ステータス（色付きバッジ） */}
                  <div className="flex md:flex-col items-start md:items-end gap-2">
                    {getStatusBadge(claim.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
