'use client';

import { useState } from 'react';

interface JobSlot {
  id: string;
  projectId: string;
  projectName: string;
  trade: string;
  workDate: string;
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  assignedCompany: string | null;
  unitPrice: number;
  description: string;
}

interface SlotFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (slot: Omit<JobSlot, 'id' | 'status' | 'assignedCompany'>) => void;
  slot?: JobSlot;
  projects: Array<{ id: string; name: string; }>;
}

const tradeOptions = [
  '基礎工',
  '鉄筋工',
  '型枠工',
  '左官工',
  '防水工',
  '内装工',
  '電気工事',
  '配管工事',
  '塗装工',
  '屋根工事',
  '建具工事',
  'タイル工',
  '設備工事',
  '外構工事',
  'その他'
];

export default function SlotForm({ isOpen, onClose, onSubmit, slot, projects }: SlotFormProps) {
  const [formData, setFormData] = useState({
    projectId: slot?.projectId || '',
    projectName: slot?.projectName || '',
    trade: slot?.trade || '',
    workDate: slot?.workDate || '',
    unitPrice: slot?.unitPrice || 0,
    description: slot?.description || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // プロジェクト名を取得
    const selectedProject = projects.find(p => p.id === formData.projectId);
    const projectName = selectedProject ? selectedProject.name : formData.projectName;

    onSubmit({
      ...formData,
      projectName
    });
    onClose();

    // フォームをリセット
    setFormData({
      projectId: '',
      projectName: '',
      trade: '',
      workDate: '',
      unitPrice: 0,
      description: ''
    });
  };

  const handleProjectChange = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    setFormData({
      ...formData,
      projectId,
      projectName: selectedProject ? selectedProject.name : ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-green-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {slot ? '工事スロット編集' : '新規スロット作成'}
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
            {/* プロジェクト選択 */}
            <div className="md:col-span-2">
              <label htmlFor="projectId" className="block text-sm font-medium text-gray-700 mb-2">
                プロジェクト *
              </label>
              <select
                id="projectId"
                value={formData.projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">プロジェクトを選択してください</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 職種 */}
            <div>
              <label htmlFor="trade" className="block text-sm font-medium text-gray-700 mb-2">
                職種 *
              </label>
              <select
                id="trade"
                value={formData.trade}
                onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">職種を選択してください</option>
                {tradeOptions.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>

            {/* 作業日 */}
            <div>
              <label htmlFor="workDate" className="block text-sm font-medium text-gray-700 mb-2">
                作業日 *
              </label>
              <input
                type="date"
                id="workDate"
                value={formData.workDate}
                onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>

            {/* 単価 */}
            <div className="md:col-span-2">
              <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-2">
                単価 (円) *
              </label>
              <input
                type="number"
                id="unitPrice"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="例: 150000"
                min="0"
                step="1000"
                required
              />
            </div>

            {/* 作業内容・詳細 */}
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                作業内容・詳細
              </label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="作業の詳細内容や注意事項を入力してください"
              />
            </div>
          </div>

          {/* 注意事項 */}
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">スロット作成時の注意</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 作成後、下請け業者が予約可能になります</li>
              <li>• 単価は税抜き価格で入力してください</li>
              <li>• 作業日は余裕を持って設定してください</li>
              <li>• 作業内容は具体的に記載することで適切な業者からの応募が期待できます</li>
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
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              {slot ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}