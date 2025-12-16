'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDemoClient } from '@/lib/supabase/demo-client';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventInput, DateSelectArg, EventClickArg, EventDropArg, EventDragStartArg, EventDragStopArg } from '@fullcalendar/core';

interface JobSlotEvent {
  id: string;
  work_date: string;
  status: string;
  job_post: {
    id: string;
    title: string;
    trade: string;
  };
  project: {
    id: string;
    name: string;
  };
  subcontractor?: {
    id: string;
    company_name: string;
  };
}

interface JobPostOption {
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

// ステータス別の色
const STATUS_COLORS: Record<string, string> = {
  available: '#3B82F6', // blue
  applied: '#F59E0B', // amber
  assigned: '#8B5CF6', // purple
  in_progress: '#10B981', // green
  completed: '#6B7280', // gray
  cancelled: '#EF4444', // red
};

// 職種別の色（ステータスがavailableの場合のボーダー色）
const TRADE_COLORS: Record<string, string> = {
  '電気工事': '#FBBF24',
  '配管工事': '#60A5FA',
  '内装工事': '#F472B6',
  '塗装工事': '#A78BFA',
  '基礎工事': '#FB923C',
};

export default function ContractorDashboardPage() {
  const router = useRouter();
  const supabase = createDemoClient();

  const [selectedTenant, setSelectedTenant] = useState(DEMO_TENANTS[0]);
  const [events, setEvents] = useState<EventInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // フィルター
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSubcontractor, setFilterSubcontractor] = useState<string>('all');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [subcontractors, setSubcontractors] = useState<{ id: string; company_name: string }[]>([]);

  // 新規スロット追加モーダル
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [jobPosts, setJobPosts] = useState<JobPostOption[]>([]);
  const [selectedJobPost, setSelectedJobPost] = useState<string>('');
  const [addingSlot, setAddingSlot] = useState(false);

  // ドラッグ中フラグ
  const [isDragging, setIsDragging] = useState(false);

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
      // スロット取得
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
            project:projects!inner(id, name)
          ),
          subcontractor:subcontractors(id, company_name)
        `)
        .eq('tenant_id', selectedTenant.id)
        .order('work_date', { ascending: true });

      if (slotsError) {
        console.error('Slots error:', slotsError);
        return;
      }

      // イベント形式に変換
      const calendarEvents: EventInput[] = (slots || []).map((slot: any) => ({
        id: slot.id,
        title: slot.job_post.title,
        start: slot.work_date,
        allDay: true,
        backgroundColor: STATUS_COLORS[slot.status] || '#3B82F6',
        borderColor: TRADE_COLORS[slot.job_post.trade] || STATUS_COLORS[slot.status] || '#3B82F6',
        extendedProps: {
          status: slot.status,
          trade: slot.job_post.trade,
          projectId: slot.job_post.project.id,
          projectName: slot.job_post.project.name,
          subcontractorId: slot.subcontractor?.id,
          subcontractorName: slot.subcontractor?.company_name,
          jobPostId: slot.job_post.id,
        },
      }));

      setEvents(calendarEvents);

      // プロジェクト一覧取得
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, name')
        .eq('tenant_id', selectedTenant.id);
      setProjects(projectsData || []);

      // 協力業者一覧取得
      const { data: subsData } = await supabase
        .from('tenant_subcontractors')
        .select('subcontractor:subcontractors(id, company_name)')
        .eq('tenant_id', selectedTenant.id)
        .eq('status', 'active');
      setSubcontractors((subsData || []).map((s: any) => s.subcontractor));

      // 案件一覧取得（スロット追加用）
      const { data: jobPostsData } = await supabase
        .from('job_posts')
        .select('id, title, trade, project:projects!inner(name)')
        .eq('tenant_id', selectedTenant.id);
      setJobPosts(
        (jobPostsData || []).map((jp: any) => ({
          id: jp.id,
          title: jp.title,
          trade: jp.trade,
          project_name: jp.project.name,
        }))
      );
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
  const filteredEvents = events.filter((event) => {
    if (filterProject !== 'all' && event.extendedProps?.projectId !== filterProject) {
      return false;
    }
    if (filterSubcontractor !== 'all' && event.extendedProps?.subcontractorId !== filterSubcontractor) {
      return false;
    }
    return true;
  });

  // 日付クリック（新規スロット追加）
  const handleDateSelect = (selectInfo: DateSelectArg) => {
    setSelectedDate(selectInfo.startStr);
    setSelectedJobPost('');
    setShowAddModal(true);
  };

  // イベントクリック（詳細ページへ）- ドラッグ中は無視
  const handleEventClick = (clickInfo: EventClickArg) => {
    // ドラッグ操作の場合はクリックイベントを無視
    if (isDragging) return;

    const jobPostId = clickInfo.event.extendedProps.jobPostId;
    router.push(`/v2/contractor/job-posts/${jobPostId}/applications`);
  };

  // ドラッグ開始
  const handleEventDragStart = () => {
    setIsDragging(true);
  };

  // ドラッグ終了
  const handleEventDragStop = () => {
    // 少し遅延させてクリックイベントより後にフラグをリセット
    setTimeout(() => setIsDragging(false), 100);
  };

  // イベントドラッグ（日付変更）
  const handleEventDrop = async (dropInfo: EventDropArg) => {
    const slotId = dropInfo.event.id;
    const newDate = dropInfo.event.startStr;

    try {
      const { error } = await supabase
        .from('job_slots')
        .update({ work_date: newDate })
        .eq('id', slotId);

      if (error) {
        dropInfo.revert();
        alert(`エラー: ${error.message}`);
      } else {
        fetchData();
      }
    } catch (error: any) {
      dropInfo.revert();
      alert(`エラー: ${error.message}`);
    }
  };

  // 新規スロット追加
  const handleAddSlot = async () => {
    if (!selectedJobPost || !selectedDate) return;

    setAddingSlot(true);
    try {
      const { error } = await supabase.from('job_slots').insert({
        tenant_id: selectedTenant.id,
        job_post_id: selectedJobPost,
        work_date: selectedDate,
        status: 'available',
      });

      if (error) throw error;

      alert('スロットを追加しました');
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      alert(`エラー: ${error.message}`);
    } finally {
      setAddingSlot(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">ダッシュボード（元請け）</h1>
              <p className="text-sm text-gray-500 mt-1">工事カレンダー</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
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

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* ログイン中表示 */}
        <div className="mb-4 p-4 bg-orange-50 rounded-lg">
          <p className="text-sm text-orange-800">
            ログイン中: <span className="font-bold">{selectedTenant.name}</span>
          </p>
        </div>

        {/* フィルター */}
        <div className="mb-4 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">プロジェクト</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="all">すべて</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">協力業者</label>
            <select
              value={filterSubcontractor}
              onChange={(e) => setFilterSubcontractor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900"
            >
              <option value="all">すべて</option>
              {subcontractors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.company_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mb-4 p-3 bg-white rounded-lg shadow-sm">
          <p className="text-sm font-medium text-gray-700 mb-2">ステータス凡例:</p>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(STATUS_COLORS).map(([status, color]) => (
              <div key={status} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }}></div>
                <span className="text-gray-800 font-medium">
                  {status === 'available' && '募集中'}
                  {status === 'applied' && '応募あり'}
                  {status === 'assigned' && '割当済'}
                  {status === 'in_progress' && '作業中'}
                  {status === 'completed' && '完了'}
                  {status === 'cancelled' && 'キャンセル'}
                </span>
              </div>
            ))}
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
              <h3 className="font-semibold text-gray-700 mb-3">今後の予定</h3>
              {filteredEvents
                .filter((e) => new Date(e.start as string) >= new Date())
                .sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime())
                .slice(0, 20)
                .map((event) => (
                  <div
                    key={event.id}
                    onClick={() => router.push(`/v2/contractor/job-posts/${event.extendedProps?.jobPostId}/applications`)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                    style={{ borderLeftColor: event.backgroundColor as string, borderLeftWidth: 4 }}
                  >
                    <div className="font-medium text-sm">{event.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {event.start as string} | {event.extendedProps?.projectName}
                    </div>
                    {event.extendedProps?.subcontractorName && (
                      <div className="text-xs text-purple-600 mt-1">
                        {event.extendedProps.subcontractorName}
                      </div>
                    )}
                  </div>
                ))}
              {filteredEvents.length === 0 && (
                <p className="text-gray-500 text-center py-8">予定はありません</p>
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
              events={filteredEvents}
              selectable={true}
              editable={true}
              select={handleDateSelect}
              eventClick={handleEventClick}
              eventDragStart={handleEventDragStart}
              eventDragStop={handleEventDragStop}
              eventDrop={handleEventDrop}
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
            onClick={() => router.push('/v2/contractor/job-posts')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">📋</div>
            <div className="text-sm font-bold text-gray-800">案件管理</div>
          </button>
          <button
            onClick={() => router.push('/v2/contractor/completion-reports')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">✅</div>
            <div className="text-sm font-bold text-gray-800">完了報告</div>
          </button>
          <button
            onClick={() => router.push('/v2/contractor/evaluations')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-sm font-bold text-gray-800">評価管理</div>
          </button>
          <button
            onClick={() => router.push('/v2/contractor/settings')}
            className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow text-center border border-gray-200"
          >
            <div className="text-3xl mb-2">⚙️</div>
            <div className="text-sm font-bold text-gray-800">通知設定</div>
          </button>
        </div>
      </div>

      {/* 新規スロット追加モーダル */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">スロット追加</h2>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                日付: <span className="font-bold">{selectedDate}</span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">案件を選択 *</label>
              <select
                value={selectedJobPost}
                onChange={(e) => setSelectedJobPost(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">選択してください</option>
                {jobPosts.map((jp) => (
                  <option key={jp.id} value={jp.id}>
                    {jp.title} ({jp.project_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={handleAddSlot}
                disabled={addingSlot || !selectedJobPost}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {addingSlot ? '追加中...' : '追加'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
