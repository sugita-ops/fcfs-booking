'use client';

import { useState } from 'react';

interface Subcontractor {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  specialties: string[];
  license: string;
  insuranceNumber: string;
  rating: number;
  completedJobs: number;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface SubcontractorFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subcontractor: Omit<Subcontractor, 'id' | 'rating' | 'completedJobs' | 'status'>) => void;
  subcontractor?: Subcontractor;
}

const specialtyOptions = [
  '基礎工事',
  '鉄筋工事',
  '型枠工事',
  '左官工事',
  '防水工事',
  '内装工事',
  '電気工事',
  '配管工事',
  '塗装工事',
  '屋根工事',
  '建具工事',
  'タイル工事',
  '設備工事',
  '外構工事',
  '解体工事',
  '土工事',
  'その他'
];

export default function SubcontractorForm({ isOpen, onClose, onSubmit, subcontractor }: SubcontractorFormProps) {
  const [formData, setFormData] = useState({
    companyName: subcontractor?.companyName || '',
    contactName: subcontractor?.contactName || '',
    contactEmail: subcontractor?.contactEmail || '',
    contactPhone: subcontractor?.contactPhone || '',
    address: subcontractor?.address || '',
    specialties: subcontractor?.specialties || [],
    license: subcontractor?.license || '',
    insuranceNumber: subcontractor?.insuranceNumber || '',
    description: subcontractor?.description || ''
  });

  const [selectedSpecialty, setSelectedSpecialty] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();

    // フォームをリセット
    setFormData({
      companyName: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      specialties: [],
      license: '',
      insuranceNumber: '',
      description: ''
    });
    setSelectedSpecialty('');
  };

  const addSpecialty = () => {
    if (selectedSpecialty && !formData.specialties.includes(selectedSpecialty)) {
      setFormData({
        ...formData,
        specialties: [...formData.specialties, selectedSpecialty]
      });
      setSelectedSpecialty('');
    }
  };

  const removeSpecialty = (index: number) => {
    setFormData({
      ...formData,
      specialties: formData.specialties.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-purple-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {subcontractor ? '下請け業者情報編集' : '新規業者登録'}
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[calc(90vh-80px)] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 会社名 */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
                会社名 *
              </label>
              <input
                type="text"
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 基礎工事株式会社"
                required
              />
            </div>

            {/* 担当者名 */}
            <div>
              <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-2">
                担当者名 *
              </label>
              <input
                type="text"
                id="contactName"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 田中 太郎"
                required
              />
            </div>

            {/* メールアドレス */}
            <div>
              <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス *
              </label>
              <input
                type="email"
                id="contactEmail"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: tanaka@example.com"
                required
              />
            </div>

            {/* 電話番号 */}
            <div>
              <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700 mb-2">
                電話番号 *
              </label>
              <input
                type="tel"
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 03-1234-5678"
                required
              />
            </div>

            {/* 住所 */}
            <div className="md:col-span-2">
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                住所 *
              </label>
              <input
                type="text"
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 東京都新宿区西新宿1-1-1"
                required
              />
            </div>

            {/* 建設業許可証番号 */}
            <div>
              <label htmlFor="license" className="block text-sm font-medium text-gray-700 mb-2">
                建設業許可証番号
              </label>
              <input
                type="text"
                id="license"
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 東京都知事許可(般-5)第12345号"
              />
            </div>

            {/* 保険番号 */}
            <div>
              <label htmlFor="insuranceNumber" className="block text-sm font-medium text-gray-700 mb-2">
                労災保険番号
              </label>
              <input
                type="text"
                id="insuranceNumber"
                value={formData.insuranceNumber}
                onChange={(e) => setFormData({ ...formData, insuranceNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="例: 1234567890"
              />
            </div>

            {/* 専門分野 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                専門分野 *
              </label>
              <div className="flex gap-2 mb-2">
                <select
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">専門分野を選択</option>
                  {specialtyOptions.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addSpecialty}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                >
                  追加
                </button>
              </div>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.specialties.map((specialty, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
                    >
                      {specialty}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(index)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {formData.specialties.length === 0 && (
                <p className="text-sm text-red-600">少なくとも1つの専門分野を選択してください</p>
              )}
            </div>

            {/* 会社説明・PR */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                会社説明・PR
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="会社の特徴、強み、実績などをアピールしてください"
              />
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">登録時の注意事項</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 登録後、審査を経て承認されると工事案件への応募が可能になります</li>
              <li>• 正確な情報を入力してください。虚偽の情報は承認の取り消しの対象となります</li>
              <li>• 建設業許可証や労災保険の加入は必須ではありませんが、信頼性向上のため推奨されます</li>
              <li>• 専門分野は適切な案件のマッチングのために重要です</li>
            </ul>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={formData.specialties.length === 0}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {subcontractor ? '更新' : '登録'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}