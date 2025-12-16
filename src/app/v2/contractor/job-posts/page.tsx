'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyNominated } from '@/lib/notifications/client';

interface JobPostWithDetails {
  id: string;
  title: string;
  trade: string;
  description: string | null;
  unit_price: number | null;
  start_date: string | null;
  end_date: string | null;
  recruitment_type: 'open' | 'nominated';
  project: {
    id: string;
    name: string;
    address: string | null;
  };
  slots_count: number;
  available_slots: number;
  applications_count: number;
  nominated_count: number;
}

interface NominatedSubcontractor {
  id: string;
  subcontractor_id: string;
  company_name: string;
  nominated_at: string;
}

interface SubcontractorForNomination {
  id: string;
  company_name: string;
  trades: string[];
  overall_avg: number;
}

// デモ用テナント
const DEMO_TENANTS = [
  { id: '11111111-1111-1111-1111-111111111111', name: '株式会社ダンドリ建設' },
  { id: '22222222-2222-2222-2222-222222222222', name: '東京総合建設株式会社' },
];

export default function ContractorJobPostsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [jobPosts, setJobPosts] = useState<JobPostWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // 指名業者管理モーダル
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [selectedJobPost, setSelectedJobPost] = useState<JobPostWithDetails | null>(null);
  const [nominatedList, setNominatedList] = useState<NominatedSubcontractor[]>([]);
  const [availableSubcontractors, setAvailableSubcontractors] = useState<SubcontractorForNomination[]>([]);
  const [nominationLoading, setNominationLoading] = useState(false);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // 案件一覧取得
      const { data: posts, error: postsError } = await supabase
        .from('job_posts')
        .select(`
          id,
          title,
          trade,
          description,
          unit_price,
          start_date,
          end_date,
          recruitment_type,
          project:projects!inner(id, name, address)
        `)
        .eq('tenant_id', selectedTenant.id)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Posts error:', postsError);
        setJobPosts([]);
        return;
      }

      // 各案件のスロット数・応募数・指名数を取得
      const postsWithCounts = await Promise.all(
        (posts || []).map(async (post: any) => {
          // スロット数
          const { count: slotsCount } = await supabase
            .from('job_slots')
            .select('*', { count: 'exact', head: true })
            .eq('job_post_id', post.id);

          // 空きスロット数
          const { count: availableSlots } = await supabase
            .from('job_slots')
            .select('*', { count: 'exact', head: true })
            .eq('job_post_id', post.id)
            .eq('status', 'available');

          // 応募数
          const { data: slots } = await supabase
            .from('job_slots')
            .select('id')
            .eq('job_post_id', post.id);

          const slotIds = (slots || []).map((s: any) => s.id);
          let applicationsCount = 0;
          if (slotIds.length > 0) {
            const { count } = await supabase
              .from('slot_applications')
              .select('*', { count: 'exact', head: true })
              .in('job_slot_id', slotIds)
              .eq('status', 'pending');
            applicationsCount = count || 0;
          }

          // 指名業者数
          const { count: nominatedCount } = await supabase
            .from('nominated_subcontractors')
            .select('*', { count: 'exact', head: true })
            .eq('job_post_id', post.id);

          return {
            id: post.id,
            title: post.title,
            trade: post.trade,
            description: post.description,
            unit_price: post.unit_price,
            start_date: post.start_date,
            end_date: post.end_date,
            recruitment_type: post.recruitment_type,
            project: {
              id: post.project.id,
              name: post.project.name,
              address: post.project.address,
            },
            slots_count: slotsCount || 0,
            available_slots: availableSlots || 0,
            applications_count: applicationsCount,
            nominated_count: nominatedCount || 0,
          };
        })
      );

      setJobPosts(postsWithCounts);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTenant]);

  // 指名管理モーダルを開く
  const openNominationModal = async (jobPost: JobPostWithDetails) => {
    setSelectedJobPost(jobPost);
    setNominationLoading(true);
    setShowNominationModal(true);

    try {
      // 現在の指名業者を取得
      const { data: nominated, error: nomError } = await supabase
        .from('nominated_subcontractors')
        .select(`
          id,
          subcontractor_id,
          nominated_at,
          subcontractor:subcontractors!inner(company_name)
        `)
        .eq('job_post_id', jobPost.id);

      if (!nomError) {
        setNominatedList(
          (nominated || []).map((n: any) => ({
            id: n.id,
            subcontractor_id: n.subcontractor_id,
            company_name: n.subcontractor.company_name,
            nominated_at: n.nominated_at,
          }))
        );
      }

      // 招待済み業者を取得（指名可能な業者）
      const { data: invited, error: invError } = await supabase
        .from('tenant_subcontractors')
        .select(`
          subcontractor:subcontractors!inner(id, company_name, trades)
        `)
        .eq('tenant_id', selectedTenant.id)
        .eq('status', 'active');

      if (!invError && invited) {
        // 評価情報を取得
        const subIds = invited.map((i: any) => i.subcontractor.id);
        const { data: evals } = await supabase
          .from('evaluations')
          .select('subcontractor_id, schedule_rating, safety_rating, quality_rating, cost_rating')
          .in('subcontractor_id', subIds);

        const subsWithRating = invited.map((i: any) => {
          const subEvals = (evals || []).filter((e: any) => e.subcontractor_id === i.subcontractor.id);
          const avg =
            subEvals.length > 0
              ? subEvals.reduce((sum: number, e: any) => {
                  const ratings = [e.schedule_rating, e.safety_rating, e.quality_rating, e.cost_rating].filter(
                    (r) => r !== null
                  );
                  return sum + (ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0);
                }, 0) / subEvals.length
              : 0;

          return {
            id: i.subcontractor.id,
            company_name: i.subcontractor.company_name,
            trades: i.subcontractor.trades || [],
            overall_avg: Math.round(avg * 10) / 10,
          };
        });

        setAvailableSubcontractors(subsWithRating);
      }
    } catch (error) {
      console.error('Nomination modal error:', error);
    } finally {
      setNominationLoading(false);
    }
  };

  // 指名追加
  const addNomination = async (subcontractorId: string) => {
    if (!selectedJobPost) return;

    try {
      const { error } = await supabase.from('nominated_subcontractors').insert({
        job_post_id: selectedJobPost.id,
        subcontractor_id: subcontractorId,
        nominated_at: new Date().toISOString(),
      });

      if (error) throw error;

      const sub = availableSubcontractors.find((s) => s.id === subcontractorId);

      // 通知送信
      await notifyNominated({
        subcontractorId,
        jobPostId: selectedJobPost.id,
        jobTitle: selectedJobPost.title,
        projectName: selectedJobPost.project.name,
        tenantName: selectedTenant.name,
      });

      alert(`${sub?.company_name}を指名しました（通知を送信しました）`);

      // リスト更新
      openNominationModal(selectedJobPost);
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // 指名解除
  const removeNomination = async (nominationId: string) => {
    if (!confirm('この業者の指名を解除しますか？')) return;

    try {
      const { error } = await supabase
        .from('nominated_subcontractors')
        .delete()
        .eq('id', nominationId);

      if (error) throw error;

      alert('指名を解除しました');
      if (selectedJobPost) {
        openNominationModal(selectedJobPost);
      }
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // 指名済みかチェック
  const isNominated = (subcontractorId: string) => {
    return nominatedList.some((n) => n.subcontractor_id === subcontractorId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">案件管理（元請け）</h1>
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

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">案件一覧 ({jobPosts.length}件)</h2>
            </div>
            <div className="p-6">
              {jobPosts.length === 0 ? (
                <p className="text-gray-500 text-center py-8">案件はありません</p>
              ) : (
                <div className="space-y-4">
                  {jobPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg">{post.title}</h3>
                            {post.nominated_count > 0 && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                指名{post.nominated_count}社
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{post.project.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">{post.trade}</span>
                            {post.start_date && post.end_date && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                {post.start_date} 〜 {post.end_date}
                              </span>
                            )}
                            {post.unit_price && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                ¥{post.unit_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-gray-500">
                            スロット: {post.available_slots}/{post.slots_count}件空き
                            {post.applications_count > 0 && (
                              <span className="ml-3 text-orange-600 font-medium">
                                応募{post.applications_count}件
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex flex-col gap-2">
                          <button
                            onClick={() => openNominationModal(post)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                          >
                            指名管理
                          </button>
                          {post.applications_count > 0 && (
                            <button
                              onClick={() => router.push(`/v2/contractor/job-posts/${post.id}/applications`)}
                              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                            >
                              応募者選定
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
        )}
      </div>

      {/* 指名管理モーダル */}
      {showNominationModal && selectedJobPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">指名業者管理</h2>
                <p className="text-sm text-gray-600">{selectedJobPost.title}</p>
              </div>
              <button
                onClick={() => setShowNominationModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {nominationLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 指名済み業者 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">
                    指名済み業者 ({nominatedList.length}社)
                  </h3>
                  {nominatedList.length === 0 ? (
                    <p className="text-gray-500 text-sm">指名業者はいません</p>
                  ) : (
                    <div className="space-y-2">
                      {nominatedList.map((nom) => (
                        <div
                          key={nom.id}
                          className="flex justify-between items-center p-3 bg-purple-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{nom.company_name}</p>
                            <p className="text-xs text-gray-500">
                              指名日: {new Date(nom.nominated_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>
                          <button
                            onClick={() => removeNomination(nom.id)}
                            className="px-3 py-1 text-red-600 hover:bg-red-100 rounded text-sm"
                          >
                            解除
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 指名可能な業者 */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">指名可能な業者</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {availableSubcontractors
                      .filter((sub) => !isNominated(sub.id))
                      .map((sub) => (
                        <div
                          key={sub.id}
                          className="flex justify-between items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                        >
                          <div>
                            <p className="font-medium">{sub.company_name}</p>
                            <div className="flex gap-2 mt-1">
                              {sub.trades.slice(0, 3).map((trade) => (
                                <span
                                  key={trade}
                                  className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {trade}
                                </span>
                              ))}
                              {sub.overall_avg > 0 && (
                                <span className="text-yellow-600 text-xs">★{sub.overall_avg}</span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => addNomination(sub.id)}
                            className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                          >
                            指名
                          </button>
                        </div>
                      ))}
                    {availableSubcontractors.filter((sub) => !isNominated(sub.id)).length === 0 && (
                      <p className="text-gray-500 text-sm">すべての業者を指名済みです</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowNominationModal(false)}
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
