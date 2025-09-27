'use client';

import { useEffect, useState } from 'react';

interface Tenant {
  id: string;
  name: string;
  integration_mode: 'standalone' | 'dandori';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantsResponse {
  tenants: Tenant[];
  total_count: number;
}

export default function AdminTenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth_token') || 'dev-token';

      const response = await fetch('/api/admin/tenants', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }

      const data: TenantsResponse = await response.json();
      setTenants(data.tenants);
      setTotalCount(data.total_count);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTenant = async (
    tenantId: string,
    updates: { integration_mode?: 'standalone' | 'dandori'; is_active?: boolean }
  ) => {
    try {
      const token = localStorage.getItem('auth_token') || 'dev-token';

      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update tenant');
      }

      const data = await response.json();

      // Update local state
      setTenants(prev => prev.map(tenant =>
        tenant.id === tenantId ? data.tenant : tenant
      ));

      showToast('テナント設定が更新されました', 'success');
      setEditingTenant(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">エラー</h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

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

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">テナント管理</h1>
        <p className="mt-1 text-sm text-gray-600">
          システム内のテナント設定を管理します。({totalCount}件)
        </p>
      </div>

      {/* Tenants table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    テナント名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    連携モード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    作成日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    更新日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingTenant === tenant.id ? (
                        <select
                          value={tenant.integration_mode}
                          onChange={(e) => {
                            const newMode = e.target.value as 'standalone' | 'dandori';
                            updateTenant(tenant.id, { integration_mode: newMode });
                          }}
                          className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="standalone">Standalone</option>
                          <option value="dandori">DandoriWork</option>
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.integration_mode === 'dandori'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {tenant.integration_mode === 'dandori' ? 'DandoriWork' : 'Standalone'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingTenant === tenant.id ? (
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={tenant.is_active}
                            onChange={(e) => {
                              updateTenant(tenant.id, { is_active: e.target.checked });
                            }}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-700">有効</span>
                        </label>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tenant.is_active ? '有効' : '無効'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tenant.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(tenant.updated_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {editingTenant === tenant.id ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingTenant(null)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingTenant(tenant.id)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          編集
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tenants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">テナントが見つかりません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}