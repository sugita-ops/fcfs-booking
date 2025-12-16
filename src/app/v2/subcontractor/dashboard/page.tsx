'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import { notifyApplicationReceived } from '@/lib/notifications/client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, EventClickArg } from '@fullcalendar/core';

interface SlotEvent {
  id: string;
  work_date: string;
  status: string;
  type: 'assigned' | 'available';
  job_post: {
    id: string;
    title: string;
    trade: string;
    unit_price: number | null;
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

// 色設定
const EVENT_COLORS = {
  assigned: '#8B5CF6', // purple - 自分の工事
  available: '#3B82F6', // blue - 応募可能
  nominated: '#F59E0B', // amber - 指名案件
  applied: '#6B7280', // gray - 応募済み
};

export default function SubcontractorDashboardPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedSubcontractor, setSelectedSubcontractor] = useState(DEMO_SUBCONTRACTORS[0]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // 応募モーダル
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<SlotEvent | null>(null);
  const [applying, setApplying] = useState(false);

  // モバイル判定
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // データ取得
  const fetchData = async () => {
    setLoading(true);
    try {
      const allEvents: EventInput[] = [];

      // 1. 割当済みスロット取得
      const { data: assignedSlots } = await supabase
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
        .in('status', ['assigned', 'in_progress', 'completed']);

      (assignedSlots || []).forEach((slot: any) => {
        allEvents.push({
          id: `assigned-${slot.id}`,
          title: `[自分] ${slot.job_post.title}`,
          start: slot.work_date,
          allDay: true,
          backgroundColor: EVENT_COLORS.assigned,
          borderColor: EVENT_COLORS.assigned,
          extendedProps: {
            type: 'assigned',
            slotId: slot.id,
            status: slot.status,
            jobPostId: slot.job_post.id,
            trade: slot.job_post.trade,
            projectName: slot.job_post.project.name,
            address: slot.job_post.project.address,
            tenantName: slot.job_post.project.tenant.name,
            unitPrice: slot.job_post.unit_price,
          },
        });
      });

      // 2. 応募可能なスロット取得
      const { data: invitations } = await supabase
        .from('tenant_subcontractors')
        .select('tenant_id')
        .eq('subcontractor_id', selectedSubcontractor.id)
        .eq('status', 'active');

      if (invitations && invitations.length > 0) {
        const tenantIds = invitations.map((i) => i.tenant_id);

        const { data: availableSlots } = await supabase
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
          .eq('status', 'available');

        // 指名・応募状況を確認
        for (const slot of availableSlots || []) {
          const slotData = slot as any;

          // 指名確認
          const { data: nomination } = await supabase
            .from('nominated_subcontractors')
            .select('id')
            .eq('job_post_id', slotData.job_post.id)
            .eq('subcontractor_id', selectedSubcontractor.id)
            .single();

          // 応募確認
          const { data: application } = await supabase
            .from('slot_applications')
            .select('id')
            .eq('job_slot_id', slotData.id)
            .eq('subcontractor_id', selectedSubcontractor.id)
            .single();

          const isNominated = !!nomination;
          const hasApplied = !!application;

          let bgColor = EVENT_COLORS.available;
          let title = slotData.job_post.title;

          if (hasApplied) {
            bgColor = EVENT_COLORS.applied;
            title = `[応募済] ${title}`;
          } else if (isNominated) {
            bgColor = EVENT_COLORS.nominated;
            title = `[指名] ${title}`;
          }

          allEvents.push({
            id: `available-${slotData.id}`,
            title,
            start: slotData.work_date,
            allDay: true,
            backgroundColor: bgColor,
            borderColor: bgColor,
            extendedProps: {
              type: 'available',
              slotId: slotData.id,
              status: slotData.status,
              jobPostId: slotData.job_post.id,
              trade: slotData.job_post.trade,
              projectName: slotData.job_post.project.name,
              address: slotData.job_post.project.address,
              tenantName: slotData.job_post.project.tenant.name,
              unitPrice: slotData.job_post.unit_price,
              isNominated,
              hasApplied,
            },
          });
        }
      }

      setEvents(allEvents);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedSubcontractor]);

  // イベントクリック
  const handleEventClick = (clickInfo: EventClickArg) => {
    const props = clickInfo.event.extendedProps;

    if (props.type === 'assigned') {
      // 割当済み → 詳細または完了報告ページへ
      router.push('/v2/subcontractor/completion-reports');
    } else if (props.type === 'available') {
      if (props.hasApplied) {
        alert('この案件には既に応募済みです');
        return;
      }
      // 応募可能 → モーダル表示
      setSelectedSlot({
        id: props.slotId,
        work_date: clickInfo.event.startStr,
        status: props.status,
        type: 'available',
        job_post: {
          id: props.jobPostId,
          title: clickInfo.event.title.replace(/^\[.*?\] /, ''),
          trade: props.trade,
          unit_price: props.unitPrice,
        },
        project: {
          id: '',
          name: props.projectName,
          address: props.address,
        },
        tenant: {
          id: '',
          name: props.tenantName,
        },
        is_nominated: props.isNominated,
        has_applied: props.hasApplied,
      });
      setShowApplyModal(true);
    }
  };

  // 応募
  const handleApply = async () => {
    if (!selectedSlot) return;

    setApplying(true);
    try {
      const { error } = await supabase.from('slot_applications').insert({
        job_slot_id: selectedSlot.id,
        subcontractor_id: selectedSubcontractor.id,
        applied_at: new Date().toISOString(),
        status: 'pending',
      });

      if (error) throw error;

      // 通知送信
      await notifyApplicationReceived({
        jobPostId: selectedSlot.job_post.id,
        subcontractorName: selectedSubcontractor.name,
        jobTitle: selectedSlot.job_post.title,
        projectName: selectedSlot.project.name,
      });

      alert('応募しました。元請けからの連絡をお待ちください。');
      setShowApplyModal(false);
      setSelectedSlot(null);
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    } finally {
      setApplying(false);
    }
  };

  // 統計
  const assignedCount = events.filter((e) => e.extendedProps?.type === 'assigned').length;
  const availableCount = events.filter(
    (e) => e.extendedProps?.type === 'available' && !e.extendedProps?.hasApplied
  ).length;
  const nominatedCount = events.filter(
    (e) => e.extendedProps?.type === 'available' && e.extendedProps?.isNominated && !e.extendedProps?.hasApplied
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ダッシュボード（協力業者）</h1>
              <p className="text-sm text-gray-500 mt-1">工事カレンダー</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ログイン中表示 */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg flex flex-wrap justify-between items-center gap-2">
          <p className="text-sm text-blue-800">
            ログイン中: <span className="font-bold">{selectedSubcontractor.name}</span>
          </p>
          <div className="flex gap-2">
            {nominatedCount > 0 && (
              <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-sm font-bold">
                指名{nominatedCount}件
              </span>
            )}
            <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-sm font-bold">
              工事{assignedCount}件
            </span>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">カレンダー凡例:</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: EVENT_COLORS.assigned }}></div>
              <span className="text-gray-800 font-medium">自分の工事</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: EVENT_COLORS.nominated }}></div>
              <span className="text-gray-800 font-medium">指名案件</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: EVENT_COLORS.available }}></div>
              <span className="text-gray-800 font-medium">応募可能</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: EVENT_COLORS.applied }}></div>
              <span className="text-gray-800 font-medium">応募済み</span>
            </div>
          </div>
        </div>

        {/* カレンダー */}
        <style jsx global>{`
          .fc {
            --fc-border-color: #d1d5db;
            --fc-today-bg-color: #fef3c7;
          }
          .fc .fc-col-header-cell-cushion,
          .fc .fc-daygrid-day-number {
            color: #1f2937 !important;
            font-weight: 600 !important;
          }
          .fc .fc-toolbar-title {
            color: #111827 !important;
            font-weight: 700 !important;
          }
          .fc .fc-button {
            background-color: #374151 !important;
            border-color: #374151 !important;
            font-weight: 600 !important;
          }
          .fc .fc-button:hover {
            background-color: #1f2937 !important;
          }
          .fc .fc-button-active {
            background-color: #1f2937 !important;
          }
          .fc .fc-event {
            font-weight: 600 !important;
          }
          .fc .fc-more-link {
            color: #1f2937 !important;
            font-weight: 600 !important;
          }
          .fc .fc-daygrid-day.fc-day-today {
            background-color: #fef3c7 !important;
          }
        `}</style>
        <div className="bg-white rounded-lg shadow p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : isMobile ? (
            // モバイル: リスト表示
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700 mb-3">今後の予定・案件</h3>
              {events
                .filter((e) => new Date(e.start as string) >= new Date())
                .sort((a, b) => {
                  // 指名案件を優先
                  if (a.extendedProps?.isNominated && !b.extendedProps?.isNominated) return -1;
                  if (!a.extendedProps?.isNominated && b.extendedProps?.isNominated) return 1;
                  // 自分の工事を優先
                  if (a.extendedProps?.type === 'assigned' && b.extendedProps?.type !== 'assigned') return -1;
                  if (a.extendedProps?.type !== 'assigned' && b.extendedProps?.type === 'assigned') return 1;
                  return new Date(a.start as string).getTime() - new Date(b.start as string).getTime();
                })
                .slice(0, 20)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      if (event.extendedProps?.type === 'assigned') {
                        router.push('/v2/subcontractor/completion-reports');
                      } else if (!event.extendedProps?.hasApplied) {
                        setSelectedSlot({
                          id: event.extendedProps?.slotId,
                          work_date: event.start as string,
                          status: event.extendedProps?.status,
                          type: 'available',
                          job_post: {
                            id: event.extendedProps?.jobPostId,
                            title: (event.title as string).replace(/^\[.*?\] /, ''),
                            trade: event.extendedProps?.trade,
                            unit_price: event.extendedProps?.unitPrice,
                          },
                          project: {
                            id: '',
                            name: event.extendedProps?.projectName,
                            address: event.extendedProps?.address,
                          },
                          tenant: {
                            id: '',
                            name: event.extendedProps?.tenantName,
                          },
                          is_nominated: event.extendedProps?.isNominated,
                          has_applied: event.extendedProps?.hasApplied,
                        });
                        setShowApplyModal(true);
                      }
                    }}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    style={{ borderLeftColor: event.backgroundColor as string, borderLeftWidth: 4 }}
                  >
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {event.start as string} | {event.extendedProps?.projectName}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{event.extendedProps?.tenantName}</div>
                    {event.extendedProps?.unitPrice && (
                      <div className="text-xs text-green-600 mt-1">
                        ¥{event.extendedProps.unitPrice.toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              {events.length === 0 && (
                <p className="text-gray-500 text-center py-8">予定・案件はありません</p>
              )}
            </div>
          ) : (
            // デスクトップ: カレンダー表示
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek',
              }}
              locale="ja"
              events={events}
              eventClick={handleEventClick}
              dayMaxEvents={3}
              moreLinkText={(num) => `他${num}件`}
              height="auto"
              buttonText={{
                today: '今日',
                month: '月',
                week: '週',
              }}
            />
          )}
        </div>

        {/* クイックリンク */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/v2/subcontractor/job-posts')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-bold text-gray-800">案件一覧</div>
          </button>
          <button
            onClick={() => router.push('/v2/subcontractor/completion-reports')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm font-bold text-gray-800">完了報告</div>
          </button>
          <button
            onClick={() => router.push('/v2/subcontractor/evaluations')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-sm font-bold text-gray-800">評価確認</div>
          </button>
          <button
            onClick={() => router.push('/v2/subcontractor/settings')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-sm font-bold text-gray-800">通知設定</div>
          </button>
        </div>
      </div>

      {/* 応募モーダル */}
      {showApplyModal && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">案件詳細</h2>

            <div className="space-y-3 mb-6">
              {selectedSlot.is_nominated && (
                <div className="px-3 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-bold">
                  この案件に指名されています
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded">
                <h3 className="font-semibold">{selectedSlot.job_post.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedSlot.project.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">作業日:</span>
                  <span className="ml-2 font-medium">{selectedSlot.work_date}</span>
                </div>
                <div>
                  <span className="text-gray-500">職種:</span>
                  <span className="ml-2 font-medium">{selectedSlot.job_post.trade}</span>
                </div>
                <div>
                  <span className="text-gray-500">元請け:</span>
                  <span className="ml-2 font-medium">{selectedSlot.tenant.name}</span>
                </div>
                {selectedSlot.job_post.unit_price && (
                  <div>
                    <span className="text-gray-500">単価:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ¥{selectedSlot.job_post.unit_price.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {selectedSlot.project.address && (
                <div className="text-sm">
                  <span className="text-gray-500">住所:</span>
                  <span className="ml-2">{selectedSlot.project.address}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedSlot(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                閉じる
              </button>
              <button
                onClick={handleApply}
                disabled={applying}
                className={`px-4 py-2 text-white rounded-md ${
                  selectedSlot.is_nominated
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                } disabled:bg-gray-400`}
              >
                {applying ? '応募中...' : '応募する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
