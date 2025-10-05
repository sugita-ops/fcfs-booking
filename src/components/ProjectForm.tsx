'use client';

import { useState } from 'react';

interface Project {
  id: string;
  name: string;
  location: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  startDate: string;
  endDate: string;
  budget: number;
  actualCost: number;
  progress: number;
  subcontractors: string[];
  manager: string;
}

interface ProjectFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (project: Omit<Project, 'id' | 'actualCost' | 'progress'>) => void;
  project?: Project;
}

export default function ProjectForm({ isOpen, onClose, onSubmit, project }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    location: project?.location || '',
    status: project?.status || 'planning',
    startDate: project?.startDate || '',
    endDate: project?.endDate || '',
    budget: project?.budget || 0,
    manager: project?.manager || '',
    subcontractors: project?.subcontractors || []
  });

  const [newSubcontractor, setNewSubcontractor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
    // フォームをリセット
    setFormData({
      name: '',
      location: '',
      status: 'planning',
      startDate: '',
      endDate: '',
      budget: 0,
      manager: '',
      subcontractors: []
    });
  };

  const addSubcontractor = () => {
    if (newSubcontractor.trim() && !formData.subcontractors.includes(newSubcontractor.trim())) {
      setFormData({
        ...formData,
        subcontractors: [...formData.subcontractors, newSubcontractor.trim()]
      });
      setNewSubcontractor('');
    }
  };

  const removeSubcontractor = (index: number) => {
    setFormData({
      ...formData,
      subcontractors: formData.subcontractors.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-blue-600 text-white p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {project ? 'プロジェクト編集' : '新規プロジェクト作成'}
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
            {/* プロジェクト名 */}
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                プロジェクト名 *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: 新宿オフィスビル建設"
                required
              />
            </div>

            {/* 場所 */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                場所 *
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: 東京都新宿区"
                required
              />
            </div>

            {/* ステータス */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                ステータス
              </label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="planning">計画中</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
                <option value="on_hold">保留</option>
              </select>
            </div>

            {/* 開始日 */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                開始日 *
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* 終了日 */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                終了予定日 *
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* 予算 */}
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
                予算 (円) *
              </label>
              <input
                type="number"
                id="budget"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: 15000000"
                required
              />
            </div>

            {/* 担当者 */}
            <div>
              <label htmlFor="manager" className="block text-sm font-medium text-gray-700 mb-2">
                プロジェクト管理者 *
              </label>
              <input
                type="text"
                id="manager"
                value={formData.manager}
                onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例: 山田 太郎"
                required
              />
            </div>

            {/* 下請け業者 */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                関連下請け業者
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newSubcontractor}
                  onChange={(e) => setNewSubcontractor(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="業者名を入力"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSubcontractor())}
                />
                <button
                  type="button"
                  onClick={addSubcontractor}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  追加
                </button>
              </div>
              {formData.subcontractors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.subcontractors.map((sub, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() => removeSubcontractor(index)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
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
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {project ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}