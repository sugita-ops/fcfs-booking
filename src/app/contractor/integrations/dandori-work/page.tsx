'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { DandoriWorkConfig, SyncHistory } from '@/types/dandori-work';

export const dynamic = 'force-dynamic';

interface SyncResult {
  newProjects: { id: string; name: string }[];
  updatedProjects: { id: string; name: string }[];
  totalSites: number;
}

export default function DandoriWorkIntegrationPage() {
  const router = useRouter();
  const [config, setConfig] = useState<DandoriWorkConfig>({
    apiKey: '',
    placeCode: '',
    baseUrl: 'https://api.dandoli.jp/api',
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sitesCount?: number;
  } | null>(null);

  const [syncHistory, setSyncHistory] = useState<SyncHistory[]>([]);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Load saved config from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem('dandoriWorkConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setConfig(parsed);
      } catch (error) {
        console.error('Failed to load saved config:', error);
      }
    }

    // Load sync history
    const savedHistory = localStorage.getItem('dandoriWorkSyncHistory');
    if (savedHistory) {
      try {
        setSyncHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Failed to load sync history:', error);
      }
    }
  }, []);

  // Save config to localStorage
  const saveConfig = () => {
    localStorage.setItem('dandoriWorkConfig', JSON.stringify(config));
    alert('設定を保存しました');
  };

  // Test API connection
  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/dandori-work/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        setTestResult({
          success: true,
          message: `接続成功！ 現場数: ${data.data.sitesCount}件`,
          sitesCount: data.data.sitesCount,
        });
      } else {
        setTestResult({
          success: false,
          message: `接続失敗: ${data.error?.message || '不明なエラー'}`,
        });
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: `エラー: ${(error as Error).message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Execute sync
  const executeSync = async () => {
    if (!confirm('ダンドリワークから現場情報を同期しますか？')) {
      return;
    }

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      // Get existing projects from localStorage
      const existingProjects = JSON.parse(
        localStorage.getItem('projects') || '[]'
      );

      const response = await fetch('/api/dandori-work/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-existing-projects': JSON.stringify(existingProjects),
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        // Update projects in localStorage
        const mergedProjects = [
          ...existingProjects.filter(
            (p: { source?: string }) => p.source !== 'dandori-work'
          ),
          ...data.data.newProjects,
          ...data.data.updatedProjects,
        ];

        console.log('[Sync UI] Merged projects:', mergedProjects);
        localStorage.setItem('projects', JSON.stringify(mergedProjects));

        // Save sync history
        const newHistory = [data.syncHistory, ...syncHistory].slice(0, 10);
        setSyncHistory(newHistory);
        localStorage.setItem('dandoriWorkSyncHistory', JSON.stringify(newHistory));

        setLastSyncResult(data.data);

        alert(
          `同期完了！\n新規: ${data.data.newProjects.length}件\n更新: ${data.data.updatedProjects.length}件\n\nプロジェクト管理タブで確認してください。`
        );

        // プロジェクト管理タブに戻る
        router.push('/contractor');
      } else {
        alert(`同期失敗: ${data.error?.message || '不明なエラー'}`);
      }
    } catch (error) {
      alert(`エラー: ${(error as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ダンドリワーク API 連携
          </h1>
          <p className="text-gray-600">
            ダンドリワークから現場情報を取得し、プロジェクトとして同期します。
          </p>
        </div>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          ← 戻る
        </button>
      </div>

      {/* API 設定 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">API 設定</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API キー（Bearer Token）
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) =>
                setConfig({ ...config, apiKey: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bearer Token を入力"
            />
            <p className="mt-1 text-sm text-gray-500">
              ダンドリワーク管理画面から取得したAPIキーを入力してください
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プレイスコード
            </label>
            <input
              type="text"
              value={config.placeCode}
              onChange={(e) =>
                setConfig({ ...config, placeCode: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="プレイスコードを入力"
            />
            <p className="mt-1 text-sm text-gray-500">
              組織のプレイスコードを入力してください
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ベースURL（任意）
            </label>
            <input
              type="text"
              value={config.baseUrl}
              onChange={(e) =>
                setConfig({ ...config, baseUrl: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.dandoli.jp/api"
            />
            <p className="mt-1 text-sm text-gray-500">
              デフォルト: https://api.dandoli.jp/api
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={saveConfig}
              disabled={!config.apiKey || !config.placeCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              設定を保存
            </button>

            <button
              onClick={testConnection}
              disabled={!config.apiKey || !config.placeCode || isTesting}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isTesting ? '接続テスト中...' : '接続テスト'}
            </button>
          </div>

          {testResult && (
            <div
              className={`p-4 rounded-md ${
                testResult.success
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  testResult.success ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {testResult.message}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 同期実行 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期実行</h2>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ダンドリワークから現場情報を取得し、プロジェクトとして登録します。
            <br />
            既存のプロジェクトは更新され、新規の現場は追加されます。
          </p>

          <button
            onClick={executeSync}
            disabled={!config.apiKey || !config.placeCode || isSyncing}
            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {isSyncing ? '同期中...' : '今すぐ同期実行'}
          </button>

          {lastSyncResult && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-medium text-blue-900 mb-2">同期結果</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>総現場数: {lastSyncResult.totalSites}件</li>
                <li>新規追加: {lastSyncResult.newProjects.length}件</li>
                <li>更新: {lastSyncResult.updatedProjects.length}件</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 同期履歴 */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">同期履歴</h2>

        {syncHistory.length === 0 ? (
          <p className="text-sm text-gray-500">同期履歴がありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    実行日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ステータス
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    新規
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    更新
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {syncHistory.map((history) => (
                  <tr key={history.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(history.startedAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          history.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : history.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {history.status === 'completed'
                          ? '完了'
                          : history.status === 'failed'
                          ? '失敗'
                          : '実行中'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {history.projectsAdded}件
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {history.projectsUpdated}件
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
