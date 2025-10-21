/**
 * モックデータ: プロジェクト
 */

import { MockProject } from './types';

const TENANT_ID = 'tenant-demo-001';

export const mockProjects: MockProject[] = [
  {
    id: 'proj-001',
    tenant_id: TENANT_ID,
    name: '新宿オフィスビル建設',
    address: '東京都新宿区西新宿1-1-1',
    start_date: '2024-11-01',
    end_date: '2025-03-31',
    created_by: 'user-gc-001',
    created_at: '2024-10-01T09:00:00Z'
  },
  {
    id: 'proj-002',
    tenant_id: TENANT_ID,
    name: '渋谷マンション改修',
    address: '東京都渋谷区道玄坂2-10-12',
    start_date: '2024-12-01',
    end_date: '2025-02-28',
    created_by: 'user-gc-001',
    created_at: '2024-10-15T10:00:00Z'
  },
  {
    id: 'proj-003',
    tenant_id: TENANT_ID,
    name: '品川駅前商業施設',
    address: '東京都品川区高輪4-10-18',
    start_date: '2024-10-15',
    end_date: '2025-04-30',
    created_by: 'user-gc-002',
    created_at: '2024-09-20T09:00:00Z'
  },
  {
    id: 'proj-004',
    tenant_id: TENANT_ID,
    name: '横浜工場増築工事',
    address: '神奈川県横浜市西区みなとみらい2-2-1',
    start_date: '2024-12-10',
    end_date: '2025-03-15',
    created_by: 'user-gc-002',
    created_at: '2024-11-01T10:00:00Z'
  },
  {
    id: 'proj-005',
    tenant_id: TENANT_ID,
    name: '川崎戸建て住宅',
    address: '神奈川県川崎市中原区小杉町1-403',
    start_date: '2024-11-20',
    end_date: '2025-01-31',
    created_by: 'user-gc-001',
    created_at: '2024-10-25T11:00:00Z'
  }
];

// プロジェクトIDからプロジェクト情報を取得
export const getProjectById = (id: string): MockProject | undefined => {
  return mockProjects.find(p => p.id === id);
};

// エリアでプロジェクトを絞り込み
export const getProjectsByArea = (area: string): MockProject[] => {
  return mockProjects.filter(p => p.address.includes(area));
};

// 期間でプロジェクトを絞り込み
export const getProjectsByDateRange = (startDate: string, endDate: string): MockProject[] => {
  return mockProjects.filter(p => {
    return p.start_date <= endDate && p.end_date >= startDate;
  });
};
