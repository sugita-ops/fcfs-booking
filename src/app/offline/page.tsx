'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // オンライン状態の検知
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ ネットワークに再接続しました');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('⚠️ オフラインになりました');
    };

    // 初期状態の確認
    setIsOnline(navigator.onLine);

    // イベントリスナー登録
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      router.back();
    } else {
      alert('まだオフラインです。ネットワーク接続を確認してください。');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          {/* アイコン */}
          <div className="text-6xl mb-4">
            {isOnline ? '✅' : '📡'}
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {isOnline ? 'オンラインに復帰しました' : 'オフラインです'}
          </h1>

          {/* 説明 */}
          <p className="text-gray-600 mb-6">
            {isOnline ? (
              '接続が復旧しました。ページを再読み込みしてください。'
            ) : (
              <>
                ネットワークに接続されていません。
                <br />
                キャッシュされたデータを表示しています。
              </>
            )}
          </p>

          {/* キャッシュ情報 */}
          {!isOnline && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                オフラインで利用可能:
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ 過去に閲覧したページ</li>
                <li>✓ 予約履歴</li>
                <li>✓ 自社情報設定</li>
                <li>✗ 新しい案件の検索（要オンライン）</li>
              </ul>
            </div>
          )}

          {/* ボタン */}
          <button
            onClick={handleRetry}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
              isOnline
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isOnline ? '前のページに戻る' : '再接続を試す'}
          </button>

          {/* ホームボタン */}
          <button
            onClick={() => router.push('/subcontractor')}
            className="w-full mt-3 px-6 py-3 bg-white text-emerald-600 border-2 border-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-colors"
          >
            ホームに戻る
          </button>

          {/* 状態インジケーター */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{isOnline ? 'オンライン' : 'オフライン'}</span>
            </div>
          </div>
        </div>

        {/* 開発用情報 */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg text-xs text-yellow-800">
            <p className="font-semibold mb-1">開発モード:</p>
            <p>Service Workerは本番環境（npm run build && npm start）でのみ有効です。</p>
          </div>
        )}
      </div>
    </div>
  );
}
