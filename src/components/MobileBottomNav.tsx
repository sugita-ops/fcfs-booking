'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getUnreadCount } from '@/lib/notifications';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const updateUnreadCount = () => {
      const user = localStorage.getItem('currentUser');
      if (user) {
        const userId = JSON.parse(user).id;
        setUnreadCount(getUnreadCount(userId));
      }
    };

    updateUnreadCount();
    // 5秒ごとに更新（実際のプロダクションではWebSocketなどを使用）
    const interval = setInterval(updateUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { label: '検索', icon: '🔍', path: '/subcontractor', badge: 0 },
    { label: '予約履歴', icon: '📋', path: '/subcontractor/claims', badge: 0 },
    { label: '通知', icon: '🔔', path: '/subcontractor/notifications', badge: unreadCount },
    { label: '設定', icon: '⚙️', path: '/subcontractor/settings', badge: 0 }
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around">
        {tabs.map(tab => {
          const isActive = pathname === tab.path;
          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`relative flex flex-col items-center justify-center py-2 px-3 min-w-[60px] transition-colors ${
                isActive
                  ? 'text-emerald-600'
                  : 'text-gray-600 hover:text-emerald-500'
              }`}
            >
              <span className="text-2xl mb-1">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
              {/* 未読バッジ */}
              {tab.badge > 0 && (
                <span className="absolute top-1 right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {tab.badge > 99 ? '99+' : tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
