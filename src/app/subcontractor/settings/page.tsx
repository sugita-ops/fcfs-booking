'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CompanyProfile,
  saveCompanyProfile,
  getCompanyProfile,
  TRADE_OPTIONS,
  PREFECTURE_OPTIONS
} from '@/lib/company-profile';
import MobileBottomNav from '@/components/MobileBottomNav';

export const dynamic = 'force-dynamic';

export default function SubcontractorSettings() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // フォーム状態
  const [trades, setTrades] = useState<string[]>([]);
  const [prefectures, setPrefectures] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState('');
  const [minimumPrice, setMinimumPrice] = useState<number | undefined>(undefined);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [equipmentInput, setEquipmentInput] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [certificationInput, setCertificationInput] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('currentUser');
    if (!user) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(user);
    setCurrentUser(parsedUser);

    // 既存の自社情報を読み込み
    const profile = getCompanyProfile(parsedUser.id);
    if (profile) {
      setTrades(profile.availableTrades);
      setPrefectures(profile.availablePrefectures);
      setCities(profile.availableCities);
      setMinimumPrice(profile.minimumPrice);
      setEquipment(profile.equipment);
      setCertifications(profile.certifications);
    }

    setLoading(false);
  }, [router]);

  const handleTradeToggle = (trade: string) => {
    setTrades(prev =>
      prev.includes(trade)
        ? prev.filter(t => t !== trade)
        : [...prev, trade]
    );
  };

  const handlePrefectureToggle = (prefecture: string) => {
    setPrefectures(prev =>
      prev.includes(prefecture)
        ? prev.filter(p => p !== prefecture)
        : [...prev, prefecture]
    );
  };

  const handleAddCity = () => {
    if (cityInput.trim() && !cities.includes(cityInput.trim())) {
      setCities([...cities, cityInput.trim()]);
      setCityInput('');
    }
  };

  const handleRemoveCity = (city: string) => {
    setCities(cities.filter(c => c !== city));
  };

  const handleAddEquipment = () => {
    if (equipmentInput.trim() && !equipment.includes(equipmentInput.trim())) {
      setEquipment([...equipment, equipmentInput.trim()]);
      setEquipmentInput('');
    }
  };

  const handleRemoveEquipment = (item: string) => {
    setEquipment(equipment.filter(e => e !== item));
  };

  const handleAddCertification = () => {
    if (certificationInput.trim() && !certifications.includes(certificationInput.trim())) {
      setCertifications([...certifications, certificationInput.trim()]);
      setCertificationInput('');
    }
  };

  const handleRemoveCertification = (item: string) => {
    setCertifications(certifications.filter(c => c !== item));
  };

  const handleSave = () => {
    if (!currentUser) return;

    // バリデーション
    if (trades.length === 0) {
      alert('対応可能職種を1つ以上選択してください');
      return;
    }
    if (prefectures.length === 0) {
      alert('対応可能エリア(都道府県)を1つ以上選択してください');
      return;
    }

    setSaving(true);

    const profile: CompanyProfile = {
      userId: currentUser.id,
      companyId: currentUser.company.id,
      availableTrades: trades,
      availablePrefectures: prefectures,
      availableCities: cities,
      minimumPrice: minimumPrice,
      equipment: equipment,
      certifications: certifications,
      updatedAt: new Date().toISOString()
    };

    saveCompanyProfile(profile);

    setSaving(false);
    alert('自社情報を保存しました');
    router.push('/subcontractor');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-bold text-gray-900">自社情報設定</h1>
            <button
              onClick={() => router.push('/subcontractor')}
              className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
            >
              戻る
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <div className="bg-white rounded-lg shadow p-4 md:p-6 space-y-6 md:space-y-8">
          {/* 対応可能職種 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              対応可能職種 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TRADE_OPTIONS.map(trade => (
                <label key={trade} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trades.includes(trade)}
                    onChange={() => handleTradeToggle(trade)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{trade}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 対応可能エリア - 都道府県 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              対応可能エリア - 都道府県 <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PREFECTURE_OPTIONS.map(prefecture => (
                <label key={prefecture} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={prefectures.includes(prefecture)}
                    onChange={() => handlePrefectureToggle(prefecture)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{prefecture}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 対応可能エリア - 市区町村 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              対応可能エリア - 市区町村 (任意)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddCity()}
                placeholder="例: 新宿区"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCity}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {cities.map(city => (
                <span
                  key={city}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {city}
                  <button
                    onClick={() => handleRemoveCity(city)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 対応可能価格帯 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              最低受注単価 (任意)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">¥</span>
              <input
                type="number"
                value={minimumPrice || ''}
                onChange={e => setMinimumPrice(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="例: 100000"
                className="w-64 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-500">円以上の案件のみ表示</span>
            </div>
          </div>

          {/* 保有設備 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              保有設備
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={equipmentInput}
                onChange={e => setEquipmentInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddEquipment()}
                placeholder="例: クレーン車"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddEquipment}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {equipment.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {item}
                  <button
                    onClick={() => handleRemoveEquipment(item)}
                    className="text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 保有資格 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              保有資格
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={certificationInput}
                onChange={e => setCertificationInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddCertification()}
                placeholder="例: 1級建築施工管理技士"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddCertification}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                追加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {certifications.map(item => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {item}
                  <button
                    onClick={() => handleRemoveCertification(item)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* 保存ボタン - モバイル最適化 */}
          <div className="flex flex-col md:flex-row gap-3 pt-6 border-t">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full md:flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400 text-base"
            >
              {saving ? '保存中...' : '保存'}
            </button>
            <button
              onClick={() => router.push('/subcontractor')}
              className="w-full md:w-auto px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-base"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
