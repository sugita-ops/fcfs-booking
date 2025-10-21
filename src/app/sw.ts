import { defaultCache } from '@serwist/next/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

// Serwistの設定
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Service Worker本体
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,

  // キャッシュ戦略の設定
  runtimeCaching: [
    // 1. CacheFirst: 静的アセット（アイコン、画像、manifest）
    {
      urlPattern: /^https?:\/\/[^\/]+\/(icons|images)\/.*$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
      },
    },
    {
      urlPattern: /\/manifest\.json$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'manifest',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
      },
    },

    // 2. StaleWhileRevalidate: Next.jsの静的ファイル（JS/CSS）
    {
      urlPattern: /^\/_next\/static\/.*/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 24 * 60 * 60, // 1日
        },
      },
    },

    // 3. NetworkFirst: モックデータAPI
    {
      urlPattern: /\/api\/mock\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'mock-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5分
        },
        networkTimeoutSeconds: 10,
      },
    },

    // 4. NetworkFirst: 下請けページ（/subcontractor/*）
    {
      urlPattern: /^https?:\/\/[^\/]+\/subcontractor.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'subcontractor-pages',
        expiration: {
          maxEntries: 30,
          maxAgeSeconds: 24 * 60 * 60, // 1日
        },
        networkTimeoutSeconds: 10,
      },
    },

    // 5. NetworkFirst: オフラインページ（必ずキャッシュ）
    {
      urlPattern: /^https?:\/\/[^\/]+\/offline$/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-page',
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
      },
    },

    // デフォルトのキャッシュ戦略
    ...defaultCache,
  ],
});

// Service Workerイベントリスナー
serwist.addEventListeners();

// インストール時のログ
self.addEventListener('install', (event) => {
  console.log('✅ [SW] Service Worker installed');
});

// アクティベーション時のログ
self.addEventListener('activate', (event) => {
  console.log('✅ [SW] Service Worker activated');
});

// フェッチ時のエラーハンドリング（オフライン時のフォールバック）
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // ナビゲーションリクエスト（ページ遷移）のみ処理
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        // オフライン時は /offline ページにフォールバック
        const cache = await caches.open('offline-page');
        const cachedResponse = await cache.match('/offline');

        if (cachedResponse) {
          console.log('⚠️ [SW] Offline - showing /offline page');
          return cachedResponse;
        }

        // キャッシュにもない場合は基本的なオフラインレスポンス
        return new Response('オフラインです', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/html; charset=utf-8' }),
        });
      })
    );
  }
});

// プッシュ通知のリスナー（Phase 2.4.3実装）
self.addEventListener('push', (event) => {
  console.log('📬 [SW] Push notification received');

  let data: any = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'New Notification', message: event.data.text() };
    }
  }

  const title = data.title || 'ダンドリブッキング';
  const options: NotificationOptions = {
    body: data.message || '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: data.tag || `notification-${Date.now()}`,
    data: {
      url: data.url || '/subcontractor/notifications',
      notificationType: data.notificationType || 'company_match',
      timestamp: new Date().toISOString(),
    },
    vibrate: [200, 100, 200],
    requireInteraction: false, // 自動的に閉じる
  };

  event.waitUntil(
    self.registration.showNotification(title, options).then(() => {
      console.log('✅ [SW] Push notification displayed');
    })
  );
});

// 通知クリック時の処理
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 [SW] Notification clicked');

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/subcontractor/notifications';

  event.waitUntil(
    // 既存のウィンドウを探す
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既にアプリが開かれている場合はフォーカス
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // 開かれていない場合は新しいウィンドウを開く
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Service Workerメッセージ受信（テスト用通知）
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message, notificationType } = event.data.payload;

    const options: NotificationOptions = {
      body: message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: `test-${Date.now()}`,
      data: {
        url: '/subcontractor/notifications',
        notificationType,
        timestamp: new Date().toISOString(),
      },
      vibrate: [200, 100, 200],
    };

    self.registration.showNotification(title, options).then(() => {
      console.log('✅ [SW] Test notification displayed');
    });
  }
});
