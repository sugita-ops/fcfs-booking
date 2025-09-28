'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserRole {
  id: string;
  name: string;
  role: string;
  department: string;
  permissions: string[];
  color: string;
  icon: string;
}

const predefinedUsers: UserRole[] = [
  {
    id: 'super_admin',
    name: 'スーパー管理者',
    role: 'システム管理',
    department: '',
    permissions: ['全権限'],
    color: 'bg-blue-500',
    icon: '⚡'
  },
  {
    id: 'yamada_taro',
    name: '山田 太郎',
    role: '経営者',
    department: '経営管理',
    permissions: ['スケジュール管理', '売上分析', '現場管理'],
    color: 'bg-red-500',
    icon: '👨‍💼'
  },
  {
    id: 'suzuki_ichiro',
    name: '鈴木 一郎',
    role: '支店長',
    department: '東京支店',
    permissions: ['自分のスケジュール確認', '作業報告書作成', '予定変更申請'],
    color: 'bg-cyan-500',
    icon: '💼'
  },
  {
    id: 'sato_jiro',
    name: '佐藤 次郎',
    role: '営業担当',
    department: '営業部',
    permissions: ['自分のスケジュール確認', '作業進捗登録', 'チャット機能'],
    color: 'bg-orange-500',
    icon: '👨‍💼'
  },
  {
    id: 'yamada_aiko',
    name: '山田 愛子',
    role: '経理担当',
    department: '経理部',
    permissions: ['請求書作成', '入金管理', '財務分析'],
    color: 'bg-purple-500',
    icon: '👩‍💼'
  },
  {
    id: 'kimura_kenta',
    name: '木村 健太',
    role: 'マーケティング',
    department: 'マーケティング部',
    permissions: ['キャンペーン管理', 'Web分析', 'SEO対策'],
    color: 'bg-green-500',
    icon: '📊'
  },
  {
    id: 'tanaka_saburo',
    name: '田中 三郎',
    role: '施工管理',
    department: '施工部',
    permissions: ['現場管理', '作業指示', '品質管理'],
    color: 'bg-orange-600',
    icon: '👷‍♂️'
  },
  {
    id: 'takahashi_hanako',
    name: '高橋 花子',
    role: '事務員',
    department: '事務部',
    permissions: ['資料作成', '電話対応', 'スケジュール管理'],
    color: 'bg-purple-600',
    icon: '👩‍💼'
  },
  {
    id: 'nakamura_jiro',
    name: '中村 次郎',
    role: 'アフター担当',
    department: 'アフターサービス部',
    permissions: ['アフター対応', '顧客フォロー', '修理依頼管理'],
    color: 'bg-blue-600',
    icon: '🔧'
  }
];

export default function LoginPage() {
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 既にログインしているかチェック
    const user = localStorage.getItem('currentUser');
    if (user) {
      const parsedUser = JSON.parse(user);
      // 役割に応じてリダイレクト
      if (parsedUser.role === '経営者' || parsedUser.role === 'システム管理') {
        router.push('/contractor');
      } else {
        router.push('/subcontractor');
      }
    }
  }, [router]);

  const handleQuickLogin = (user: UserRole) => {
    // ローカルストレージにユーザー情報を保存
    localStorage.setItem('currentUser', JSON.stringify(user));

    // 役割に応じてリダイレクト
    if (user.role === '経営者' || user.role === 'システム管理') {
      router.push('/contractor'); // 元請けダッシュボード
    } else {
      router.push('/subcontractor'); // 下請けダッシュボード
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 手動ログインの処理（実際のAPIと連携）
    console.log('Manual login:', { username, password });
    // TODO: API認証実装
    alert('手動ログイン機能は準備中です。クイックログインをご利用ください。');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🚀 デモ用クイックログイン
          </h1>
          <p className="text-xl text-gray-600">
            役割を選択してシステムにアクセス
          </p>
        </div>

        {/* クイックログインカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {predefinedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
              onClick={() => handleQuickLogin(user)}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 ${user.color} rounded-full flex items-center justify-center text-white text-xl`}>
                  {user.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">
                    {user.name}
                  </h3>
                  <p className="text-blue-600 font-medium text-sm mb-1">
                    {user.role}
                  </p>
                  {user.department && (
                    <p className="text-gray-600 text-sm mb-2">
                      {user.department}
                    </p>
                  )}
                  <div className="space-y-1">
                    <p className="text-xs text-gray-500 font-medium">権限:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.permissions.slice(0, 3).map((permission, index) => (
                        <span
                          key={index}
                          className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                        >
                          {permission}
                        </span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                          +{user.permissions.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 手動ログイン切り替え */}
        <div className="text-center">
          <button
            onClick={() => setShowManualLogin(!showManualLogin)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {showManualLogin ? 'クイックログインに戻る' : '手動ログインを使用'}
          </button>
        </div>

        {/* 手動ログインフォーム */}
        {showManualLogin && (
          <div className="mt-8 max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                ログイン
              </h2>
              <form onSubmit={handleManualLogin} className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    ユーザー名
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="ユーザー名を入力"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    パスワード
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="パスワードを入力"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  ログイン
                </button>
              </form>
            </div>
          </div>
        )}

        {/* フッター */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>© 2024 FCFS工事予約システム - デモ環境</p>
          <p className="mt-1">
            本画面はデモ用です。実際の運用では適切な認証システムを使用してください。
          </p>
        </div>
      </div>
    </div>
  );
}