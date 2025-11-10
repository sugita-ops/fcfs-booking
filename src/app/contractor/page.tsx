'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProjectForm from '@/components/ProjectForm';
import SlotForm from '@/components/SlotForm';
import SubcontractorForm from '@/components/SubcontractorForm';
import SearchFilterForm from '@/components/SearchFilterForm';
import { getSlots, SearchParams, MockJobSlotWithPost } from '@/lib/mock-data';

export const dynamic = 'force-dynamic';

interface Project {
  id: string;
  name: string;
  location: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  startDate: string;
  endDate: string;
  budget: number;
  actualCost: number;
  progress: number;
  subcontractors: string[];
  manager: string;
}

interface JobSlot {
  id: string;
  projectId: string;
  projectName: string;
  trade: string;
  workDate: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  assignedCompany: string | null;
  unitPrice: number;
  description: string;
}

interface ContractorStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  openSlots: number;
  assignedSlots: number;
  totalRevenue: number;
}

export default function ContractorDashboard() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'slots' | 'subcontractors' | 'integrations'>('overview');
  const [stats, setStats] = useState<ContractorStats | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [jobSlots, setJobSlots] = useState<MockJobSlotWithPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [showSubcontractorForm, setShowSubcontractorForm] = useState(false);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useState<SearchParams>({});
  const router = useRouter();

  useEffect(() => {
    // ユーザー情報の確認
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(user);
    setCurrentUser(parsedUser);

    // 元請け権限チェック
    if (parsedUser.type !== 'contractor') {
      router.push('/subcontractor');
      return;
    }

    loadContractorData();
  }, [router]);

  const loadContractorData = async (params: SearchParams = {}) => {
    setLoading(true);

    // localStorageからプロジェクト読み込み
    const savedProjects = localStorage.getItem('projects');
    const loadedProjects: Project[] = savedProjects ? JSON.parse(savedProjects) : [];

    // デフォルトダミーデータ（プロジェクトが0件の場合のみ）
    const dummyProjects: Project[] = loadedProjects.length > 0 ? [] : [
      {
        id: 'proj-1',
        name: '新宿オフィスビル建設',
        location: '東京都新宿区',
        status: 'in_progress',
        startDate: '2024-11-01',
        endDate: '2025-03-31',
        budget: 15000000,
        actualCost: 8500000,
        progress: 65,
        subcontractors: ['基礎工事(株)', '鉄筋工業', '電気設備'],
        manager: '山田 太郎'
      },
      {
        id: 'proj-2',
        name: '渋谷マンション改修',
        location: '東京都渋谷区',
        status: 'planning',
        startDate: '2024-12-15',
        endDate: '2025-02-28',
        budget: 8000000,
        actualCost: 0,
        progress: 0,
        subcontractors: ['内装工事(有)', '配管工業'],
        manager: '鈴木 一郎'
      },
      {
        id: 'proj-3',
        name: '品川駅前店舗建設',
        location: '東京都品川区',
        status: 'completed',
        startDate: '2024-08-01',
        endDate: '2024-10-31',
        budget: 12000000,
        actualCost: 11200000,
        progress: 100,
        subcontractors: ['総合建設', '看板工事'],
        manager: '佐藤 次郎'
      }
    ];

    const allProjects = [...loadedProjects, ...dummyProjects];

    // 統計情報を計算
    const activeProjects = allProjects.filter(p => p.status === 'in_progress').length;
    const completedProjects = allProjects.filter(p => p.status === 'completed').length;
    const totalBudget = allProjects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalSpent = allProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0);

    const dummyStats: ContractorStats = {
      totalProjects: allProjects.length,
      activeProjects,
      completedProjects,
      totalBudget,
      totalSpent,
      openSlots: 12,
      assignedSlots: 25,
      totalRevenue: totalSpent
    };

    // モックデータから工事スロット取得
    const slots = getSlots(params);

    setStats(dummyStats);
    setProjects(allProjects);
    setJobSlots(slots);
    setLoading(false);
  };

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
    loadContractorData(params);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'on_hold': return 'bg-red-100 text-red-800';
      case 'open': return 'bg-orange-100 text-orange-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'planning': return '計画中';
      case 'in_progress': return '進行中';
      case 'completed': return '完了';
      case 'on_hold': return '保留';
      case 'open': return '募集中';
      case 'assigned': return '割当済';
      case 'cancelled': return 'キャンセル';
      default: return '不明';
    }
  };

  const logout = () => {
    localStorage.removeItem('currentUser');
    router.push('/');
  };

  // プロジェクト関連のハンドラー
  const handleProjectSubmit = (projectData: any) => {
    const newProject = {
      ...projectData,
      id: `proj-${Date.now()}`,
      actualCost: 0,
      progress: 0
    };
    setProjects([...projects, newProject]);
    alert('プロジェクトが作成されました！');
  };

  // スロット関連のハンドラー
  const handleSlotSubmit = (slotData: any) => {
    const newSlot = {
      ...slotData,
      id: `slot-${Date.now()}`,
      status: 'open' as const,
      assignedCompany: null
    };
    setJobSlots([...jobSlots, newSlot]);
    alert('工事スロットが作成されました！');
  };

  // 下請け業者関連のハンドラー
  const handleSubcontractorSubmit = (subcontractorData: any) => {
    const newSubcontractor = {
      ...subcontractorData,
      id: `sub-${Date.now()}`,
      rating: 0,
      completedJobs: 0,
      status: 'pending' as const
    };
    setSubcontractors([...subcontractors, newSubcontractor]);
    alert('下請け業者が登録されました！審査後に承認されます。');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー - モバイル対応 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* モバイル: タイトルのみ */}
            <div className="flex items-center space-x-2 md:space-x-4">
              <h1 className="text-base md:text-2xl font-bold text-gray-900">
                🏗️ ダンドリブッキング
              </h1>
              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
                  <span className="font-medium">{currentUser.name}</span>
                  <span>({currentUser.role})</span>
                </div>
              )}
            </div>

            {/* デスクトップ: 全ボタン表示 */}
            <div className="hidden md:flex items-center space-x-4">
              <button
                onClick={() => router.push('/subcontractor')}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                下請けビュー
              </button>
              <button
                onClick={logout}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* タブナビゲーション */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'overview', label: '概要', icon: '📊' },
                { key: 'projects', label: 'プロジェクト管理', icon: '🏗️' },
                { key: 'slots', label: '工事スロット管理', icon: '📅' },
                { key: 'subcontractors', label: '下請け業者', icon: '🤝' },
                { key: 'integrations', label: 'API連携', icon: '🔗' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* 概要タブ */}
        {activeTab === 'overview' && stats && (
          <div className="space-y-8">
            {/* 統計カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">🏗️</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">総プロジェクト数</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">⚡</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">進行中プロジェクト</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.activeProjects}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">¥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">総予算</p>
                    <p className="text-2xl font-semibold text-gray-900">¥{(stats.totalBudget / 1000000).toFixed(0)}M</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                      <span className="text-white text-sm">📅</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">募集中スロット</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.openSlots}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近のプロジェクト */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">最近のプロジェクト</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {projects.slice(0, 3).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{project.name}</h4>
                        <p className="text-sm text-gray-600">{project.location}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                            {getStatusText(project.status)}
                          </span>
                          <span className="text-xs text-gray-500">進捗: {project.progress}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">¥{(project.budget / 1000000).toFixed(1)}M</p>
                        <p className="text-xs text-gray-500">予算</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* プロジェクト管理タブ */}
        {activeTab === 'projects' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">プロジェクト一覧</h3>
              <button
                onClick={() => setShowProjectForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                新規プロジェクト作成
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      プロジェクト名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      期間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      予算
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      進捗
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      担当者
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">{project.location}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.startDate} 〜 {project.endDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ¥{project.budget.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                          <span className="ml-2 text-sm text-gray-600">{project.progress}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {project.manager}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">編集</button>
                        <button className="text-green-600 hover:text-green-900">詳細</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 工事スロット管理タブ */}
        {activeTab === 'slots' && (
          <div className="space-y-6">
            {/* 検索フィルタフォーム */}
            <SearchFilterForm onSearch={handleSearch} initialParams={searchParams} />

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">工事スロット管理 ({jobSlots.length}件)</h3>
                <button
                  onClick={() => setShowSlotForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  新規スロット作成
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        プロジェクト
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        職種
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        作業日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        割当業者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        単価
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {jobSlots.map((slot) => (
                      <tr key={slot.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{slot.project.name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.job_post.trade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.work_date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(slot.status)}`}>
                            {getStatusText(slot.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.claimed_by_company || '未割当'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ¥{slot.job_post.unit_price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button className="text-blue-600 hover:text-blue-900 mr-3">編集</button>
                          <button className="text-red-600 hover:text-red-900">削除</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 下請け業者タブ */}
        {activeTab === 'subcontractors' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">登録下請け業者</h3>
              <button
                onClick={() => setShowSubcontractorForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                新規業者登録
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {['基礎工事(株)', '鉄筋工業', '電気設備', '内装工事(有)', '配管工業', '総合建設'].map((company, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">{company}</h4>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>評価: ⭐⭐⭐⭐⭐ (4.8)</p>
                      <p>完了案件: {Math.floor(Math.random() * 50) + 10}件</p>
                      <p>専門: {['基礎工事', '鉄筋工事', '電気工事', '内装工事', '配管工事', '総合建設'][index]}</p>
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <button className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors">
                        詳細
                      </button>
                      <button className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors">
                        連絡
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* API連携タブ */}
        {activeTab === 'integrations' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">外部システム連携</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ダンドリワーク API 連携カード */}
                <div
                  onClick={() => router.push('/contractor/integrations/dandori-work')}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">🔗</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        ダンドリワーク API 連携
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        ダンドリワークから現場情報を自動取得し、プロジェクトとして同期します。
                      </p>
                      <div className="flex items-center text-sm text-blue-600">
                        <span>設定画面を開く →</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 将来の連携候補（プレースホルダー） */}
                <div className="border border-gray-200 rounded-lg p-6 opacity-50 cursor-not-allowed">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span className="text-2xl">📊</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        その他の連携
                      </h4>
                      <p className="text-sm text-gray-600 mb-4">
                        今後、他の外部システムとの連携を追加予定です。
                      </p>
                      <div className="flex items-center text-sm text-gray-400">
                        <span>準備中</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* フォームモーダル */}
        <ProjectForm
          isOpen={showProjectForm}
          onClose={() => setShowProjectForm(false)}
          onSubmit={handleProjectSubmit}
        />

        <SlotForm
          isOpen={showSlotForm}
          onClose={() => setShowSlotForm(false)}
          onSubmit={handleSlotSubmit}
          projects={projects.map(p => ({ id: p.id, name: p.name }))}
        />

        <SubcontractorForm
          isOpen={showSubcontractorForm}
          onClose={() => setShowSubcontractorForm(false)}
          onSubmit={handleSubcontractorSubmit}
        />
      </div>
    </div>
  );
}