'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ [PWA] Service Worker registered successfully');
          console.log('[PWA] Scope:', registration.scope);
          console.log('[PWA] Active:', registration.active?.state);

          // 更新チェック
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 [PWA] Service Worker update found');

            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('✅ [PWA] Service Worker updated and activated');
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ [PWA] Service Worker registration failed:', error);
        });

      // Service Worker状態の定期チェック
      const checkSW = async () => {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          console.log('📊 [PWA] Service Worker Status:');
          console.log('  - Registered:', !!registration);
          console.log('  - Active:', registration.active?.state);
          console.log('  - Scope:', registration.scope);

          // キャッシュストレージの確認
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            console.log('📦 [PWA] Cache Storage:');
            console.log('  - Total caches:', cacheNames.length);
            console.log('  - Cache names:', cacheNames);

            // 各キャッシュのエントリ数を表示
            for (const cacheName of cacheNames) {
              const cache = await caches.open(cacheName);
              const keys = await cache.keys();
              console.log(`  - ${cacheName}: ${keys.length} entries`);
            }
          }
        } else {
          console.log('⚠️ [PWA] Service Worker not registered');
        }
      };

      // 初回チェック（5秒後）
      setTimeout(checkSW, 5000);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('ℹ️ [PWA] Service Worker disabled in development mode');
      } else {
        console.log('⚠️ [PWA] Service Worker not supported in this browser');
      }
    }
  }, []);

  return null; // UIは表示しない
}
