'use client';

import { useState, useEffect } from 'react';

interface BookingRecord {
  companyId: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  numberOfWorkers: number;
  equipmentNeeded: string;
  specialRequests: string;
  emergencyContact: string;
  insuranceNumber: string;
  slotId: string;
  slotTitle: string;
  workDate: string;
  bookedAt: string;
  status: 'confirmed' | 'completed' | 'cancelled';
}

interface BookingHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingHistory({ isOpen, onClose }: BookingHistoryProps) {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBookingHistory();
    }
  }, [isOpen]);

  const loadBookingHistory = () => {
    const savedBookings = localStorage.getItem('userBookings');
    if (savedBookings) {
      setBookings(JSON.parse(savedBookings));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '予約確定';
      case 'completed':
        return '完了';
      case 'cancelled':
        return 'キャンセル';
      default:
        return '不明';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cancelBooking = async (booking: BookingRecord) => {
    if (!confirm('この予約をキャンセルしますか？')) {
      return;
    }

    try {
      // API呼び出し（cancel-claim）
      const response = await fetch('/api/cancel-claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slotId: booking.slotId,
          reason: 'client_change'
        }),
      });

      if (response.ok) {
        // ローカルストレージの状態を更新
        const updatedBookings = bookings.map(b =>
          b.slotId === booking.slotId ? { ...b, status: 'cancelled' as const } : b
        );
        setBookings(updatedBookings);
        localStorage.setItem('userBookings', JSON.stringify(updatedBookings));
        alert('予約がキャンセルされました');
      } else {
        alert('キャンセルに失敗しました');
      }
    } catch (error) {
      console.error('Cancel failed:', error);
      alert('キャンセル処理中にエラーが発生しました');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">予約履歴</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex h-[calc(90vh-88px)]">
          {/* 予約リスト */}
          <div className="w-1/2 overflow-y-auto border-r">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">予約一覧</h3>

              {bookings.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">予約履歴がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedBooking === booking ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">{booking.slotTitle}</h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {getStatusText(booking.status)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <p><span className="font-medium">作業日:</span> {booking.workDate}</p>
                        <p><span className="font-medium">会社:</span> {booking.companyName}</p>
                        <p><span className="font-medium">担当者:</span> {booking.contactName}</p>
                        <p><span className="font-medium">予約日時:</span> {formatDate(booking.bookedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 予約詳細 */}
          <div className="w-1/2 overflow-y-auto">
            <div className="p-6">
              {selectedBooking ? (
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">予約詳細</h3>
                    {selectedBooking.status === 'confirmed' && (
                      <button
                        onClick={() => cancelBooking(selectedBooking)}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        予約キャンセル
                      </button>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* 工事情報 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">工事情報</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <p><span className="font-medium">工事名:</span> {selectedBooking.slotTitle}</p>
                        <p><span className="font-medium">作業日:</span> {selectedBooking.workDate}</p>
                        <p><span className="font-medium">ステータス:</span>
                          <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedBooking.status)}`}>
                            {getStatusText(selectedBooking.status)}
                          </span>
                        </p>
                        <p><span className="font-medium">予約日時:</span> {formatDate(selectedBooking.bookedAt)}</p>
                      </div>
                    </div>

                    {/* 会社情報 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">会社情報</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <p><span className="font-medium">会社ID:</span> {selectedBooking.companyId}</p>
                        <p><span className="font-medium">会社名:</span> {selectedBooking.companyName}</p>
                        <p><span className="font-medium">担当者:</span> {selectedBooking.contactName}</p>
                        <p><span className="font-medium">メール:</span> {selectedBooking.contactEmail}</p>
                        <p><span className="font-medium">電話:</span> {selectedBooking.contactPhone}</p>
                        <p><span className="font-medium">緊急連絡先:</span> {selectedBooking.emergencyContact}</p>
                      </div>
                    </div>

                    {/* 作業詳細 */}
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-800 mb-3">作業詳細</h4>
                      <div className="grid md:grid-cols-2 gap-2 text-sm">
                        <p><span className="font-medium">作業員数:</span> {selectedBooking.numberOfWorkers}人</p>
                        <p><span className="font-medium">保険番号:</span> {selectedBooking.insuranceNumber}</p>
                      </div>

                      {selectedBooking.equipmentNeeded && (
                        <div className="mt-3">
                          <p className="font-medium text-sm mb-1">必要機材・設備:</p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {selectedBooking.equipmentNeeded}
                          </p>
                        </div>
                      )}

                      {selectedBooking.specialRequests && (
                        <div className="mt-3">
                          <p className="font-medium text-sm mb-1">特別な要望・注意事項:</p>
                          <p className="text-sm text-gray-700 bg-white p-2 rounded border">
                            {selectedBooking.specialRequests}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 注意事項 */}
                    {selectedBooking.status === 'confirmed' && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <h4 className="font-semibold text-yellow-800 mb-2">重要事項</h4>
                        <ul className="text-sm text-yellow-700 space-y-1">
                          <li>• 作業開始時刻の30分前には現場に到着してください</li>
                          <li>• 安全装備（ヘルメット、安全靴など）は必ず着用してください</li>
                          <li>• キャンセルは作業日の24時間前までにお申し出ください</li>
                          <li>• 天候不良等による中止の場合は別途ご連絡いたします</li>
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600">左側の予約を選択して詳細を表示</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="border-t p-4 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}