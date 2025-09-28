'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface UserType {
  id: string;
  name: string;
  description: string;
  features: string[];
  color: string;
  icon: string;
  route: string;
}

const businessTypes: UserType[] = [
  {
    id: 'contractor',
    name: '元請け業者',
    description: '工事の発注・管理を行う総合管理業者',
    features: ['プロジェクト管理', '工事スロット作成', '下請け業者管理', '売上分析'],
    color: 'bg-blue-600',
    icon: '🏗️',
    route: '/contractor'
  },
  {
    id: 'subcontractor',
    name: '下請け業者',
    description: '工事を実際に施工する専門業者',
    features: ['工事スロット予約', '作業スケジュール管理', '予約履歴確認', '代替案検索'],
    color: 'bg-green-600',
    icon: '🔨',
    route: '/subcontractor'
  }
];

export default function LoginPage() {
  const [showManualLogin, setShowManualLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    // 既にログインしているかチェック
    const user = localStorage.getItem('currentUser');
    if (user) {
      const parsedUser = JSON.parse(user);
      // 業者タイプに応じてリダイレクト
      if (parsedUser.type === 'contractor') {
        router.push('/contractor');
      } else {
        router.push('/subcontractor');
      }
    }
  }, [router]);

  const handleBusinessTypeLogin = (businessType: UserType) => {
    // ユーザー情報を作成
    const user = {
      type: businessType.id,
      name: businessType.name,
      role: businessType.name,
      loginTime: new Date().toISOString()
    };

    // ローカルストレージにユーザー情報を保存
    localStorage.setItem('currentUser', JSON.stringify(user));

    // 選択した業者タイプに応じてリダイレクト
    router.push(businessType.route);
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
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            🏗️ FCFS工事予約システム
          </h1>
          <p className="text-2xl text-gray-600 mb-4">
            業者タイプを選択してシステムにアクセス
          </p>
          <p className="text-lg text-gray-500">
            先着順で工事スロットを効率的に管理
          </p>
        </div>

        {/* 業者タイプ選択カード */}
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {businessTypes.map((businessType) => (
              <div
                key={businessType.id}
                className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border border-gray-200 hover:border-blue-300"
                onClick={() => handleBusinessTypeLogin(businessType)}
              >
                <div className="text-center mb-6">
                  <div className={`w-20 h-20 ${businessType.color} rounded-full flex items-center justify-center text-white text-4xl mx-auto mb-4`}>
                    {businessType.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {businessType.name}
                  </h3>
                  <p className="text-gray-600 text-lg">
                    {businessType.description}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">主な機能:</p>
                  <div className="grid grid-cols-1 gap-2">
                    {businessType.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <div className={`inline-flex items-center px-4 py-2 ${businessType.color} text-white rounded-lg font-medium`}>
                    {businessType.name}でログイン →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

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