'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyApplicationReceived } from '@/lib/notifications/client';

interface JobSlotWithDetails {
  id: string;
  work_date: string;
  status: string;
  job_post: {
    id: string;
    title: string;
    trade: string;
    description: string | null;
    unit_price: number | null;
    recruitment_type: 'open' | 'nominated';
  };
  project: {
    id: string;
    name: string;
    address: string | null;
  };
  tenant: {
    id: string;
    name: string;
  };
  is_nominated: boolean;
  has_applied: boolean;
}

// デモ用：選択可能な協力業者
const DEMO_SUBCONTRACTORS = [
  { id: 'a1111111-1111-1111-1111-111111111111', name: '株式会社山田電気工事' },
  { id: 'a2222222-2222-2222-2222-222222222222', name: '佐藤配管工業' },
  { id: 'a3333333-3333-3333-3333-333333333333', name: '高橋内装株式会社' },
  { id: 'a4444444-4444-4444-4444-444444444444', name: '伊藤塗装工業' },
  { id: 'a5555555-5555-5555-5555-555555555555', name: '渡辺基礎工事' },
];

export default function SubcontractorJobPostsPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedSubcontractor, setSelectedSubcontractor] = useState(DEMO_SUBCONTRACTORS[0]);
  const [jobSlots, setJobSlots] = useState<JobSlotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'nominated' | 'open'>('all');

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      // この業者が招待されているテナントを取得
      const { data: invitations, error: invError } = await supabase
        .from('tenant_subcontractors')
        .select('tenant_id')
        .eq('subcontractor_id', selectedSubcontractor.id)
        .eq('status', 'active');

      if (invError || !invitations || invitations.length === 0) {
        setJobSlots([]);
        setLoading(false);
        return;
      }

      const tenantIds = invitations.map((i) => i.tenant_id);

      // 利用可能なスロットを取得
      const { data: slots, error: slotsError } = await supabase
        .from('job_slots')
        .select(`
          id,
          work_date,
          status,
          tenant_id,
          job_post:job_posts!inner(
            id,
            title,
            trade,
            description,
            unit_price,
            recruitment_type,
            project:projects!inner(
              id,
              name,
              address,
              tenant:tenants!inner(id, name)
            )
          )
        `)
        .in('tenant_id', tenantIds)
        .eq('status', 'available')
        .order('work_date', { ascending: true });

      if (slotsError) {
        console.error('Slots error:', slotsError);
        setJobSlots([]);
        setLoading(false);
        return;
      }

      // 指名状況と応募状況を確認
      const slotsWithDetails = await Promise.all(
        (slots || []).map(async (slot: any) => {
          // 指名されているか確認
          const { data: nomination } = await supabase
            .from('nominated_subcontractors')
            .select('id')
            .eq('job_post_id', slot.job_post.id)
            .eq('subcontractor_id', selectedSubcontractor.id)
            .single();

          // 既に応募済みか確認
          const { data: application } = await supabase
            .from('slot_applications')
            .select('id')
            .eq('job_slot_id', slot.id)
            .eq('subcontractor_id', selectedSubcontractor.id)
            .single();

          return {
            id: slot.id,
            work_date: slot.work_date,
            status: slot.status,
            job_post: {
              id: slot.job_post.id,
              title: slot.job_post.title,
              trade: slot.job_post.trade,
              description: slot.job_post.description,
              unit_price: slot.job_post.unit_price,
              recruitment_type: slot.job_post.recruitment_type,
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
            is_nominated: !!nomination,
            has_applied: !!application,
          };
        })
      );

      // 指名案件を上部に優先表示
      const sorted = slotsWithDetails.sort((a, b) => {
        if (a.is_nominated && !b.is_nominated) return -1;
        if (!a.is_nominated && b.is_nominated) return 1;
        return new Date(a.work_date).getTime() - new Date(b.work_date).getTime();
      });

      setJobSlots(sorted);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSubcontractor]);

  // 応募
  const applyToSlot = async (slot: JobSlotWithDetails) => {
    if (!confirm(`「${slot.job_post.title}」(${slot.work_date})に応募しますか？`)) return;

    try {
      const { error } = await supabase.from('slot_applications').insert({
        job_slot_id: slot.id,
        subcontractor_id: selectedSubcontractor.id,
        applied_at: new Date().toISOString(),
        status: 'pending',
      });

      if (error) throw error;

      // 元請けへ通知送信
      await notifyApplicationReceived({
        jobPostId: slot.job_post.id,
        subcontractorName: selectedSubcontractor.name,
        jobTitle: slot.job_post.title,
        projectName: slot.project.name,
      });

      alert('応募しました。元請けからの連絡をお待ちください。');
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    }
  };

  // フィルタリング
  const filteredSlots = jobSlots.filter((slot) => {
    if (filter === 'nominated') return slot.is_nominated;
    if (filter === 'open') return !slot.is_nominated;
    return true;
  });

  const nominatedCount = jobSlots.filter((s) => s.is_nominated).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold text-gray-900">案件一覧（協力業者）</h1>
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
        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex justify-between items-center">
          <p className="text-sm text-blue-800">
            ログイン中: <span className="font-bold">{selectedSubcontractor.name}</span>
          </p>
          {nominatedCount > 0 && (
            <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
              指名{nominatedCount}件
            </span>
          )}
        </div>

        {/* フィルタ */}
        <div className="mb-6 flex gap-2">
          {[
            { value: 'all', label: 'すべて' },
            { value: 'nominated', label: '指名案件のみ' },
            { value: 'open', label: '通常募集のみ' },
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
              <h2 className="text-lg font-semibold">利用可能な案件 ({filteredSlots.length}件)</h2>
            </div>
            <div className="p-6">
              {filteredSlots.length === 0 ? (
                <p className="text-gray-500 text-center py-8">利用可能な案件はありません</p>
              ) : (
                <div className="space-y-4">
                  {filteredSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                        slot.is_nominated
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {slot.is_nominated && (
                              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-bold">
                                指名
                              </span>
                            )}
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {slot.job_post.title}
                            </h3>
                          </div>
                          <p className="text-sm text-gray-600">{slot.project.name}</p>
                          <p className="text-xs text-gray-500">{slot.tenant.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                              {slot.job_post.trade}
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-bold">
                              {slot.work_date}
                            </span>
                            {slot.project.address && (
                              <span className="px-2 py-1 bg-gray-100 rounded">
                                {slot.project.address}
                              </span>
                            )}
                            {slot.job_post.unit_price && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                ¥{slot.job_post.unit_price.toLocaleString()}
                              </span>
                            )}
                          </div>
                          {slot.job_post.description && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                              {slot.job_post.description}
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          {slot.has_applied ? (
                            <span className="px-4 py-2 bg-gray-300 text-gray-600 rounded-md text-sm">
                              応募済み
                            </span>
                          ) : (
                            <button
                              onClick={() => applyToSlot(slot)}
                              className={`px-4 py-2 rounded-md text-sm font-medium ${
                                slot.is_nominated
                                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                                  : 'bg-blue-600 text-white hover:bg-blue-700'
                              }`}
                            >
                              応募する
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
    </div>
  );
}
