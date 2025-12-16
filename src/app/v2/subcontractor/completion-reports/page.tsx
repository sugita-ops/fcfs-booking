'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyReportSubmitted } from '@/lib/notifications/client';

interface JobSlotWithDetails {
  id: string;
  work_date: string;
  status: string;
  job_post: {
    id: string;
    title: string;
    trade: string;
    unit_price: number;
  };
  project: {
    id: string;
    name: string;
    address: string;
  };
  tenant: {
    id: string;
    name: string;
  };
}

interface CompletionReport {
  id: string;
  job_slot_id: string;
  completion_date: string;
  summary: string;
  status: 'pending' | 'confirmed' | 'rejected';
  reported_at: string;
}

// デモ用：選択可能な協力業者
const DEMO_SUBCONTRACTORS = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: '株式会社山田電気工事' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: '佐藤配管工業' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: '高橋内装株式会社' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: '伊藤塗装工業' },
  { id: 'a5555555-5555-5555-5555-555555555555', name: '渡辺基礎工事' },
];

export default function SubcontractorCompletionReportsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedSubcontractor, setSelectedSubcontractor] = useState(DEMO_SUBCONTRACTORS[0]);
  const [assignedSlots, setAssignedSlots] = useState<JobSlotWithDetails[]>([]);
  const [completionReports, setCompletionReports] = useState<CompletionReport[]>([]);
  const [loading, setLoading] = useState(true);

  // 完了報告フォーム
  const [showReportForm, setShowReportForm] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<JobSlotWithDetails | null>(null);
  const [reportForm, setReportForm] = useState({
    completion_date: new Date().toISOString().split('T')[0],
    summary: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 割当済みスロット取得
      const { data: slots, error: slotsError } = await supabase
        .from('job_slots')
        .select(`
          id,
          work_date,
          status,
          job_post:job_posts!inner(
            id,
            title,
            trade,
            unit_price,
            project:projects!inner(
              id,
              name,
              address,
              tenant:tenants!inner(id, name)
            )
          )
        `)
        .eq('assigned_subcontractor_id', selectedSubcontractor.id)
        .in('status', ['assigned', 'completed'])
        .order('work_date', { ascending: false });

      if (slotsError) {
        console.error('Slots error:', slotsError);
      } else {
        // データを整形
        const formattedSlots = (slots || []).map((slot: any) => ({
          id: slot.id,
          work_date: slot.work_date,
          status: slot.status,
          job_post: {
            id: slot.job_post.id,
            title: slot.job_post.title,
            trade: slot.job_post.trade,
            unit_price: slot.job_post.unit_price,
          },
          project: {
            id: slot.job_post.project.id,
            name: slot.job_post.project.name,
            address: slot.job_post.project.address,
          },
          tenant: {
            id: slot.job_post.project.tenant.id,
            name: slot.job_post.project.tenant.name,
          },
        }));
        setAssignedSlots(formattedSlots);
      }

      // 完了報告取得
      const { data: reports, error: reportsError } = await supabase
        .from('completion_reports')
        .select('*')
        .eq('subcontractor_id', selectedSubcontractor.id)
        .order('reported_at', { ascending: false });

      if (reportsError) {
        console.error('Reports error:', reportsError);
      } else {
        setCompletionReports(reports || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSubcontractor]);

  // 完了報告作成
  const handleSubmitReport = async () => {
    if (!selectedSlot) return;

    setSubmitting(true);
    try {
      const { data: reportData, error } = await supabase
        .from('completion_reports')
        .insert({
          job_slot_id: selectedSlot.id,
          subcontractor_id: selectedSubcontractor.id,
          completion_date: reportForm.completion_date,
          summary: reportForm.summary,
          status: 'pending',
          reported_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) throw error;

      // 元請けへ通知送信
      await notifyReportSubmitted({
        jobPostId: selectedSlot.job_post.id,
        reportId: reportData?.id || '',
        subcontractorName: selectedSubcontractor.name,
        jobTitle: selectedSlot.job_post.title,
        projectName: selectedSlot.project.name,
      });

      alert('完了報告を送信しました（通知を送信しました）');
      setShowReportForm(false);
      setSelectedSlot(null);
      setReportForm({ completion_date: new Date().toISOString().split('T')[0], summary: '' });
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 報告済みかチェック
  const hasReport = (slotId: string) => {
    return completionReports.some((r) => r.job_slot_id === slotId);
  };

  const getReportStatus = (slotId: string) => {
    const report = completionReports.find((r) => r.job_slot_id === slotId);
    return report?.status;
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">完了報告（協力業者）</h1>
              <p className="text-sm text-gray-500 mt-1">v2 Supabase版</p>
            </div>
            <div className="flex items-center gap-4">
              <select
                value={selectedSubcontractor.id}
                onChange={(e) => {
                  const sub = DEMO_SUBCONTRACTORS.find((s) => s.id === e.target.value);
                  if (sub) setSelectedSubcontractor(sub);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {DEMO_SUBCONTRACTORS.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
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
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            ログイン中: <span className="font-bold">{selectedSubcontractor.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 割当済み工事一覧 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">割当済み工事 ({assignedSlots.length}件)</h2>
              </div>
              <div className="p-6">
                {assignedSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">割当済みの工事はありません</p>
                ) : (
                  <div className="space-y-4">
                    {assignedSlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{slot.job_post.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{slot.project.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                              <span className="px-2 py-1 bg-gray-100 rounded">{slot.job_post.trade}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">{slot.work_date}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">{slot.project.address}</span>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                ¥{(slot.job_post.unit_price || 0).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">元請け: {slot.tenant.name}</p>
                          </div>
                          <div className="ml-4">
                            {hasReport(slot.id) ? (
                              <div className="text-right">
                                {getStatusBadge(getReportStatus(slot.id) || '')}
                                <p className="text-xs text-gray-500 mt-1">報告済み</p>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedSlot(slot);
                                  setShowReportForm(true);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                              >
                                完了報告
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 完了報告履歴 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">完了報告履歴 ({completionReports.length}件)</h2>
              </div>
              <div className="p-6">
                {completionReports.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">完了報告はありません</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            完了日
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            報告内容
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            ステータス
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            報告日時
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {completionReports.map((report) => (
                          <tr key={report.id}>
                            <td className="px-4 py-3 text-sm text-gray-900">{report.completion_date}</td>
                            <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                              {report.summary || '-'}
                            </td>
                            <td className="px-4 py-3">{getStatusBadge(report.status)}</td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {new Date(report.reported_at).toLocaleString('ja-JP')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 完了報告フォームモーダル */}
      {showReportForm && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">完了報告</h2>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{selectedSlot.job_post.title}</p>
              <p className="text-sm text-gray-600">{selectedSlot.project.name}</p>
              <p className="text-sm text-gray-500">作業日: {selectedSlot.work_date}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">完了日 *</label>
                <input
                  type="date"
                  value={reportForm.completion_date}
                  onChange={(e) => setReportForm({ ...reportForm, completion_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">報告内容</label>
                <textarea
                  value={reportForm.summary}
                  onChange={(e) => setReportForm({ ...reportForm, summary: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="作業内容、特記事項などを入力してください"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReportForm(false);
                  setSelectedSlot(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submitting || !reportForm.completion_date}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? '送信中...' : '報告を送信'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
