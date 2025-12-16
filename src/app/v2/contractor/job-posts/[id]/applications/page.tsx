'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyApplicationApproved } from '@/lib/notifications/client';

interface ApplicationWithDetails {
  id: string;
  job_slot_id: string;
  applied_at: string;
  status: 'pending' | 'selected' | 'rejected' | 'withdrawn';
  notes: string | null;
  subcontractor: {
    id: string;
    company_name: string;
    trades: string[];
  };
  job_slot: {
    id: string;
    work_date: string;
  };
  // 評価情報
  overall_avg: number;
  self_avg: number;
  total_evaluations: number;
  self_evaluations: number;
  // 取引履歴
  total_jobs: number;
  self_jobs: number;
}

interface JobPostInfo {
  id: string;
  title: string;
  trade: string;
  project_name: string;
}

// デモ用テナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

export default function ApplicationsPage() {
  const router = useRouter();
  const params = useParams();
  const jobPostId = params.id as string;
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [jobPost, setJobPost] = useState<JobPostInfo | null>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 取引履歴モーダル
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedSubcontractor, setSelectedSubcontractor] = useState<ApplicationWithDetails | null>(null);
  const [jobHistory, setJobHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 案件情報取得
      const { data: postData, error: postError } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          trade,
          project:projects!inner(name)
        `)
        .eq('id', jobPostId)
        .single();

      if (postError) {
        console.error('Post error:', postError);
        router.push('/v2/contractor/job-posts');
        return;
      }

      setJobPost({
        id: postData.id,
        title: postData.title,
        trade: postData.trade,
        project_name: (postData.project as any).name,
      });

      // この案件のスロットを取得
      const { data: slots, error: slotsError } = await supabase
        .from('job_slots')
        .select('id, work_date')
        .eq('job_post_id', jobPostId);

      if (slotsError || !slots || slots.length === 0) {
        setApplications([]);
        setLoading(false);
        return;
      }

      const slotIds = slots.map((s) => s.id);

      // 応募一覧取得
      const { data: apps, error: appsError } = await supabase
        .from('slot_applications')
        .select(`
          id,
          job_slot_id,
          applied_at,
          status,
          notes,
          subcontractor:subcontractors!inner(id, company_name, trades)
        `)
        .in('job_slot_id', slotIds)
        .eq('status', 'pending')
        .order('applied_at', { ascending: true });

      if (appsError) {
        console.error('Apps error:', appsError);
        setApplications([]);
        setLoading(false);
        return;
      }

      // 各応募者の評価・取引情報を取得
      const appsWithDetails = await Promise.all(
        (apps || []).map(async (app: any) => {
          const subId = app.subcontractor.id;
          const slot = slots.find((s) => s.id === app.job_slot_id);

          // 全体評価
          const { data: allEvals } = await supabase
            .from('evaluations')
            .select('schedule_rating, safety_rating, quality_rating, cost_rating, tenant_id')
            .eq('subcontractor_id', subId);

          const selfEvals = (allEvals || []).filter((e: any) => e.tenant_id === selectedTenant.id);

          const calcAvg = (evals: any[]) => {
            if (evals.length === 0) return 0;
            const total = evals.reduce((sum, e) => {
              const ratings = [e.schedule_rating, e.safety_rating, e.quality_rating, e.cost_rating].filter(
                (r) => r !== null
              );
              return sum + (ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0);
            }, 0);
            return Math.round((total / evals.length) * 10) / 10;
          };

          // 取引回数
          const { count: totalJobs } = await supabase
            .from('job_slots')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_subcontractor_id', subId)
            .eq('status', 'completed');

          const { count: selfJobs } = await supabase
            .from('job_slots')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_subcontractor_id', subId)
            .eq('tenant_id', selectedTenant.id)
            .eq('status', 'completed');

          return {
            id: app.id,
            job_slot_id: app.job_slot_id,
            applied_at: app.applied_at,
            status: app.status,
            notes: app.notes,
            subcontractor: {
              id: app.subcontractor.id,
              company_name: app.subcontractor.company_name,
              trades: app.subcontractor.trades || [],
            },
            job_slot: {
              id: slot?.id || '',
              work_date: slot?.work_date || '',
            },
            overall_avg: calcAvg(allEvals || []),
            self_avg: calcAvg(selfEvals),
            total_evaluations: (allEvals || []).length,
            self_evaluations: selfEvals.length,
            total_jobs: totalJobs || 0,
            self_jobs: selfJobs || 0,
          };
        })
      );

      setApplications(appsWithDetails);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobPostId) {
      fetchData();
    }
  }, [jobPostId, selectedTenant]);

  // 取引履歴を表示
  const showHistory = async (app: ApplicationWithDetails) => {
    setSelectedSubcontractor(app);
    setShowHistoryModal(true);
    setHistoryLoading(true);

    try {
      const { data: history, error } = await supabase
        .from('job_slots')
        .select(`
          id,
          work_date,
          job_post:job_posts!inner(title, trade, project:projects!inner(name))
        `)
        .eq('tenant_id', selectedTenant.id)
        .eq('assigned_subcontractor_id', app.subcontractor.id)
        .eq('status', 'completed')
        .order('work_date', { ascending: false })
        .limit(10);

      if (!error) {
        // 各履歴の評価を取得
        const historyWithEval = await Promise.all(
          (history || []).map(async (h: any) => {
            const { data: evalData } = await supabase
              .from('evaluations')
              .select('schedule_rating, safety_rating, quality_rating, cost_rating, comment')
              .eq('job_slot_id', h.id)
              .eq('tenant_id', selectedTenant.id)
              .single();

            return {
              id: h.id,
              work_date: h.work_date,
              title: h.job_post.title,
              trade: h.job_post.trade,
              project_name: h.job_post.project.name,
              evaluation: evalData,
            };
          })
        );

        setJobHistory(historyWithEval);
      }
    } catch (error) {
      console.error('History error:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  // 割当実行
  const assignSubcontractor = async (app: ApplicationWithDetails) => {
    if (!confirm(`${app.subcontractor.company_name}にこのスロットを割り当てますか？`)) return;

    try {
      // スロットを割当済みに更新
      const { error: slotError } = await supabase
        .from('job_slots')
        .update({
          status: 'assigned',
          assigned_subcontractor_id: app.subcontractor.id,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', app.job_slot_id);

      if (slotError) throw slotError;

      // 応募を選定済みに更新
      const { error: appError } = await supabase
        .from('slot_applications')
        .update({ status: 'selected' })
        .eq('id', app.id);

      if (appError) throw appError;

      // 他の応募を却下
      await supabase
        .from('slot_applications')
        .update({ status: 'rejected' })
        .eq('job_slot_id', app.job_slot_id)
        .neq('id', app.id);

      // 通知送信
      if (jobPost) {
        await notifyApplicationApproved({
          subcontractorId: app.subcontractor.id,
          jobSlotId: app.job_slot_id,
          jobTitle: jobPost.title,
          projectName: jobPost.project_name,
          workDate: app.job_slot.work_date,
        });
      }

      alert('割当が完了しました（通知を送信しました）');
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
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
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/v2/contractor/job-posts')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">応募者選定</h1>
                {jobPost && (
                  <p className="text-sm text-gray-500">
                    {jobPost.title} - {jobPost.project_name}
                  </p>
                )}
              </div>
            </div>
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
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">応募一覧 ({applications.length}件)</h2>
          </div>
          <div className="p-6">
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">応募はありません</p>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {app.subcontractor.company_name}
                          </h3>
                          <span className="text-yellow-600 font-medium">★{app.overall_avg}</span>
                          <span className="text-xs text-gray-500">
                            ({app.total_evaluations}件)
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {app.subcontractor.trades.map((trade) => (
                            <span
                              key={trade}
                              className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                            >
                              {trade}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-gray-500 text-xs">作業日</p>
                            <p className="font-medium">{app.job_slot.work_date}</p>
                          </div>
                          <div className="p-2 bg-gray-50 rounded">
                            <p className="text-gray-500 text-xs">応募日時</p>
                            <p className="font-medium">
                              {new Date(app.applied_at).toLocaleString('ja-JP')}
                            </p>
                          </div>
                          <div className="p-2 bg-yellow-50 rounded">
                            <p className="text-gray-500 text-xs">全体評価</p>
                            <p className="font-medium text-yellow-600">★{app.overall_avg}</p>
                          </div>
                          <div className="p-2 bg-blue-50 rounded">
                            <p className="text-gray-500 text-xs">自社評価</p>
                            <p className="font-medium text-blue-600">
                              {app.self_evaluations > 0 ? `★${app.self_avg}` : '-'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          取引実績: 全体{app.total_jobs}件 / 自社{app.self_jobs}件
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col gap-2">
                        <button
                          onClick={() => assignSubcontractor(app)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          割当
                        </button>
                        <button
                          onClick={() => showHistory(app)}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                        >
                          取引履歴
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 取引履歴モーダル */}
      {showHistoryModal && selectedSubcontractor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">取引履歴</h2>
                <p className="text-sm text-gray-600">{selectedSubcontractor.subcontractor.company_name}</p>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {historyLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : jobHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">取引履歴はありません</p>
            ) : (
              <div className="space-y-3">
                {jobHistory.map((h) => (
                  <div key={h.id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{h.title}</p>
                        <p className="text-sm text-gray-600">{h.project_name}</p>
                        <div className="flex gap-2 mt-1 text-xs">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{h.trade}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{h.work_date}</span>
                        </div>
                      </div>
                      {h.evaluation && (
                        <div className="text-right">
                          <div className="flex gap-1 text-yellow-500 text-sm">
                            <span>工程★{h.evaluation.schedule_rating || '-'}</span>
                            <span>安全★{h.evaluation.safety_rating || '-'}</span>
                            <span>品質★{h.evaluation.quality_rating || '-'}</span>
                            <span>コスト★{h.evaluation.cost_rating || '-'}</span>
                          </div>
                          {h.evaluation.comment && (
                            <p className="text-xs text-gray-600 mt-1 max-w-xs">{h.evaluation.comment}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
