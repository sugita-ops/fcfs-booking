'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface BookingRecord {
  companyId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  numberOfWorkers: number;
  slotId: string;
  slotTitle: string;
  workDate: string;
  bookedAt: string;
  status: 'confirmed' | 'completed' | 'cancelled';
}

interface JobSlotStatus {
  id: string;
  title: string;
  trade: string;
  workDate: string;
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimedByCompany: string | null;
  unitPrice: number;
}

interface DashboardStats {
  totalSlots: number;
  availableSlots: number;
  claimedSlots: number;
  completedSlots: number;
  totalRevenue: number;
  todaysBookings: number;
}

export default function Dashboard() {
  const [bookingRecords, setBookingRecords] = useState<BookingRecord[]>([]);
  const [jobSlots, setJobSlots] = useState<JobSlotStatus[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSlots: 0,
    availableSlots: 0,
    claimedSlots: 0,
    completedSlots: 0,
    totalRevenue: 0,
    todaysBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    setLoading(true);

    // ローカルストレージから予約記録を取得
    const savedBookings = localStorage.getItem('userBookings');
    const bookings = savedBookings ? JSON.parse(savedBookings) : [];
    setBookingRecords(bookings);

    // ダミーの工事スロットデータ
    const dummySlots: JobSlotStatus[] = [
      {
        id: 'slot-1',
        title: '基礎工事',
        trade: '基礎工',
        workDate: '2024-12-01',
        status: 'claimed',
        claimedByCompany: 'company-123',
        unitPrice: 150000
      },
      {
        id: 'slot-2',
        title: '鉄筋工事',
        trade: '鉄筋工',
        workDate: '2024-12-03',
        status: 'available',
        claimedByCompany: null,
        unitPrice: 200000
      },
      {
        id: 'slot-3',
        title: '型枠工事',
        trade: '型枠工',
        workDate: '2024-12-05',
        status: 'completed',
        claimedByCompany: 'company-456',
        unitPrice: 180000
      },
      {
        id: 'slot-4',
        title: 'コンクリート打設',
        trade: 'コンクリート工',
        workDate: '2024-12-07',
        status: 'available',
        claimedByCompany: null,
        unitPrice: 220000
      },
      {
        id: 'slot-5',
        title: '仕上げ工事',
        trade: '内装工',
        workDate: '2024-12-10',
        status: 'claimed',
        claimedByCompany: 'company-789',
        unitPrice: 160000
      }
    ];

    setJobSlots(dummySlots);

    // 統計情報を計算
    const totalSlots = dummySlots.length;
    const availableSlots = dummySlots.filter(slot => slot.status === 'available').length;
    const claimedSlots = dummySlots.filter(slot => slot.status === 'claimed').length;
    const completedSlots = dummySlots.filter(slot => slot.status === 'completed').length;
    const totalRevenue = dummySlots
      .filter(slot => slot.status === 'completed')
      .reduce((sum, slot) => sum + slot.unitPrice, 0);

    const today = new Date().toISOString().split('T')[0];
    const todaysBookings = bookings.filter((booking: BookingRecord) =>
      booking.bookedAt.startsWith(today)
    ).length;

    setStats({
      totalSlots,
      availableSlots,
      claimedSlots,
      completedSlots,
      totalRevenue,
      todaysBookings
    });

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'available':
        return '募集中';
      case 'claimed':
        return '予約済み';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return '不明';
    }
  };

  const filteredSlots = jobSlots.filter(slot => {
    const matchesFilter = filter === 'all' || slot.status === filter;
    const matchesSearch = slot.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         slot.trade.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (slot.claimedByCompany && slot.claimedByCompany.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">予約状況ダッシュボード</h1>
          <p className="text-gray-600 mt-2">工事スロットの予約状況をリアルタイムで確認</p>

          <div className="mt-4 flex space-x-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800 transition-colors">
              ← メインページに戻る
            </Link>
            <Link href="/admin" className="text-blue-600 hover:text-blue-800 transition-colors">
              管理画面
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : (
          <>
            {/* 統計情報カード */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">総</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">総スロット数</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalSlots}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">空</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">募集中</p>
                    <p className="text-2xl font-bold text-green-600">{stats.availableSlots}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">予</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">予約済み</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.claimedSlots}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">完</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">完了</p>
                    <p className="text-2xl font-bold text-gray-600">{stats.completedSlots}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">￥</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">完了売上</p>
                    <p className="text-2xl font-bold text-yellow-600">¥{stats.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">今</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">本日の予約</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.todaysBookings}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* フィルターと検索 */}
            <div className="bg-white rounded-lg shadow mb-8 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="flex space-x-4">
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべて</option>
                    <option value="available">募集中</option>
                    <option value="claimed">予約済み</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">キャンセル</option>
                  </select>
                </div>

                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="工事名、職種、会社IDで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={loadDashboardData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  更新
                </button>
              </div>
            </div>

            {/* 工事スロット一覧 */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">工事スロット一覧</h2>
                <p className="text-sm text-gray-600">フィルター結果: {filteredSlots.length}件</p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        工事情報
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        作業日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        単価
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        予約企業
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSlots.map((slot) => (
                      <tr key={slot.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{slot.title}</div>
                            <div className="text-sm text-gray-500">{slot.trade}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(slot.workDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ¥{slot.unitPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(slot.status)}`}>
                            {getStatusText(slot.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {slot.claimedByCompany || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredSlots.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600">条件に一致するスロットがありません</p>
                </div>
              )}
            </div>

            {/* 最近の予約履歴 */}
            {bookingRecords.length > 0 && (
              <div className="mt-8 bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">最近の予約履歴</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          予約日時
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          工事名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          作業日
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          会社名
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          担当者
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {bookingRecords.slice(0, 5).map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(record.bookedAt)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {record.slotTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.workDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.companyName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.contactName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}