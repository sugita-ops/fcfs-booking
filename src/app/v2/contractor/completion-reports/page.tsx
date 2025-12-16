'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyReportRejected } from '@/lib/notifications/client';

interface CompletionReportWithDetails {
  id: string;
  job_slot_id: string;
  completion_date: string;
  summary: string;
  status: 'pending' | 'confirmed' | 'rejected';
  reported_at: string;
  confirmed_at: string | null;
  subcontractor: {
    id: string;
    company_name: string;
  };
  job_slot: {
    id: string;
    work_date: string;
    job_post: {
      id: string;
      title: string;
      trade: string;
    };
    project: {
      id: string;
      name: string;
    };
  };
}

// デモ用：選択可能なテナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

export default function ContractorCompletionReportsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [completionReports, setCompletionReports] = useState<CompletionReportWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'rejected'>('all');

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 完了報告取得（テナントに関連する工事スロットの報告）
      let query = supabase
        .from('completion_reports')
        .select(`
          id,
          job_slot_id,
          completion_date,
          summary,
          status,
          reported_at,
          confirmed_at,
          subcontractor:subcontractors!inner(
            id,
            company_name
          ),
          job_slot:job_slots!inner(
            id,
            work_date,
            tenant_id,
            job_post:job_posts!inner(
              id,
              title,
              trade,
              project:projects!inner(
                id,
                name
              )
            )
          )
        `)
        .eq('job_slot.tenant_id', selectedTenant.id)
        .order('reported_at', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error('Reports error:', error);
      } else {
        // データ整形
        const formattedReports = (data || []).map((report: any) => ({
          id: report.id,
          job_slot_id: report.job_slot_id,
          completion_date: report.completion_date,
          summary: report.summary,
          status: report.status,
          reported_at: report.reported_at,
          confirmed_at: report.confirmed_at,
          subcontractor: {
            id: report.subcontractor.id,
            company_name: report.subcontractor.company_name,
          },
          job_slot: {
            id: report.job_slot.id,
            work_date: report.job_slot.work_date,
            job_post: {
              id: report.job_slot.job_post.id,
              title: report.job_slot.job_post.title,
              trade: report.job_slot.job_post.trade,
            },
            project: {
              id: report.job_slot.job_post.project.id,
              name: report.job_slot.job_post.project.name,
            },
          },
        }));
        setCompletionReports(formattedReports);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenant]);

  // 完了報告承認
  const handleConfirm = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('completion_reports')
        .update({
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', reportId);

      if (error) throw error;

      alert('完了報告を承認しました');
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // 完了報告差し戻し
  const handleReject = async (reportId: string) => {
    const reason = prompt('差し戻し理由を入力してください');
    if (!reason) return;

    try {
      const { error } = await supabase
        .from('completion_reports')
        .update({
          status: 'rejected',
        })
        .eq('id', reportId);

      if (error) throw error;

      // 通知送信
      const report = completionReports.find((r) => r.id === reportId);
      if (report) {
        await notifyReportRejected({
          subcontractorId: report.subcontractor.id,
          reportId,
          jobTitle: report.job_slot.job_post.title,
          projectName: report.job_slot.project.name,
          reason,
        });
      }

      alert('完了報告を差し戻しました（通知を送信しました）');
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // フィルタリング
  const filteredReports = completionReports.filter((report) => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">確認待ち</span>;
      case 'confirmed':
        return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">承認済み</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">差し戻し</span>;
      default:
        return null;
    }
  };

  const pendingCount = completionReports.filter((r) => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">完了報告管理（元請け）</h1>
              <p className="text-sm text-gray-500 mt-1">v2 Supabase版</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedTenant.id}
                onChange={(e) => {
                  const tenant = DEMO_TENANTS.find((t) => t.id === e.target.value);
                  if (tenant) setSelectedTenant(tenant);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DEMO_TENANTS.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => router.push('/v2')}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                v2トップへ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 現在のユーザー表示 */}
        <div className="mb-6 p-4 bg-orange-50 rounded-lg flex justify-between items-center">
          <p className="text-sm text-orange-800">
            ログイン中: <span className="font-bold">{selectedTenant.name}</span>
          </p>
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-500 text-white rounded-full text-sm font-bold">
              {pendingCount}件の確認待ち
            </span>
          )}
        </div>

        {/* フィルタ */}
        <div className="mb-6 flex gap-2">
          {[
            { value: 'all', label: 'すべて' },
            { value: 'pending', label: '確認待ち' },
            { value: 'confirmed', label: '承認済み' },
            { value: 'rejected', label: '差し戻し' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">完了報告一覧 ({filteredReports.length}件)</h2>
            </div>
            <div className="p-6">
              {filteredReports.length === 0 ? (
                <p className="text-gray-500 text-center py-8">完了報告はありません</p>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-4 ${
                        report.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(report.status)}
                            <span className="text-sm text-gray-500">
                              報告日: {new Date(report.reported_at).toLocaleString('ja-JP')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{report.job_slot.job_post.title}</h3>
                          <p className="text-sm text-gray-600">{report.job_slot.project.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {report.subcontractor.company_name}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              {report.job_slot.job_post.trade}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              作業日: {report.job_slot.work_date}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded">
                              完了日: {report.completion_date}
                            </span>
                          </div>
                          {report.summary && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                              <p className="font-medium text-gray-900 mb-1">報告内容:</p>
                              {report.summary}
                            </div>
                          )}
                        </div>
                        {report.status === 'pending' && (
                          <div className="ml-4 flex flex-col gap-2">
                            <button
                              onClick={() => handleConfirm(report.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                            >
                              承認
                            </button>
                            <button
                              onClick={() => handleReject(report.id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                            >
                              差し戻し
                            </button>
                            <button
                              onClick={() => router.push(`/v2/contractor/evaluations?report_id=${report.id}`)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              評価入力
                            </button>
                          </div>
                        )}
                        {report.status === 'confirmed' && (
                          <div className="ml-4">
                            <button
                              onClick={() => router.push(`/v2/contractor/evaluations?report_id=${report.id}`)}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                            >
                              評価を見る
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
