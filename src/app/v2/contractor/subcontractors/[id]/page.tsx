'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';

interface SubcontractorDetail {
  id: string;
  code: string;
  company_name: string;
  representative_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  trades: string[];
  certifications: string[];
  service_areas: {
    prefectures: string[];
    cities: string[];
  };
}

interface EvaluationStats {
  overall_avg: number;
  self_avg: number;
  schedule_avg: number;
  safety_avg: number;
  quality_avg: number;
  cost_avg: number;
  self_schedule_avg: number;
  self_safety_avg: number;
  self_quality_avg: number;
  self_cost_avg: number;
  total_evaluations: number;
  self_evaluations: number;
}

interface JobHistory {
  id: string;
  work_date: string;
  job_title: string;
  project_name: string;
  trade: string;
  evaluation?: {
    schedule_rating: number | null;
    safety_rating: number | null;
    quality_rating: number | null;
    cost_rating: number | null;
    comment: string | null;
    evaluated_at: string;
  };
}

interface MonthlyInfo {
  id: string;
  report_month: string;
  trades: string[];
  service_areas: {
    prefectures: string[];
    cities: string[];
  };
  availability_start: string | null;
  availability_end: string | null;
  certifications: string[];
  capacity: {
    teams: number;
    workers_per_team: number;
    notes: string;
  };
}

// デモ用：選択可能なテナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

export default function SubcontractorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const subcontractorId = params.id as string;
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [subcontractor, setSubcontractor] = useState<SubcontractorDetail | null>(null);
  const [evalStats, setEvalStats] = useState<EvaluationStats | null>(null);
  const [jobHistory, setJobHistory] = useState<JobHistory[]>([]);
  const [monthlyInfo, setMonthlyInfo] = useState<MonthlyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'monthly'>('overview');

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 業者基本情報
      const { data: subData, error: subError } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('id', subcontractorId)
        .single();

      if (subError) {
        console.error('Subcontractor error:', subError);
        router.push('/v2/contractor/subcontractors');
        return;
      }

      setSubcontractor({
        id: subData.id,
        code: subData.code,
        company_name: subData.company_name,
        representative_name: subData.representative_name,
        address: subData.address,
        phone: subData.phone,
        email: subData.email,
        trades: subData.trades || [],
        certifications: subData.certifications || [],
        service_areas: subData.service_areas || { prefectures: [], cities: [] },
      });

      // 全評価を取得
      const { data: allEvaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('subcontractor_id', subcontractorId);

      if (!evalError && allEvaluations) {
        const selfEvals = allEvaluations.filter((e) => e.tenant_id === selectedTenant.id);

        const calcAvg = (evals: any[], field: string) => {
          const vals = evals.map((e) => e[field]).filter((v) => v !== null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };

        const schedule_avg = calcAvg(allEvaluations, 'schedule_rating');
        const safety_avg = calcAvg(allEvaluations, 'safety_rating');
        const quality_avg = calcAvg(allEvaluations, 'quality_rating');
        const cost_avg = calcAvg(allEvaluations, 'cost_rating');

        const self_schedule_avg = calcAvg(selfEvals, 'schedule_rating');
        const self_safety_avg = calcAvg(selfEvals, 'safety_rating');
        const self_quality_avg = calcAvg(selfEvals, 'quality_rating');
        const self_cost_avg = calcAvg(selfEvals, 'cost_rating');

        setEvalStats({
          overall_avg: Math.round(((schedule_avg + safety_avg + quality_avg + cost_avg) / 4) * 10) / 10,
          self_avg: selfEvals.length > 0
            ? Math.round(((self_schedule_avg + self_safety_avg + self_quality_avg + self_cost_avg) / 4) * 10) / 10
            : 0,
          schedule_avg: Math.round(schedule_avg * 10) / 10,
          safety_avg: Math.round(safety_avg * 10) / 10,
          quality_avg: Math.round(quality_avg * 10) / 10,
          cost_avg: Math.round(cost_avg * 10) / 10,
          self_schedule_avg: Math.round(self_schedule_avg * 10) / 10,
          self_safety_avg: Math.round(self_safety_avg * 10) / 10,
          self_quality_avg: Math.round(self_quality_avg * 10) / 10,
          self_cost_avg: Math.round(self_cost_avg * 10) / 10,
          total_evaluations: allEvaluations.length,
          self_evaluations: selfEvals.length,
        });
      }

      // 取引履歴（自社テナントのみ）
      const { data: slotsData, error: slotsError } = await supabase
        .from('job_slots')
        .select(`
          id,
          work_date,
          job_post:job_posts!inner(
            title,
            trade,
            project:projects!inner(name)
          )
        `)
        .eq('tenant_id', selectedTenant.id)
        .eq('assigned_subcontractor_id', subcontractorId)
        .eq('status', 'completed')
        .order('work_date', { ascending: false });

      if (!slotsError && slotsData) {
        // 各スロットの評価を取得
        const history: JobHistory[] = [];
        for (const slot of slotsData) {
          const { data: evalData } = await supabase
            .from('evaluations')
            .select('*')
            .eq('job_slot_id', slot.id)
            .eq('tenant_id', selectedTenant.id)
            .single();

          history.push({
            id: slot.id,
            work_date: slot.work_date,
            job_title: (slot.job_post as any).title,
            project_name: (slot.job_post as any).project.name,
            trade: (slot.job_post as any).trade,
            evaluation: evalData
              ? {
                  schedule_rating: evalData.schedule_rating,
                  safety_rating: evalData.safety_rating,
                  quality_rating: evalData.quality_rating,
                  cost_rating: evalData.cost_rating,
                  comment: evalData.comment,
                  evaluated_at: evalData.evaluated_at,
                }
              : undefined,
          });
        }
        setJobHistory(history);
      }

      // 月次情報（最新）
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .order('report_month', { ascending: false })
        .limit(1)
        .single();

      if (!monthlyError && monthlyData) {
        setMonthlyInfo({
          id: monthlyData.id,
          report_month: monthlyData.report_month,
          trades: monthlyData.trades || [],
          service_areas: monthlyData.service_areas || { prefectures: [], cities: [] },
          availability_start: monthlyData.availability_start,
          availability_end: monthlyData.availability_end,
          certifications: monthlyData.certifications || [],
          capacity: monthlyData.capacity || { teams: 0, workers_per_team: 0, notes: '' },
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subcontractorId) {
      fetchData();
    }
  }, [subcontractorId, selectedTenant]);

  // 評価バー
  const RatingBar = ({ value, label, maxWidth = true }: { value: number; label: string; maxWidth?: boolean }) => (
    <div className={`flex items-center gap-2 ${maxWidth ? '' : 'w-full'}`}>
      <span className="w-20 text-sm text-gray-600">{label}</span>
      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 rounded-full transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-10 text-right font-medium text-sm">{value.toFixed(1)}</span>
    </div>
  );

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

  if (!subcontractor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">業者が見つかりません</p>
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
                onClick={() => router.push('/v2/contractor/subcontractors')}
                className="text-gray-500 hover:text-gray-700"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{subcontractor.company_name}</h1>
                <p className="text-sm text-gray-500">{subcontractor.code}</p>
              </div>
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
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* タブ */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="flex gap-4">
            {[
              { key: 'overview', label: '概要・評価' },
              { key: 'history', label: '取引履歴' },
              { key: 'monthly', label: '月次情報' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`pb-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 概要・評価タブ */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 基本情報 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-500">会社名</dt>
                  <dd className="font-medium">{subcontractor.company_name}</dd>
                </div>
                {subcontractor.representative_name && (
                  <div>
                    <dt className="text-sm text-gray-500">代表者</dt>
                    <dd>{subcontractor.representative_name}</dd>
                  </div>
                )}
                {subcontractor.address && (
                  <div>
                    <dt className="text-sm text-gray-500">住所</dt>
                    <dd>{subcontractor.address}</dd>
                  </div>
                )}
                {subcontractor.phone && (
                  <div>
                    <dt className="text-sm text-gray-500">電話</dt>
                    <dd>{subcontractor.phone}</dd>
                  </div>
                )}
                {subcontractor.email && (
                  <div>
                    <dt className="text-sm text-gray-500">メール</dt>
                    <dd>{subcontractor.email}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-gray-500">対応職種</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {subcontractor.trades.map((trade) => (
                      <span key={trade} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {trade}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">対応エリア</dt>
                  <dd>{subcontractor.service_areas.prefectures.join(', ') || '-'}</dd>
                </div>
                {subcontractor.certifications.length > 0 && (
                  <div>
                    <dt className="text-sm text-gray-500">保有資格</dt>
                    <dd className="flex flex-wrap gap-1 mt-1">
                      {subcontractor.certifications.map((cert) => (
                        <span key={cert} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                          {cert}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* 評価 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">評価</h2>
              {evalStats && evalStats.total_evaluations > 0 ? (
                <div className="space-y-6">
                  {/* 全体評価 */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-3xl font-bold text-yellow-600">★{evalStats.overall_avg}</span>
                      <span className="text-sm text-gray-500">全体平均 ({evalStats.total_evaluations}件)</span>
                    </div>
                    <div className="space-y-2">
                      <RatingBar value={evalStats.schedule_avg} label="工程遵守" />
                      <RatingBar value={evalStats.safety_avg} label="安全管理" />
                      <RatingBar value={evalStats.quality_avg} label="品質" />
                      <RatingBar value={evalStats.cost_avg} label="コスト" />
                    </div>
                  </div>

                  {/* 自社評価 */}
                  {evalStats.self_evaluations > 0 && (
                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl font-bold text-blue-600">★{evalStats.self_avg}</span>
                        <span className="text-sm text-gray-500">自社評価 ({evalStats.self_evaluations}件)</span>
                      </div>
                      <div className="space-y-2">
                        <RatingBar value={evalStats.self_schedule_avg} label="工程遵守" />
                        <RatingBar value={evalStats.self_safety_avg} label="安全管理" />
                        <RatingBar value={evalStats.self_quality_avg} label="品質" />
                        <RatingBar value={evalStats.self_cost_avg} label="コスト" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">評価はまだありません</p>
              )}
            </div>
          </div>
        )}

        {/* 取引履歴タブ */}
        {activeTab === 'history' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">自社との取引履歴 ({jobHistory.length}件)</h2>
            </div>
            <div className="p-6">
              {jobHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-8">取引履歴はありません</p>
              ) : (
                <div className="space-y-4">
                  {jobHistory.map((job) => (
                    <div key={job.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{job.job_title}</h3>
                          <p className="text-sm text-gray-600">{job.project_name}</p>
                          <div className="mt-1 flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-gray-100 rounded">{job.trade}</span>
                            <span className="px-2 py-1 bg-gray-100 rounded">{job.work_date}</span>
                          </div>
                        </div>
                        {job.evaluation && (
                          <div className="text-right">
                            <div className="flex items-center gap-1">
                              {['schedule_rating', 'safety_rating', 'quality_rating', 'cost_rating'].map((key) => (
                                <span key={key} className="text-yellow-500">
                                  ★{(job.evaluation as any)[key] || '-'}
                                </span>
                              ))}
                            </div>
                            {job.evaluation.comment && (
                              <p className="text-xs text-gray-600 mt-1 max-w-xs text-right">
                                {job.evaluation.comment}
                              </p>
                            )}
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

        {/* 月次情報タブ */}
        {activeTab === 'monthly' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">月次情報</h2>
            </div>
            <div className="p-6">
              {monthlyInfo ? (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      最終更新: {new Date(monthlyInfo.report_month).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">稼働可能期間</h3>
                      <p className="text-gray-600">
                        {monthlyInfo.availability_start && monthlyInfo.availability_end
                          ? `${monthlyInfo.availability_start} 〜 ${monthlyInfo.availability_end}`
                          : '未設定'}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">キャパシティ</h3>
                      <p className="text-gray-600">
                        {monthlyInfo.capacity.teams > 0
                          ? `${monthlyInfo.capacity.teams}班 × ${monthlyInfo.capacity.workers_per_team}名`
                          : '未設定'}
                      </p>
                      {monthlyInfo.capacity.notes && (
                        <p className="text-sm text-gray-500 mt-1">{monthlyInfo.capacity.notes}</p>
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">対応可能職種</h3>
                      <div className="flex flex-wrap gap-1">
                        {monthlyInfo.trades.length > 0
                          ? monthlyInfo.trades.map((trade) => (
                              <span key={trade} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {trade}
                              </span>
                            ))
                          : <span className="text-gray-500">未設定</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">対応可能エリア</h3>
                      <p className="text-gray-600">
                        {monthlyInfo.service_areas.prefectures.length > 0
                          ? monthlyInfo.service_areas.prefectures.join(', ')
                          : '未設定'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">月次情報はまだ登録されていません</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
