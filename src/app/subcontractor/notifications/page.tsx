'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createSampleNotifications,
  Notification
} from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const router = useRouter();

  const loadNotifications = () => {
    if (currentUser) {
      const userNotifs = getUserNotifications(currentUser.id);
      setNotifications(userNotifs);
    }
  };

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
      loadNotifications();
    }
  }, [currentUser]);

  const handleMarkAsRead = (notifId: string) => {
    markAsRead(notifId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    if (currentUser) {
      markAllAsRead(currentUser.id);
      loadNotifications();
    }
  };

  const handleDelete = (notifId: string) => {
    deleteNotification(notifId);
    loadNotifications();
  };

  const handleCreateSamples = () => {
    if (currentUser) {
      createSampleNotifications(currentUser.id);
      loadNotifications();
    }
  };

  const getNotificationIcon = (type: string) => {
    return type === 'match' ? '🎯' : '📝';
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

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">通知</h1>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200"
                >
                  全て既読
                </button>
              )}
              <button
                onClick={() => router.back()}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                戻る
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600 mb-4">通知はありません</p>
            <button
              onClick={handleCreateSamples}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              サンプル通知を作成（開発用）
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => (
              <div
                key={notif.id}
                className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4 ${
                  !notif.isRead ? 'border-l-4 border-emerald-500' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* アイコン */}
                  <div className="text-3xl flex-shrink-0">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">
                      {notif.title}
                    </h3>
                    <p className="text-sm text-gray-700 mb-2">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(notif.createdAt).toLocaleString('ja-JP')}
                    </p>
                  </div>

                  {/* アクション */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="text-xs px-3 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                      >
                        既読
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      削除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 開発用ボタン */}
        {notifications.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleCreateSamples}
              className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              サンプル通知を追加（開発用）
            </button>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
