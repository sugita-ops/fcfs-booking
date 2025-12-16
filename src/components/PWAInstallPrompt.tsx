'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // ログイン状態をチェック
    const checkLoginStatus = () => {
      const user = localStorage.getItem('currentUser');
      setIsLoggedIn(!!user);
    };

    checkLoginStatus();
    const interval = setInterval(checkLoginStatus, 1000); // 1秒ごとにチェック

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;

    // 前回のプロンプト表示日時をチェック
    const lastPromptDate = localStorage.getItem('pwaPromptLastShown');
    const now = new Date().getTime();

    if (lastPromptDate) {
      const daysSinceLastPrompt = (now - parseInt(lastPromptDate)) / (1000 * 60 * 60 * 24);
      if (daysSinceLastPrompt < 7) {
        // 7日以内は表示しない
        return;
      }
    }

    // beforeinstallpromptイベントをリッスン
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [isLoggedIn]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
    localStorage.setItem('pwaPromptLastShown', new Date().getTime().toString());
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwaPromptLastShown', new Date().getTime().toString());
  };

  if (!showPrompt || !isLoggedIn) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-40">
      <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-500 p-4">
        <div className="flex items-start gap-3">
          <div className="text-3xl">📱</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 mb-1">アプリをインストール</h3>
            <p className="text-sm text-gray-600 mb-3">
              ダンドリブッキングをホーム画面に追加して、いつでも素早くアクセスできます。
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm"
              >
                インストール
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                後で
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
