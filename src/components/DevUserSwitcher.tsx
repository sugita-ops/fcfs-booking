'use client';

import { useState, useEffect } from 'react';
import { getQuickLoginUsers } from '@/lib/mock-data';

interface DevUserSwitcherProps {
  onUserChange?: () => void;
}

export default function DevUserSwitcher({ onUserChange }: DevUserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDev, setIsDev] = useState(false);

  useEffect(() => {
    // 開発環境チェック
    setIsDev(process.env.NODE_ENV === 'development');

    // 現在のユーザーを取得
    const user = localStorage.getItem('currentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
  }, []);

  const switchUser = (userType: 'gc_admin' | 'sub_admin') => {
    const users = getQuickLoginUsers();
    const targetUser = users[userType];

    if (!targetUser) return;

    // ユーザー情報を整形
    const userData = {
      id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      type: userType === 'gc_admin' ? 'contractor' : 'subcontractor',
      role: targetUser.company.is_gc ? '元請け業者' : '下請け業者',
      company: targetUser.company,
      loginTime: new Date().toISOString()
    };

    // localStorageに保存
    localStorage.setItem('currentUser', JSON.stringify(userData));
    setCurrentUser(userData);
    setIsOpen(false);

    // ページをリロードしてユーザー変更を反映
    if (onUserChange) {
      onUserChange();
    } else {
      window.location.reload();
    }
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setIsOpen(false);
    window.location.href = '/';
  };

  // 本番環境では表示しない
  if (!isDev) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* トグルボタン */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-purple-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
        title="開発用ユーザー切り替え"
      >
        <span>👤</span>
        <span className="font-medium">Dev</span>
      </button>

      {/* ユーザー切り替えパネル */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800 mb-1">開発用ユーザー切り替え</h3>
            <p className="text-xs text-gray-500">本番環境では表示されません</p>
          </div>

          {/* 現在のユーザー */}
          {currentUser && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-600 font-medium mb-1">現在のユーザー</p>
              <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
              <p className="text-xs text-gray-600">{currentUser.role}</p>
              {currentUser.company && (
                <p className="text-xs text-gray-500 mt-1">{currentUser.company.name}</p>
              )}
            </div>
          )}

          {/* ユーザー選択 */}
          <div className="space-y-2">
            <button
              onClick={() => switchUser('gc_admin')}
              className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-lg">
                  🏗️
                </div>
                <div>
                  <p className="font-semibold text-gray-800">元請け管理者</p>
                  <p className="text-xs text-gray-600">東建総合建設(株) - 田中 太郎</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => switchUser('sub_admin')}
              className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white text-lg">
                  🔨
                </div>
                <div>
                  <p className="font-semibold text-gray-800">下請け管理者</p>
                  <p className="text-xs text-gray-600">山田基礎工業 - 山田 次郎</p>
                </div>
              </div>
            </button>
          </div>

          {/* ログアウト */}
          {currentUser && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={logout}
                className="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg border border-red-200 transition-colors font-medium"
              >
                ログアウト
              </button>
            </div>
          )}

          {/* 閉じるボタン */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
