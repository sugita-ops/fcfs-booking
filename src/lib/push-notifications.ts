/**
 * Push通知管理ライブラリ（Phase 2.4.3）
 *
 * Web Push API を使用したプッシュ通知の管理
 * - 通知許可のリクエスト
 * - Push通知のサブスクリプション管理
 * - 通知設定の保存/取得
 */

import { NotificationType } from './notifications';

/**
 * 通知設定データ構造
 */
export interface PushNotificationSettings {
  enabled: boolean; // プッシュ通知全体のON/OFF
  permissions: {
    company_match: boolean; // 自社条件マッチ
    booking_change: boolean; // 予約変更
    deadline_reminder: boolean; // 締切リマインダー
  };
  quietHours: {
    enabled: boolean; // 夜間通知オフ
    start: string; // 開始時刻（例: "22:00"）
    end: string; // 終了時刻（例: "06:00"）
  };
}

/**
 * デフォルト通知設定
 */
export const DEFAULT_NOTIFICATION_SETTINGS: PushNotificationSettings = {
  enabled: false,
  permissions: {
    company_match: true,
    booking_change: true,
    deadline_reminder: true,
  },
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '06:00',
  },
};

const SETTINGS_STORAGE_KEY = 'push_notification_settings';
const SUBSCRIPTION_STORAGE_KEY = 'push_subscription';

/**
 * ブラウザがPush通知をサポートしているか確認
 */
export const isPushNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * 現在の通知許可状態を取得
 */
export const getNotificationPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
};

/**
 * 通知許可をリクエスト
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!isPushNotificationSupported()) {
    console.warn('[Push] Push notification not supported');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    console.log('[Push] Permission:', permission);
    return permission;
  } catch (error) {
    console.error('[Push] Permission request failed:', error);
    return 'denied';
  }
};

/**
 * Service Workerを取得
 */
const getServiceWorkerRegistration = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('[Push] Failed to get Service Worker registration:', error);
    return null;
  }
};

/**
 * Push通知のサブスクリプションを取得
 */
export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await getServiceWorkerRegistration();
  if (!registration) return null;

  try {
    const subscription = await registration.pushManager.getSubscription();
    return subscription;
  } catch (error) {
    console.error('[Push] Failed to get subscription:', error);
    return null;
  }
};

/**
 * Push通知をサブスクライブ
 */
export const subscribeToPushNotifications = async (): Promise<PushSubscription | null> => {
  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    console.error('[Push] Service Worker not ready');
    return null;
  }

  // VAPID公開鍵を環境変数から取得
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    console.error('[Push] VAPID public key not found in environment variables');
    return null;
  }

  try {
    // 既存のサブスクリプションをチェック
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('[Push] Already subscribed');
      return existingSubscription;
    }

    // 新規サブスクリプション
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    console.log('[Push] Subscribed successfully');
    console.log('[Push] Subscription:', JSON.stringify(subscription));

    // サブスクリプションをlocalStorageに保存
    saveSubscriptionToStorage(subscription);

    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
};

/**
 * Push通知のサブスクリプションを解除
 */
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  const subscription = await getPushSubscription();
  if (!subscription) {
    console.log('[Push] No active subscription');
    return true;
  }

  try {
    await subscription.unsubscribe();
    console.log('[Push] Unsubscribed successfully');

    // localStorageから削除
    removeSubscriptionFromStorage();

    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
};

/**
 * Base64 URL-safe文字列をUint8Arrayに変換
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * サブスクリプションをlocalStorageに保存
 */
function saveSubscriptionToStorage(subscription: PushSubscription): void {
  try {
    localStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(subscription.toJSON()));
  } catch (error) {
    console.error('[Push] Failed to save subscription to storage:', error);
  }
}

/**
 * localStorageからサブスクリプションを削除
 */
function removeSubscriptionFromStorage(): void {
  try {
    localStorage.removeItem(SUBSCRIPTION_STORAGE_KEY);
  } catch (error) {
    console.error('[Push] Failed to remove subscription from storage:', error);
  }
}

/**
 * 通知設定を取得
 */
export const getNotificationSettings = (): PushNotificationSettings => {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;

  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) return DEFAULT_NOTIFICATION_SETTINGS;

    const settings = JSON.parse(stored);
    // マイグレーション: 古いデータ構造にも対応
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...settings,
      permissions: {
        ...DEFAULT_NOTIFICATION_SETTINGS.permissions,
        ...settings.permissions,
      },
      quietHours: {
        ...DEFAULT_NOTIFICATION_SETTINGS.quietHours,
        ...settings.quietHours,
      },
    };
  } catch (error) {
    console.error('[Push] Failed to load notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

/**
 * 通知設定を保存
 */
export const saveNotificationSettings = (settings: PushNotificationSettings): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    console.log('[Push] Settings saved:', settings);
  } catch (error) {
    console.error('[Push] Failed to save notification settings:', error);
  }
};

/**
 * 特定の通知タイプが有効か確認
 */
export const isNotificationTypeEnabled = (type: NotificationType): boolean => {
  const settings = getNotificationSettings();
  if (!settings.enabled) return false;

  return settings.permissions[type];
};

/**
 * 現在時刻が夜間時間帯か確認
 */
export const isQuietHours = (): boolean => {
  const settings = getNotificationSettings();
  if (!settings.quietHours.enabled) return false;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTime = currentHours * 60 + currentMinutes;

  const [startHours, startMinutes] = settings.quietHours.start.split(':').map(Number);
  const [endHours, endMinutes] = settings.quietHours.end.split(':').map(Number);
  const startTime = startHours * 60 + startMinutes;
  const endTime = endHours * 60 + endMinutes;

  // 夜間時間帯が日付をまたぐ場合（例: 22:00-06:00）
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime < endTime;
  }

  // 夜間時間帯が日付をまたがない場合
  return currentTime >= startTime && currentTime < endTime;
};

/**
 * 通知を送信すべきか判定
 */
export const shouldSendNotification = (type: NotificationType): boolean => {
  // 通知タイプが無効
  if (!isNotificationTypeEnabled(type)) {
    console.log(`[Push] Notification type "${type}" is disabled`);
    return false;
  }

  // 夜間時間帯
  if (isQuietHours()) {
    console.log('[Push] Quiet hours - notification suppressed');
    return false;
  }

  // 通知許可が拒否されている
  if (getNotificationPermission() !== 'granted') {
    console.log('[Push] Notification permission not granted');
    return false;
  }

  return true;
};

/**
 * テスト用: Push通知を送信
 * (現在はService Workerにメッセージを送信して、SW内で通知を表示)
 */
export const sendTestPushNotification = async (
  title: string,
  message: string,
  type: NotificationType = 'company_match'
): Promise<boolean> => {
  if (!shouldSendNotification(type)) {
    console.log('[Push] Test notification skipped (disabled or quiet hours)');
    return false;
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration || !registration.active) {
    console.error('[Push] Service Worker not active');
    return false;
  }

  try {
    // Service WorkerにメッセージPOST（Service Worker側で通知を表示）
    registration.active.postMessage({
      type: 'SHOW_NOTIFICATION',
      payload: {
        title,
        message,
        notificationType: type,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('[Push] Test notification sent to Service Worker');
    return true;
  } catch (error) {
    console.error('[Push] Failed to send test notification:', error);
    return false;
  }
};
