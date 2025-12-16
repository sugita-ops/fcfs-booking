'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';

interface SubcontractorWithStats {
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
  // 評価集計
  overall_avg: number;
  self_avg: number;
  schedule_avg: number;
  safety_avg: number;
  quality_avg: number;
  cost_avg: number;
  // 取引回数
  total_jobs: number;
  self_jobs: number;
  // 評価件数
  total_evaluations: number;
  self_evaluations: number;
}

// デモ用：選択可能なテナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

// 職種リスト（フィルタ用）
const TRADES = [
  '電気工事', '空調工事', '配管工事', '給排水工事', '内装工事',
  'クロス工事', '床工事', '塗装工事', '防水工事', '基礎工事',
  '土工事', 'コンクリート工事',
];

// エリアリスト（フィルタ用）
const PREFECTURES = ['東京都', '神奈川県', '埼玉県', '千葉県'];

export default function ContractorSubcontractorsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [subcontractors, setSubcontractors] = useState<SubcontractorWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // フィルタ
  const [filters, setFilters] = useState({
    trade: '',
    prefecture: '',
    minRating: 0,
    certification: '',
  });

  // ソート
  const [sortBy, setSortBy] = useState<'rating' | 'name' | 'jobs'>('rating');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ホバー中の業者ID（評価詳細表示用）
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // 指名追加モーダル
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [selectedSubForNomination, setSelectedSubForNomination] = useState<SubcontractorWithStats | null>(null);
  const [jobPostsForNomination, setJobPostsForNomination] = useState<{id: string; title: string; trade: string; project_name: string; nominated: boolean}[]>([]);
  const [nominationLoading, setNominationLoading] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 招待済み業者を取得
      const { data: invitedData, error: invitedError } = await supabase
        .from('tenant_subcontractors')
        .select(`
          subcontractor:subcontractors!inner(
            id,
            code,
            company_name,
            representative_name,
            address,
            phone,
            email,
            trades,
            certifications,
            service_areas
          )
        `)
        .eq('tenant_id', selectedTenant.id)
        .eq('status', 'active');

      if (invitedError) {
        console.error('Invited error:', invitedError);
        setSubcontractors([]);
        setLoading(false);
        return;
      }

      const subcontractorIds = (invitedData || []).map((d: any) => d.subcontractor.id);

      if (subcontractorIds.length === 0) {
        setSubcontractors([]);
        setLoading(false);
        return;
      }

      // 全評価を取得（全テナント）
      const { data: allEvaluations, error: evalError } = await supabase
        .from('evaluations')
        .select('*')
        .in('subcontractor_id', subcontractorIds);

      if (evalError) {
        console.error('Evaluations error:', evalError);
      }

      // 完了済み工事数を取得
      const { data: completedSlots, error: slotsError } = await supabase
        .from('job_slots')
        .select('id, tenant_id, assigned_subcontractor_id')
        .in('assigned_subcontractor_id', subcontractorIds)
        .eq('status', 'completed');

      if (slotsError) {
        console.error('Slots error:', slotsError);
      }

      // 業者ごとの集計
      const subcontractorsWithStats: SubcontractorWithStats[] = (invitedData || []).map((d: any) => {
        const sub = d.subcontractor;

        // 全体評価
        const allEvals = (allEvaluations || []).filter((e: any) => e.subcontractor_id === sub.id);
        // 自社評価
        const selfEvals = allEvals.filter((e: any) => e.tenant_id === selectedTenant.id);

        // 平均計算
        const calcAvg = (evals: any[], field: string) => {
          const vals = evals.map((e) => e[field]).filter((v) => v !== null);
          return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        };

        const schedule_avg = calcAvg(allEvals, 'schedule_rating');
        const safety_avg = calcAvg(allEvals, 'safety_rating');
        const quality_avg = calcAvg(allEvals, 'quality_rating');
        const cost_avg = calcAvg(allEvals, 'cost_rating');
        const overall_avg = (schedule_avg + safety_avg + quality_avg + cost_avg) / 4;

        const self_schedule = calcAvg(selfEvals, 'schedule_rating');
        const self_safety = calcAvg(selfEvals, 'safety_rating');
        const self_quality = calcAvg(selfEvals, 'quality_rating');
        const self_cost = calcAvg(selfEvals, 'cost_rating');
        const self_avg = selfEvals.length > 0 ? (self_schedule + self_safety + self_quality + self_cost) / 4 : 0;

        // 取引回数
        const allJobs = (completedSlots || []).filter((s: any) => s.assigned_subcontractor_id === sub.id);
        const selfJobs = allJobs.filter((s: any) => s.tenant_id === selectedTenant.id);

        return {
          id: sub.id,
          code: sub.code,
          company_name: sub.company_name,
          representative_name: sub.representative_name,
          address: sub.address,
          phone: sub.phone,
          email: sub.email,
          trades: sub.trades || [],
          certifications: sub.certifications || [],
          service_areas: sub.service_areas || { prefectures: [], cities: [] },
          overall_avg: Math.round(overall_avg * 10) / 10,
          self_avg: Math.round(self_avg * 10) / 10,
          schedule_avg: Math.round(schedule_avg * 10) / 10,
          safety_avg: Math.round(safety_avg * 10) / 10,
          quality_avg: Math.round(quality_avg * 10) / 10,
          cost_avg: Math.round(cost_avg * 10) / 10,
          total_jobs: allJobs.length,
          self_jobs: selfJobs.length,
          total_evaluations: allEvals.length,
          self_evaluations: selfEvals.length,
        };
      });

      setSubcontractors(subcontractorsWithStats);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenant]);

  // フィルタリング
  const filteredSubcontractors = subcontractors.filter((sub) => {
    if (filters.trade && !sub.trades.includes(filters.trade)) return false;
    if (filters.prefecture && !sub.service_areas.prefectures.includes(filters.prefecture)) return false;
    if (filters.minRating > 0 && sub.overall_avg < filters.minRating) return false;
    if (filters.certification && !sub.certifications.some((c) => c.includes(filters.certification))) return false;
    return true;
  });

  // ソート
  const sortedSubcontractors = [...filteredSubcontractors].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'rating':
        comparison = a.overall_avg - b.overall_avg;
        break;
      case 'name':
        comparison = a.company_name.localeCompare(b.company_name);
        break;
      case 'jobs':
        comparison = a.total_jobs - b.total_jobs;
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // 指名モーダルを開く
  const openNominationModal = async (sub: SubcontractorWithStats) => {
    setSelectedSubForNomination(sub);
    setShowNominationModal(true);
    setNominationLoading(true);

    try {
      // 募集中の案件を取得
      const { data: posts, error } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          trade,
          project:projects!inner(name)
        `)
        .eq('tenant_id', selectedTenant.id);

      if (!error && posts) {
        // 各案件の指名状況を確認
        const postsWithStatus = await Promise.all(
          posts.map(async (post: any) => {
            const { data: nomination } = await supabase
              .from('nominated_subcontractors')
              .select('id')
              .eq('job_post_id', post.id)
              .eq('subcontractor_id', sub.id)
              .single();

            return {
              id: post.id,
              title: post.title,
              trade: post.trade,
              project_name: post.project.name,
              nominated: !!nomination,
            };
          })
        );
        setJobPostsForNomination(postsWithStatus);
      }
    } catch (error) {
      console.error('Nomination modal error:', error);
    } finally {
      setNominationLoading(false);
    }
  };

  // 指名追加
  const addNominationFromSearch = async (jobPostId: string) => {
    if (!selectedSubForNomination) return;

    try {
      const { error } = await supabase.from('nominated_subcontractors').insert({
        job_post_id: jobPostId,
        subcontractor_id: selectedSubForNomination.id,
        nominated_at: new Date().toISOString(),
      });

      if (error) throw error;

      // モック通知
      const post = jobPostsForNomination.find((p) => p.id === jobPostId);
      console.log(`[メール通知モック] ${selectedSubForNomination.company_name}様へ指名通知を送信しました`);
      console.log(`  案件: ${post?.title}`);

      alert(`指名を追加しました（通知はコンソールログに出力）`);

      // リスト更新
      openNominationModal(selectedSubForNomination);
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // 評価バー表示
  const RatingBar = ({ value, label }: { value: number; label: string }) => (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-16 text-gray-600">{label}</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-yellow-500 rounded-full"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right font-medium">{value.toFixed(1)}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">協力業者検索（元請け）</h1>
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
        <div className="mb-6 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            ログイン中: <span className="font-bold">{selectedTenant.name}</span>
          </p>
        </div>

        {/* フィルタ */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold text-gray-900 mb-3">検索フィルタ</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">職種</label>
              <select
                value={filters.trade}
                onChange={(e) => setFilters({ ...filters, trade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">すべて</option>
                {TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">エリア</label>
              <select
                value={filters.prefecture}
                onChange={(e) => setFilters({ ...filters, prefecture: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">すべて</option>
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">最低評価</label>
              <select
                value={filters.minRating}
                onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value={0}>指定なし</option>
                <option value={3}>★3以上</option>
                <option value={3.5}>★3.5以上</option>
                <option value={4}>★4以上</option>
                <option value={4.5}>★4.5以上</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">資格</label>
              <input
                type="text"
                value={filters.certification}
                onChange={(e) => setFilters({ ...filters, certification: e.target.value })}
                placeholder="例: 電気工事士"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* ソート */}
        <div className="mb-4 flex items-center gap-4">
          <span className="text-sm text-gray-600">並び順:</span>
          <div className="flex gap-2">
            {[
              { key: 'rating', label: '評価順' },
              { key: 'name', label: '会社名順' },
              { key: 'jobs', label: '取引回数順' },
            ].map((option) => (
              <button
                key={option.key}
                onClick={() => {
                  if (sortBy === option.key) {
                    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
                  } else {
                    setSortBy(option.key as any);
                    setSortOrder('desc');
                  }
                }}
                className={`px-3 py-1 rounded text-sm ${
                  sortBy === option.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {option.label}
                {sortBy === option.key && (sortOrder === 'desc' ? ' ↓' : ' ↑')}
              </button>
            ))}
          </div>
        </div>

        {/* 業者一覧 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">
                招待済み協力業者 ({sortedSubcontractors.length}件)
              </h2>
            </div>
            <div className="p-6">
              {sortedSubcontractors.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  条件に一致する業者はありません
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedSubcontractors.map((sub) => (
                    <div
                      key={sub.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/v2/contractor/subcontractors/${sub.id}`)}
                      onMouseEnter={() => setHoveredId(sub.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {sub.company_name}
                            </h3>
                            <span className="text-xs text-gray-500">({sub.code})</span>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {sub.trades.map((trade) => (
                              <span
                                key={trade}
                                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                              >
                                {trade}
                              </span>
                            ))}
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>エリア: {sub.service_areas.prefectures.join(', ') || '-'}</p>
                            {sub.certifications.length > 0 && (
                              <p>資格: {sub.certifications.slice(0, 3).join(', ')}{sub.certifications.length > 3 ? ' 他' : ''}</p>
                            )}
                          </div>
                        </div>

                        {/* 評価表示 */}
                        <div className="ml-4 text-right">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl font-bold text-yellow-600">
                              ★{sub.overall_avg.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({sub.total_evaluations}件)
                            </span>
                          </div>
                          {sub.self_evaluations > 0 && (
                            <p className="text-sm text-blue-600">
                              自社評価: ★{sub.self_avg.toFixed(1)} ({sub.self_evaluations}件)
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            取引: 全体{sub.total_jobs}件 / 自社{sub.self_jobs}件
                          </p>

                          {/* ホバー時の詳細評価 */}
                          {hoveredId === sub.id && sub.total_evaluations > 0 && (
                            <div className="mt-3 p-3 bg-yellow-50 rounded-lg w-48">
                              <p className="text-xs font-medium text-gray-700 mb-2">評価詳細</p>
                              <RatingBar value={sub.schedule_avg} label="工程遵守" />
                              <RatingBar value={sub.safety_avg} label="安全管理" />
                              <RatingBar value={sub.quality_avg} label="品質" />
                              <RatingBar value={sub.cost_avg} label="コスト" />
                            </div>
                          )}

                          {/* 指名追加ボタン */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openNominationModal(sub);
                            }}
                            className="mt-2 px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                          >
                            指名に追加
                          </button>
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

      {/* 指名追加モーダル */}
      {showNominationModal && selectedSubForNomination && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b bg-purple-50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">指名案件を選択</h3>
                  <p className="text-sm text-purple-700 mt-1">
                    {selectedSubForNomination.company_name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowNominationModal(false);
                    setSelectedSubForNomination(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {nominationLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                  <p className="mt-2 text-gray-600">読み込み中...</p>
                </div>
              ) : jobPostsForNomination.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  現在、募集中の案件はありません
                </p>
              ) : (
                <div className="space-y-3">
                  {jobPostsForNomination.map((post) => (
                    <div
                      key={post.id}
                      className={`border rounded-lg p-4 ${
                        post.nominated
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-semibold text-gray-900">{post.title}</h4>
                          <p className="text-sm text-gray-600">{post.project_name}</p>
                          <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {post.trade}
                          </span>
                        </div>
                        {post.nominated ? (
                          <span className="px-4 py-2 bg-purple-200 text-purple-700 rounded-md text-sm font-medium">
                            指名済み
                          </span>
                        ) : (
                          <button
                            onClick={() => addNominationFromSearch(post.id)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700"
                          >
                            指名する
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowNominationModal(false);
                  setSelectedSubForNomination(null);
                }}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
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
