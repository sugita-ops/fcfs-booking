'use client';

import { useState } from 'react';
import { ClaimRequest } from '@/types/api';

interface JobSlotWithPost {
  id: string;
  work_date: string;
  job_post: {
    id: string;
    title: string;
    trade: string;
    description: string | null;
    unit_price: number;
    currency: string;
    start_date: string;
    end_date: string;
  };
}

interface BookingFormProps {
  slot: JobSlotWithPost;
  onClose: () => void;
  onSuccess: () => void;
}

interface BookingFormData {
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
}

export default function BookingForm({ slot, onClose, onSuccess }: BookingFormProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    companyId: '',
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    numberOfWorkers: 1,
    equipmentNeeded: '',
    specialRequests: '',
    emergencyContact: '',
    insuranceNumber: ''
  });

  const [errors, setErrors] = useState<Partial<BookingFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: 基本情報, 2: 詳細情報, 3: 確認

  // バリデーション
  const validateStep1 = (): boolean => {
    const newErrors: Partial<BookingFormData> = {};

    if (!formData.companyId.trim()) {
      newErrors.companyId = '会社IDは必須です';
    }
    if (!formData.companyName.trim()) {
      newErrors.companyName = '会社名は必須です';
    }
    if (!formData.contactName.trim()) {
      newErrors.contactName = '担当者名は必須です';
    }
    if (!formData.contactEmail.trim()) {
      newErrors.contactEmail = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = '有効なメールアドレスを入力してください';
    }
    if (!formData.contactPhone.trim()) {
      newErrors.contactPhone = '電話番号は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Partial<BookingFormData> = {};

    if (formData.numberOfWorkers < 1 || formData.numberOfWorkers > 50) {
      newErrors.numberOfWorkers = '作業員数は1〜50人の範囲で入力してください';
    }
    if (!formData.emergencyContact.trim()) {
      newErrors.emergencyContact = '緊急連絡先は必須です';
    }
    if (!formData.insuranceNumber.trim()) {
      newErrors.insuranceNumber = '保険番号は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // フォーム送信
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const claimRequest: ClaimRequest = {
        slotId: slot.id,
        companyId: formData.companyId.trim(),
        requestId: `req-${Date.now()}`
      };

      const response = await fetch('/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(claimRequest),
      });

      if (response.ok) {
        // 成功時は予約詳細をローカルストレージに保存
        const bookingDetails = {
          ...formData,
          slotId: slot.id,
          slotTitle: slot.job_post.title,
          workDate: slot.work_date,
          bookedAt: new Date().toISOString(),
          status: 'confirmed'
        };

        const existingBookings = JSON.parse(localStorage.getItem('userBookings') || '[]');
        existingBookings.push(bookingDetails);
        localStorage.setItem('userBookings', JSON.stringify(existingBookings));

        alert('予約が完了しました！');
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`予約に失敗しました: ${error.message || '不明なエラー'}`);
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('予約処理中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleInputChange = (field: keyof BookingFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">工事予約フォーム</h2>
              <p className="text-blue-100">{slot.job_post.title} - {slot.work_date}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>

          {/* ステップインジケーター */}
          <div className="flex mt-4 space-x-2">
            {[1, 2, 3].map((stepNumber) => (
              <div
                key={stepNumber}
                className={`flex-1 h-2 rounded ${
                  stepNumber <= step ? 'bg-white' : 'bg-blue-400'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-blue-100 mt-2">
            ステップ {step}/3: {
              step === 1 ? '基本情報' :
              step === 2 ? '詳細情報' :
              '確認'
            }
          </p>
        </div>

        <div className="p-6">
          {/* ステップ1: 基本情報 */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">基本情報</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    会社ID *
                  </label>
                  <input
                    type="text"
                    value={formData.companyId}
                    onChange={(e) => handleInputChange('companyId', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.companyId ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: company-123"
                  />
                  {errors.companyId && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyId}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    会社名 *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.companyName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: 株式会社サンプル建設"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    担当者名 *
                  </label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => handleInputChange('contactName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.contactName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: 田中太郎"
                  />
                  {errors.contactName && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    メールアドレス *
                  </label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.contactEmail ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: tanaka@company.com"
                  />
                  {errors.contactEmail && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactEmail}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    電話番号 *
                  </label>
                  <input
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.contactPhone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: 03-1234-5678"
                  />
                  {errors.contactPhone && (
                    <p className="text-red-500 text-sm mt-1">{errors.contactPhone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ステップ2: 詳細情報 */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">詳細情報</h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    作業員数 *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.numberOfWorkers}
                    onChange={(e) => handleInputChange('numberOfWorkers', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.numberOfWorkers ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.numberOfWorkers && (
                    <p className="text-red-500 text-sm mt-1">{errors.numberOfWorkers}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    保険番号 *
                  </label>
                  <input
                    type="text"
                    value={formData.insuranceNumber}
                    onChange={(e) => handleInputChange('insuranceNumber', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.insuranceNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: INS-123456789"
                  />
                  {errors.insuranceNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.insuranceNumber}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    緊急連絡先 *
                  </label>
                  <input
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.emergencyContact ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="例: 090-1234-5678"
                  />
                  {errors.emergencyContact && (
                    <p className="text-red-500 text-sm mt-1">{errors.emergencyContact}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    必要機材・設備
                  </label>
                  <textarea
                    value={formData.equipmentNeeded}
                    onChange={(e) => handleInputChange('equipmentNeeded', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="例: クレーン車、足場材料など"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    特別な要望・注意事項
                  </label>
                  <textarea
                    value={formData.specialRequests}
                    onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="例: アレルギー対応、騒音制限など"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ステップ3: 確認 */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">予約内容確認</h3>

              {/* 工事情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">工事情報</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">工事名:</span> {slot.job_post.title}</p>
                  <p><span className="font-medium">職種:</span> {slot.job_post.trade}</p>
                  <p><span className="font-medium">作業日:</span> {slot.work_date}</p>
                  <p><span className="font-medium">単価:</span> ¥{slot.job_post.unit_price.toLocaleString()}</p>
                </div>
              </div>

              {/* 予約者情報 */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">予約者情報</h4>
                <div className="grid md:grid-cols-2 gap-2 text-sm">
                  <p><span className="font-medium">会社ID:</span> {formData.companyId}</p>
                  <p><span className="font-medium">会社名:</span> {formData.companyName}</p>
                  <p><span className="font-medium">担当者:</span> {formData.contactName}</p>
                  <p><span className="font-medium">メール:</span> {formData.contactEmail}</p>
                  <p><span className="font-medium">電話:</span> {formData.contactPhone}</p>
                  <p><span className="font-medium">作業員数:</span> {formData.numberOfWorkers}人</p>
                  <p><span className="font-medium">緊急連絡先:</span> {formData.emergencyContact}</p>
                  <p><span className="font-medium">保険番号:</span> {formData.insuranceNumber}</p>
                </div>
                {formData.equipmentNeeded && (
                  <p className="mt-2 text-sm"><span className="font-medium">必要機材:</span> {formData.equipmentNeeded}</p>
                )}
                {formData.specialRequests && (
                  <p className="mt-2 text-sm"><span className="font-medium">特別な要望:</span> {formData.specialRequests}</p>
                )}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">注意:</span> 予約確定後のキャンセルは24時間前までに連絡してください。
                </p>
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex justify-between pt-6 border-t">
            <div>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  戻る
                </button>
              )}
            </div>

            <div className="space-x-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>

              {step < 3 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  次へ
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isSubmitting ? '予約中...' : '予約確定'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}