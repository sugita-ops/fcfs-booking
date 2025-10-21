/**
 * 通知管理システム（localStorage使用）
 * Phase 2.4.3でPush/Mail対応に拡張
 */

/**
 * 通知の配信チャネル
 * - push: プッシュ通知（ブラウザ通知）
 * - mail: メール通知（Phase 2.5で実装予定）
 * - in-app: アプリ内通知のみ
 */
export type NotificationChannel = 'push' | 'mail' | 'in-app';

/**
 * 通知の種類
 * - company_match: 自社条件にマッチした案件公開
 * - booking_change: 予約案件の変更（日程変更・キャンセル）
 * - deadline_reminder: 締切リマインダー（前日8:00）
 */
export type NotificationType = 'company_match' | 'booking_change' | 'deadline_reminder';

/**
 * 通知データ構造
 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  channel: NotificationChannel; // 配信チャネル
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  expiresAt?: string; // 30日後に自動削除
  // 関連データ
  relatedJobSlotId?: string;
  relatedClaimId?: string;
  // Push通知用データ
  pushSentAt?: string; // Push通知送信日時
  pushSuccess?: boolean; // Push通知送信成功/失敗
}

const STORAGE_KEY = 'notifications';

/**
 * 通知を全件取得（期限切れ通知を自動削除）
 */
export const getAllNotifications = (): Notification[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  const notifications: Notification[] = JSON.parse(stored);
  const now = new Date();

  // 期限切れ通知を除外（30日保持）
  const validNotifications = notifications.filter((n) => {
    if (!n.expiresAt) return true;
    return new Date(n.expiresAt) > now;
  });

  // 期限切れ通知が削除された場合、localStorageを更新
  if (validNotifications.length !== notifications.length) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validNotifications));
  }

  return validNotifications;
};

/**
 * ユーザーの通知を取得
 */
export const getUserNotifications = (userId: string): Notification[] => {
  return getAllNotifications()
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * 未読通知数を取得
 */
export const getUnreadCount = (userId: string): number => {
  return getUserNotifications(userId).filter(n => !n.isRead).length;
};

/**
 * 通知を追加（30日後に自動削除される期限を設定）
 */
export const addNotification = (notification: Omit<Notification, 'id' | 'createdAt' | 'expiresAt'>): void => {
  const notifications = getAllNotifications();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30日後

  const newNotification: Notification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
  notifications.push(newNotification);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
};

/**
 * 通知を既読にする
 */
export const markAsRead = (notificationId: string): void => {
  const notifications = getAllNotifications();
  const updated = notifications.map(n =>
    n.id === notificationId ? { ...n, isRead: true } : n
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

/**
 * 全通知を既読にする
 */
export const markAllAsRead = (userId: string): void => {
  const notifications = getAllNotifications();
  const updated = notifications.map(n =>
    n.userId === userId ? { ...n, isRead: true } : n
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

/**
 * 通知を削除
 */
export const deleteNotification = (notificationId: string): void => {
  const notifications = getAllNotifications();
  const filtered = notifications.filter(n => n.id !== notificationId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * ユーザーの全通知を削除
 */
export const deleteAllNotifications = (userId: string): void => {
  const notifications = getAllNotifications();
  const filtered = notifications.filter(n => n.userId !== userId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

/**
 * デモ用: サンプル通知を生成（Phase 2.4.3対応版）
 */
export const createSampleNotifications = (userId: string): void => {
  const samples: Omit<Notification, 'id' | 'createdAt' | 'expiresAt'>[] = [
    {
      userId,
      type: 'company_match',
      channel: 'push',
      title: '新しい案件が見つかりました',
      message: '「基礎工事 - 渋谷オフィスビル新築」があなたの条件にマッチしています',
      isRead: false,
      relatedJobSlotId: 'slot-001',
      pushSentAt: new Date().toISOString(),
      pushSuccess: true,
    },
    {
      userId,
      type: 'booking_change',
      channel: 'in-app',
      title: '予約案件が変更されました',
      message: '「型枠工事 - 新宿マンション」の作業日が2024-02-20に変更されました',
      isRead: false,
      relatedClaimId: 'claim-001',
    },
    {
      userId,
      type: 'deadline_reminder',
      channel: 'push',
      title: '締切が近づいています',
      message: '「鉄筋工事 - 品川オフィスビル」の締切は明日です',
      isRead: true,
      relatedJobSlotId: 'slot-002',
      pushSentAt: new Date().toISOString(),
      pushSuccess: true,
    },
  ];

  samples.forEach((sample) => addNotification(sample));
};
