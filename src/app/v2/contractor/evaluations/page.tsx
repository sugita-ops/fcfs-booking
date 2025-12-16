'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyEvaluationReceived } from '@/lib/notifications/client';

interface EvaluationWithDetails {
  id: string;
  schedule_rating: number | null;
  safety_rating: number | null;
  quality_rating: number | null;
  cost_rating: number | null;
  comment: string | null;
  evaluated_at: string;
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

interface CompletionReportForEvaluation {
  id: string;
  job_slot_id: string;
  completion_date: string;
  summary: string;
  subcontractor_id: string;
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

// 星評価コンポーネント
function StarRating({
  value,
  onChange,
  label,
  readonly = false,
}: {
  value: number;
  onChange?: (val: number) => void;
  label: string;
  readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-700 w-20">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => !readonly && onChange?.(star)}
            disabled={readonly}
            className={`text-2xl ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
          >
            {star <= value ? '★' : '☆'}
          </button>
        ))}
      </div>
      <span className="text-sm text-gray-500 ml-2">{value}/5</span>
    </div>
  );
}

export default function ContractorEvaluationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportIdParam = searchParams.get('report_id');
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [evaluations, setEvaluations] = useState<EvaluationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 評価フォーム
  const [showEvaluationForm, setShowEvaluationForm] = useState(false);
  const [targetReport, setTargetReport] = useState<CompletionReportForEvaluation | null>(null);
  const [evaluationForm, setEvaluationForm] = useState({
    schedule_rating: 3,
    safety_rating: 3,
    quality_rating: 3,
    cost_rating: 3,
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 評価一覧取得
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          id,
          schedule_rating,
          safety_rating,
          quality_rating,
          cost_rating,
          comment,
          evaluated_at,
          subcontractor:subcontractors!inner(
            id,
            company_name
          ),
          job_slot:job_slots!inner(
            id,
            work_date,
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
        .eq('tenant_id', selectedTenant.id)
        .order('evaluated_at', { ascending: false });

      if (error) {
        console.error('Evaluations error:', error);
      } else {
        // データ整形
        const formattedEvaluations = (data || []).map((ev: any) => ({
          id: ev.id,
          schedule_rating: ev.schedule_rating,
          safety_rating: ev.safety_rating,
          quality_rating: ev.quality_rating,
          cost_rating: ev.cost_rating,
          comment: ev.comment,
          evaluated_at: ev.evaluated_at,
          subcontractor: {
            id: ev.subcontractor.id,
            company_name: ev.subcontractor.company_name,
          },
          job_slot: {
            id: ev.job_slot.id,
            work_date: ev.job_slot.work_date,
            job_post: {
              id: ev.job_slot.job_post.id,
              title: ev.job_slot.job_post.title,
              trade: ev.job_slot.job_post.trade,
            },
            project: {
              id: ev.job_slot.job_post.project.id,
              name: ev.job_slot.job_post.project.name,
            },
          },
        }));
        setEvaluations(formattedEvaluations);
      }

      // URLパラメータで完了報告IDが指定されている場合、評価フォームを開く
      if (reportIdParam) {
        const { data: reportData, error: reportError } = await supabase
          .from('completion_reports')
          .select(`
            id,
            job_slot_id,
            completion_date,
            summary,
            subcontractor_id,
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
          .eq('id', reportIdParam)
          .single();

        if (!reportError && reportData) {
          const formattedReport: CompletionReportForEvaluation = {
            id: reportData.id,
            job_slot_id: reportData.job_slot_id,
            completion_date: reportData.completion_date,
            summary: reportData.summary,
            subcontractor_id: reportData.subcontractor_id,
            subcontractor: {
              id: (reportData.subcontractor as any).id,
              company_name: (reportData.subcontractor as any).company_name,
            },
            job_slot: {
              id: (reportData.job_slot as any).id,
              work_date: (reportData.job_slot as any).work_date,
              job_post: {
                id: (reportData.job_slot as any).job_post.id,
                title: (reportData.job_slot as any).job_post.title,
                trade: (reportData.job_slot as any).job_post.trade,
              },
              project: {
                id: (reportData.job_slot as any).job_post.project.id,
                name: (reportData.job_slot as any).job_post.project.name,
              },
            },
          };
          setTargetReport(formattedReport);
          setShowEvaluationForm(true);
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenant, reportIdParam]);

  // 評価送信
  const handleSubmitEvaluation = async () => {
    if (!targetReport) return;

    setSubmitting(true);
    try {
      const { data: evalData, error } = await supabase.from('evaluations').insert({
        tenant_id: selectedTenant.id,
        completion_report_id: targetReport.id,
        subcontractor_id: targetReport.subcontractor_id,
        job_slot_id: targetReport.job_slot_id,
        schedule_rating: evaluationForm.schedule_rating,
        safety_rating: evaluationForm.safety_rating,
        quality_rating: evaluationForm.quality_rating,
        cost_rating: evaluationForm.cost_rating,
        comment: evaluationForm.comment || null,
        evaluated_at: new Date().toISOString(),
      }).select('id').single();

      if (error) throw error;

      // 完了報告を承認済みに更新
      await supabase
        .from('completion_reports')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', targetReport.id);

      // 通知送信
      await notifyEvaluationReceived({
        subcontractorId: targetReport.subcontractor_id,
        evaluationId: evalData?.id || '',
        jobTitle: targetReport.job_slot.job_post.title,
        projectName: targetReport.job_slot.project.name,
      });

      alert('評価を登録しました（通知を送信しました）');
      setShowEvaluationForm(false);
      setTargetReport(null);
      setEvaluationForm({
        schedule_rating: 3,
        safety_rating: 3,
        quality_rating: 3,
        cost_rating: 3,
        comment: '',
      });
      router.replace('/v2/contractor/evaluations');
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 平均評価計算
  const calcAverage = (ev: EvaluationWithDetails) => {
    const ratings = [ev.schedule_rating, ev.safety_rating, ev.quality_rating, ev.cost_rating].filter(
      (r) => r !== null
    ) as number[];
    if (ratings.length === 0) return 0;
    return (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">評価管理（元請け）</h1>
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
                onClick={() => router.push('/v2/contractor/completion-reports')}
                className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
              >
                完了報告管理
              </button>
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
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            ログイン中: <span className="font-bold">{selectedTenant.name}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">評価履歴 ({evaluations.length}件)</h2>
            </div>
            <div className="p-6">
              {evaluations.length === 0 ? (
                <p className="text-gray-500 text-center py-8">評価はありません</p>
              ) : (
                <div className="space-y-4">
                  {evaluations.map((ev) => (
                    <div key={ev.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg font-bold text-yellow-600">★ {calcAverage(ev)}</span>
                            <span className="text-sm text-gray-500">
                              評価日: {new Date(ev.evaluated_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                          <h3 className="font-semibold text-gray-900">{ev.job_slot.job_post.title}</h3>
                          <p className="text-sm text-gray-600">{ev.job_slot.project.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {ev.subcontractor.company_name}
                            </span>
                            <span className="px-2 py-1 bg-gray-100 rounded">{ev.job_slot.job_post.trade}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">作業日: {ev.job_slot.work_date}</span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">工程遵守: </span>
                              <span className="font-bold text-yellow-600">★{ev.schedule_rating || '-'}</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">安全管理: </span>
                              <span className="font-bold text-yellow-600">★{ev.safety_rating || '-'}</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">品質: </span>
                              <span className="font-bold text-yellow-600">★{ev.quality_rating || '-'}</span>
                            </div>
                            <div className="p-2 bg-gray-50 rounded">
                              <span className="text-gray-600">コスト: </span>
                              <span className="font-bold text-yellow-600">★{ev.cost_rating || '-'}</span>
                            </div>
                          </div>
                          {ev.comment && (
                            <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700">
                              <p className="font-medium text-gray-900 mb-1">コメント:</p>
                              {ev.comment}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 評価入力フォームモーダル */}
      {showEvaluationForm && targetReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">評価入力</h2>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="font-medium">{targetReport.job_slot.job_post.title}</p>
              <p className="text-sm text-gray-600">{targetReport.job_slot.project.name}</p>
              <p className="text-sm text-blue-600 mt-1">{targetReport.subcontractor.company_name}</p>
              <p className="text-sm text-gray-500">作業日: {targetReport.job_slot.work_date}</p>
              <p className="text-sm text-gray-500">完了日: {targetReport.completion_date}</p>
              {targetReport.summary && (
                <div className="mt-2 p-2 bg-white rounded border text-sm">
                  <p className="font-medium text-gray-700">報告内容:</p>
                  <p className="text-gray-600">{targetReport.summary}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 rounded-lg space-y-3">
                <StarRating
                  label="工程遵守"
                  value={evaluationForm.schedule_rating}
                  onChange={(v) => setEvaluationForm({ ...evaluationForm, schedule_rating: v })}
                />
                <StarRating
                  label="安全管理"
                  value={evaluationForm.safety_rating}
                  onChange={(v) => setEvaluationForm({ ...evaluationForm, safety_rating: v })}
                />
                <StarRating
                  label="品質"
                  value={evaluationForm.quality_rating}
                  onChange={(v) => setEvaluationForm({ ...evaluationForm, quality_rating: v })}
                />
                <StarRating
                  label="コスト"
                  value={evaluationForm.cost_rating}
                  onChange={(v) => setEvaluationForm({ ...evaluationForm, cost_rating: v })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">コメント</label>
                <textarea
                  value={evaluationForm.comment}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, comment: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="評価に関するコメントを入力してください"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowEvaluationForm(false);
                  setTargetReport(null);
                  router.replace('/v2/contractor/evaluations');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmitEvaluation}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? '送信中...' : '評価を登録'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
