'use client';

import { useEffect, useState } from 'react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  subscribeToPushNotifications,
  getNotificationSettings,
  saveNotificationSettings,
} from '@/lib/push-notifications';

/**
 * Push通知許可リクエストモーダル
 *
 * 下請けページ初回訪問時に表示されるモーダル
 * - 通知許可をリクエスト
 * - 拒否した場合は7日間非表示
 * - 設定画面から再度許可可能
 */
export default function PushNotificationPrompt() {
  const [show, setShow] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const PROMPT_DISMISSED_KEY = 'push_prompt_dismissed_at';
  const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7日間

  useEffect(() => {
    // サーバーサイドでは表示しない
    if (typeof window === 'undefined') return;

    // Push通知がサポートされていない場合は表示しない
    if (!isPushNotificationSupported()) {
      console.log('[PushPrompt] Push notifications not supported');
      return;
    }

    // 既に許可されている場合は表示しない
    const permission = getNotificationPermission();
    if (permission === 'granted') {
      console.log('[PushPrompt] Already granted');
      return;
    }

    // 7日以内に「後で」を押している場合は表示しない
    const dismissedAt = localStorage.getItem(PROMPT_DISMISSED_KEY);
    if (dismissedAt) {
      const dismissedTime = new Date(dismissedAt).getTime();
      const now = Date.now();
      if (now - dismissedTime < DISMISS_DURATION) {
        console.log('[PushPrompt] Dismissed within last 7 days');
        return;
      }
    }

    // モーダルを表示
    // 少し遅延させてページロード後に表示
    const timer = setTimeout(() => {
      setShow(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  /**
   * 「許可する」ボタンクリック
   */
  const handleAllow = async () => {
    setIsRequesting(true);

    try {
      // 通知許可をリクエスト
      const permission = await requestNotificationPermission();

      if (permission === 'granted') {
        console.log('[PushPrompt] Permission granted');

        // Push通知をサブスクライブ
        const subscription = await subscribeToPushNotifications();

        if (subscription) {
          console.log('[PushPrompt] Subscribed successfully');

          // 通知設定を有効化
          const settings = getNotificationSettings();
          settings.enabled = true;
          saveNotificationSettings(settings);

          alert('通知を許可しました！新しい案件や変更があると通知が届きます。');
        } else {
          console.error('[PushPrompt] Subscription failed');
          alert('通知の登録に失敗しました。後で設定画面から再度お試しください。');
        }
      } else if (permission === 'denied') {
        console.log('[PushPrompt] Permission denied');
        alert(
          '通知が拒否されました。ブラウザの設定から通知を許可すると、新しい案件の通知を受け取れます。'
        );
      } else {
        console.log('[PushPrompt] Permission default (dismissed)');
      }
    } catch (error) {
      console.error('[PushPrompt] Error:', error);
      alert('エラーが発生しました。後で設定画面から再度お試しください。');
    } finally {
      setIsRequesting(false);
      setShow(false);
    }
  };

  /**
   * 「後で」ボタンクリック
   */
  const handleDismiss = () => {
    // 7日間非表示にする
    localStorage.setItem(PROMPT_DISMISSED_KEY, new Date().toISOString());
    setShow(false);
    console.log('[PushPrompt] Dismissed for 7 days');
  };

  if (!show) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40"></div>

      {/* モーダル */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* アイコン */}
          <div className="text-center mb-4">
            <div className="text-6xl">🔔</div>
          </div>

          {/* タイトル */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-3">
            通知を受け取りますか？
          </h2>

          {/* 説明 */}
          <p className="text-gray-600 text-center mb-6">
            新しい案件や予約変更の通知を受け取ることができます。
          </p>

          {/* メリット表示 */}
          <div className="bg-emerald-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-emerald-900 mb-2">通知で受け取れる情報:</h3>
            <ul className="text-sm text-emerald-800 space-y-1">
              <li>✓ あなたの条件に合った新しい案件</li>
              <li>✓ 予約案件の変更・キャンセル</li>
              <li>✓ 締切日のリマインダー</li>
            </ul>
          </div>

          {/* ボタン */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleAllow}
              disabled={isRequesting}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                isRequesting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {isRequesting ? '許可中...' : '通知を許可する'}
            </button>

            <button
              onClick={handleDismiss}
              disabled={isRequesting}
              className="w-full px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              後で
            </button>
          </div>

          {/* 補足 */}
          <p className="text-xs text-gray-500 text-center mt-4">
            後で設定画面からいつでも変更できます
          </p>
        </div>
      </div>
    </>
  );
}
