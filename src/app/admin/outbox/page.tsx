'use client';

import { useEffect, useState } from 'react';

interface OutboxEvent {
  id: number;
  event_id: string;
  event_name: string;
  payload: any;
  target: string;
  status: 'pending' | 'sent' | 'failed';
  retry_count: number;
  next_attempt_at: string;
  created_at: string;
  updated_at: string;
}

interface OutboxResponse {
  events: OutboxEvent[];
  total_count: number;
  filtered_count: number;
}

type TabType = 'pending' | 'sent' | 'failed';

export default function AdminOutboxPage() {
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [selectedEvent, setSelectedEvent] = useState<OutboxEvent | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, [activeTab]);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || 'dev-token';

      const response = await fetch(`/api/admin/outbox?status=${activeTab}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch outbox events');
      }

      const data: OutboxResponse = await response.json();
      setEvents(data.events);
      setTotalCount(data.total_count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const requeueEvent = async (eventId: number) => {
    try {
      const token = localStorage.getItem('auth_token') || 'dev-token';

      const response = await fetch(`/api/admin/outbox/${eventId}/requeue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to requeue event');
      }

      showToast('イベントを再送キューに追加しました', 'success');
      fetchEvents(); // Refresh the list
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unknown error', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP');
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      sent: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    const labels = {
      pending: '送信待機',
      sent: '送信完了',
      failed: '送信失敗'
    };

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[status as keyof typeof colors]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const tabs = [
    { id: 'pending' as TabType, label: '送信待機', color: 'text-yellow-600' },
    { id: 'sent' as TabType, label: '送信完了', color: 'text-green-600' },
    { id: 'failed' as TabType, label: '送信失敗', color: 'text-red-600' }
  ];

  return (
    <div>
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`text-sm ${
            toast.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Event detail modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">イベント詳細</h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">閉じる</span>
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Event ID</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedEvent.event_id}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Event Name</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedEvent.event_name}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1">{getStatusBadge(selectedEvent.status)}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Retry Count</dt>
                  <dd className="mt-1 text-sm text-gray-900">{selectedEvent.retry_count}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Next Attempt</dt>
                  <dd className="mt-1 text-sm text-gray-900">{formatDate(selectedEvent.next_attempt_at)}</dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500">Payload</dt>
                  <dd className="mt-1">
                    <pre className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </dd>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                {selectedEvent.status === 'failed' && (
                  <button
                    onClick={() => {
                      requeueEvent(selectedEvent.id);
                      setSelectedEvent(null);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    再送
                  </button>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">アウトボックス監視</h1>
        <p className="mt-1 text-sm text-gray-600">
          外部システムへの送信イベントを監視・管理します。
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">読み込み中...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retry Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Next Attempt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.event_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.event_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.target}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.retry_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(event.next_attempt_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(event.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedEvent(event)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            詳細
                          </button>
                          {event.status === 'failed' && (
                            <button
                              onClick={() => requeueEvent(event.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              再送
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {events.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">{activeTab} イベントが見つかりません</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}