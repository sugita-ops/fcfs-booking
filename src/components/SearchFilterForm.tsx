'use client';

import { useState, useEffect } from 'react';
import { SearchParams, SavedSearch } from '@/lib/mock-data';
import { saveSearch, getSavedSearches, deleteSavedSearch } from '@/lib/mock-data';

interface SearchFilterFormProps {
  onSearch: (params: SearchParams) => void;
  initialParams?: SearchParams;
  showCompanyFilter?: boolean;
  companyFilterEnabled?: boolean;
  onCompanyFilterToggle?: (enabled: boolean) => void;
}

export default function SearchFilterForm({
  onSearch,
  initialParams = {},
  showCompanyFilter = false,
  companyFilterEnabled = false,
  onCompanyFilterToggle
}: SearchFilterFormProps) {
  const [params, setParams] = useState<SearchParams>(initialParams);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false); // モバイル用折りたたみ状態

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (user) {
      const userId = JSON.parse(user).id;
      setCurrentUserId(userId);
      setSavedSearches(getSavedSearches(userId));
    }
  }, []);

  const handleChange = (key: keyof SearchParams, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    onSearch(params);
  };

  const handleReset = () => {
    setParams({});
    onSearch({});
  };

  const handleSaveSearch = () => {
    if (!currentUserId || !searchName.trim()) return;
    saveSearch(currentUserId, searchName.trim(), params);
    setSavedSearches(getSavedSearches(currentUserId));
    setSearchName('');
    setShowSaveDialog(false);
  };

  const handleLoadSearch = (search: SavedSearch) => {
    setParams(search.params);
    onSearch(search.params);
  };

  const handleDeleteSearch = (searchId: string) => {
    if (!currentUserId) return;
    deleteSavedSearch(currentUserId, searchId);
    setSavedSearches(getSavedSearches(currentUserId));
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6">
      {/* モバイルヘッダー: 折りたたみボタン */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-800">検索・フィルタ</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="md:hidden px-3 py-1 text-sm bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
          >
            {isExpanded ? '閉じる' : '開く'}
          </button>
        </div>
        <div className="hidden md:flex gap-2">
          {showCompanyFilter && onCompanyFilterToggle && (
            <label className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={companyFilterEnabled}
                onChange={e => onCompanyFilterToggle(e.target.checked)}
                className="w-4 h-4 text-green-600 rounded"
              />
              <span className="text-sm font-medium text-green-700">自社条件フィルタ</span>
            </label>
          )}
          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
          >
            保存
          </button>
        </div>
      </div>

      {/* モバイル用: 自社条件フィルタトグル */}
      {showCompanyFilter && onCompanyFilterToggle && (
        <div className="md:hidden mb-3">
          <label className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded cursor-pointer">
            <input
              type="checkbox"
              checked={companyFilterEnabled}
              onChange={e => onCompanyFilterToggle(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <span className="text-sm font-medium text-green-700">自社条件フィルタ</span>
          </label>
        </div>
      )}

      {/* 検索フォーム本体: モバイルでは折りたたみ可能 */}
      <div className={`${isExpanded ? 'block' : 'hidden'} md:block`}>

      {/* 保存済み検索 */}
      {savedSearches.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <p className="text-xs text-gray-600 mb-2">保存済み検索</p>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map(search => (
              <div key={search.id} className="flex items-center gap-1 bg-white px-3 py-1 rounded border">
                <button
                  onClick={() => handleLoadSearch(search)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {search.name}
                </button>
                <button
                  onClick={() => handleDeleteSearch(search.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* 日付範囲 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
          <input
            type="date"
            value={params.startDate || ''}
            onChange={e => handleChange('startDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
          <input
            type="date"
            value={params.endDate || ''}
            onChange={e => handleChange('endDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 価格帯 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最低価格</label>
          <input
            type="number"
            placeholder="円"
            value={params.minPrice || ''}
            onChange={e => handleChange('minPrice', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">最高価格</label>
          <input
            type="number"
            placeholder="円"
            value={params.maxPrice || ''}
            onChange={e => handleChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* エリア */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">エリア</label>
          <input
            type="text"
            placeholder="東京都、神奈川県など"
            value={params.area || ''}
            onChange={e => handleChange('area', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ステータス */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
          <select
            value={params.status || ''}
            onChange={e => handleChange('status', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            <option value="available">予約可能</option>
            <option value="claimed">予約済み</option>
            <option value="completed">完了</option>
          </select>
        </div>

        {/* 職種 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">職種</label>
          <select
            value={params.trade || ''}
            onChange={e => handleChange('trade', e.target.value || undefined)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="">すべて</option>
            <option value="基礎工事">基礎工事</option>
            <option value="鉄筋工事">鉄筋工事</option>
            <option value="型枠工事">型枠工事</option>
            <option value="左官工事">左官工事</option>
            <option value="内装仕上げ">内装仕上げ</option>
            <option value="電気設備">電気設備</option>
            <option value="配管工事">配管工事</option>
          </select>
        </div>

        {/* キーワード */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">キーワード</label>
          <input
            type="text"
            placeholder="タイトル、プロジェクト名など"
            value={params.keyword || ''}
            onChange={e => handleChange('keyword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* ソート */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">並び順</label>
          <select
            value={params.sortBy || 'date'}
            onChange={e => handleChange('sortBy', e.target.value as 'date' | 'price')}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="date">日付順</option>
            <option value="price">価格順</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">順序</label>
          <select
            value={params.sortOrder || 'asc'}
            onChange={e => handleChange('sortOrder', e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          >
            <option value="asc">昇順</option>
            <option value="desc">降順</option>
          </select>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          className="flex-1 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
        >
          検索
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          クリア
        </button>
        <button
          onClick={() => setShowSaveDialog(true)}
          className="md:hidden px-4 py-2 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
        >
          保存
        </button>
      </div>
      </div> {/* 折りたたみ div 終了 */}

      {/* 保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">検索条件を保存</h3>
            <input
              type="text"
              placeholder="検索条件名"
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveSearch}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
