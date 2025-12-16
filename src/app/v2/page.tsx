'use client';

import { useRouter } from 'next/navigation';

export default function V2TopPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">ダンドリブッキング v2</h1>
          <p className="text-sm text-gray-500 mt-1">Supabase版 - 協力業者評価機能デモ</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 説明 */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">v2版について</h2>
          <p className="text-blue-800 text-sm">
            この画面はSupabaseを使用した新しい評価機能のデモ版です。
            既存のモック版とは独立して動作します。
          </p>
          <ul className="mt-3 text-sm text-blue-700 list-disc list-inside space-y-1">
            <li>完了報告: 協力業者が工事完了を報告</li>
            <li>評価入力: 元請けが協力業者を評価（5段階）</li>
            <li>デモ用にユーザー切り替えが可能</li>
          </ul>
        </div>

        {/* 画面リンク */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* 協力業者向け */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-xl">👷</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">協力業者向け</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              案件への応募や完了報告ができます。
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/v2/subcontractor/dashboard')}
                className="w-full px-4 py-3 bg-blue-700 text-white rounded-md hover:bg-blue-800 font-medium"
              >
                ダッシュボード（カレンダー）
              </button>
              <button
                onClick={() => router.push('/v2/subcontractor/job-posts')}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
              >
                案件一覧・応募画面へ
              </button>
              <button
                onClick={() => router.push('/v2/subcontractor/completion-reports')}
                className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 font-medium"
              >
                完了報告画面へ
              </button>
              <button
                onClick={() => router.push('/v2/subcontractor/settings')}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
              >
                通知設定へ
              </button>
            </div>
          </div>

          {/* 元請け向け */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <span className="text-xl">🏢</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">元請け向け</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              完了報告の確認と協力業者の評価ができます。
            </p>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/v2/contractor/dashboard')}
                className="w-full px-4 py-3 bg-orange-700 text-white rounded-md hover:bg-orange-800 font-medium"
              >
                ダッシュボード（カレンダー）
              </button>
              <button
                onClick={() => router.push('/v2/contractor/completion-reports')}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
              >
                完了報告管理画面へ
              </button>
              <button
                onClick={() => router.push('/v2/contractor/evaluations')}
                className="w-full px-4 py-3 bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 font-medium"
              >
                評価一覧画面へ
              </button>
              <button
                onClick={() => router.push('/v2/contractor/subcontractors')}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                協力業者検索画面へ
              </button>
              <button
                onClick={() => router.push('/v2/contractor/job-posts')}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
              >
                案件管理・指名画面へ
              </button>
              <button
                onClick={() => router.push('/v2/contractor/settings')}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
              >
                通知設定へ
              </button>
            </div>
          </div>
        </div>

        {/* データ構造の説明 */}
        <div className="mt-8 p-6 bg-gray-100 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-3">テストデータ</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700 mb-1">元請け（テナント）:</p>
              <ul className="text-gray-600 list-disc list-inside">
                <li>株式会社ダンドリ建設</li>
                <li>東京総合建設株式会社</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">協力業者:</p>
              <ul className="text-gray-600 list-disc list-inside">
                <li>株式会社山田電気工事（電気・空調）</li>
                <li>佐藤配管工業（配管・給排水）</li>
                <li>高橋内装株式会社（内装・クロス）</li>
                <li>他2社</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 既存版へのリンク */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 text-sm"
          >
            ← 既存版（モック）に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
