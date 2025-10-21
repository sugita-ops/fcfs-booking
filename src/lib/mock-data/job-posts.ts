/**
 * モックデータ: 工事案件
 */

import { MockJobPost } from './types';

const TENANT_ID = 'tenant-demo-001';

export const mockJobPosts: MockJobPost[] = [
  // 新宿オフィスビル建設 (proj-001)
  {
    id: 'job-001',
    tenant_id: TENANT_ID,
    project_id: 'proj-001',
    trade: 'foundation',
    title: '基礎工事',
    description: 'オフィスビルの基礎杭打ちおよびコンクリート打設',
    unit_price: 150000,
    start_date: '2024-11-05',
    end_date: '2024-11-20',
    capacity: 10,
    is_published: true,
    created_at: '2024-10-20T09:00:00Z'
  },
  {
    id: 'job-002',
    tenant_id: TENANT_ID,
    project_id: 'proj-001',
    trade: 'rebar',
    title: '鉄筋組立工事',
    description: '1階〜5階の鉄筋組立作業',
    unit_price: 200000,
    start_date: '2024-11-25',
    end_date: '2024-12-20',
    capacity: 15,
    is_published: true,
    created_at: '2024-10-20T09:30:00Z'
  },
  {
    id: 'job-003',
    tenant_id: TENANT_ID,
    project_id: 'proj-001',
    trade: 'formwork',
    title: '型枠工事',
    description: '各階の型枠組立・解体作業',
    unit_price: 180000,
    start_date: '2024-12-01',
    end_date: '2025-01-31',
    capacity: 20,
    is_published: true,
    created_at: '2024-10-20T10:00:00Z'
  },
  {
    id: 'job-004',
    tenant_id: TENANT_ID,
    project_id: 'proj-001',
    trade: 'interior',
    title: '内装仕上げ工事',
    description: 'オフィスフロアの内装仕上げ・クロス張り',
    unit_price: 120000,
    start_date: '2025-02-01',
    end_date: '2025-03-15',
    capacity: 12,
    is_published: true,
    created_at: '2024-10-20T10:30:00Z'
  },

  // 渋谷マンション改修 (proj-002)
  {
    id: 'job-005',
    tenant_id: TENANT_ID,
    project_id: 'proj-002',
    trade: 'interior',
    title: 'マンション内装リフォーム',
    description: '各戸の内装張替え・塗装',
    unit_price: 100000,
    start_date: '2024-12-05',
    end_date: '2025-01-20',
    capacity: 15,
    is_published: true,
    created_at: '2024-11-01T09:00:00Z'
  },
  {
    id: 'job-006',
    tenant_id: TENANT_ID,
    project_id: 'proj-002',
    trade: 'plumbing',
    title: '配管設備更新工事',
    description: '給排水管の更新作業',
    unit_price: 130000,
    start_date: '2024-12-10',
    end_date: '2025-01-31',
    capacity: 10,
    is_published: true,
    created_at: '2024-11-01T09:30:00Z'
  },
  {
    id: 'job-007',
    tenant_id: TENANT_ID,
    project_id: 'proj-002',
    trade: 'electrical',
    title: '電気設備工事',
    description: 'コンセント・照明器具の交換',
    unit_price: 110000,
    start_date: '2025-01-10',
    end_date: '2025-02-15',
    capacity: 8,
    is_published: true,
    created_at: '2024-11-01T10:00:00Z'
  },

  // 品川駅前商業施設 (proj-003)
  {
    id: 'job-008',
    tenant_id: TENANT_ID,
    project_id: 'proj-003',
    trade: 'foundation',
    title: '商業施設基礎工事',
    description: '大型商業施設の基礎工事',
    unit_price: 250000,
    start_date: '2024-11-01',
    end_date: '2024-11-30',
    capacity: 12,
    is_published: true,
    created_at: '2024-10-10T09:00:00Z'
  },
  {
    id: 'job-009',
    tenant_id: TENANT_ID,
    project_id: 'proj-003',
    trade: 'rebar',
    title: '鉄筋工事',
    description: '地下〜3階の鉄筋組立',
    unit_price: 220000,
    start_date: '2024-12-05',
    end_date: '2025-01-31',
    capacity: 18,
    is_published: true,
    created_at: '2024-10-10T09:30:00Z'
  },
  {
    id: 'job-010',
    tenant_id: TENANT_ID,
    project_id: 'proj-003',
    trade: 'interior',
    title: '店舗内装工事',
    description: 'テナント区画の内装仕上げ',
    unit_price: 150000,
    start_date: '2025-03-01',
    end_date: '2025-04-15',
    capacity: 20,
    is_published: true,
    created_at: '2024-10-10T10:00:00Z'
  },

  // 横浜工場増築工事 (proj-004)
  {
    id: 'job-011',
    tenant_id: TENANT_ID,
    project_id: 'proj-004',
    trade: 'foundation',
    title: '工場基礎工事',
    description: '増築部分の基礎工事',
    unit_price: 180000,
    start_date: '2024-12-15',
    end_date: '2025-01-10',
    capacity: 8,
    is_published: true,
    created_at: '2024-11-05T09:00:00Z'
  },
  {
    id: 'job-012',
    tenant_id: TENANT_ID,
    project_id: 'proj-004',
    trade: 'formwork',
    title: '型枠工事',
    description: '工場棟の型枠組立',
    unit_price: 160000,
    start_date: '2025-01-15',
    end_date: '2025-02-28',
    capacity: 10,
    is_published: true,
    created_at: '2024-11-05T09:30:00Z'
  },

  // 川崎戸建て住宅 (proj-005)
  {
    id: 'job-013',
    tenant_id: TENANT_ID,
    project_id: 'proj-005',
    trade: 'foundation',
    title: '戸建て基礎工事',
    description: '住宅の基礎工事',
    unit_price: 80000,
    start_date: '2024-11-25',
    end_date: '2024-12-05',
    capacity: 5,
    is_published: true,
    created_at: '2024-11-10T09:00:00Z'
  },
  {
    id: 'job-014',
    tenant_id: TENANT_ID,
    project_id: 'proj-005',
    trade: 'formwork',
    title: '戸建て型枠工事',
    description: '住宅の型枠組立',
    unit_price: 90000,
    start_date: '2024-12-10',
    end_date: '2024-12-20',
    capacity: 5,
    is_published: true,
    created_at: '2024-11-10T09:30:00Z'
  },
  {
    id: 'job-015',
    tenant_id: TENANT_ID,
    project_id: 'proj-005',
    trade: 'interior',
    title: '戸建て内装工事',
    description: '住宅の内装仕上げ',
    unit_price: 85000,
    start_date: '2025-01-05',
    end_date: '2025-01-25',
    capacity: 6,
    is_published: true,
    created_at: '2024-11-10T10:00:00Z'
  }
];

// 工事案件IDから情報を取得
export const getJobPostById = (id: string): MockJobPost | undefined => {
  return mockJobPosts.find(jp => jp.id === id);
};

// プロジェクトIDで絞り込み
export const getJobPostsByProject = (projectId: string): MockJobPost[] => {
  return mockJobPosts.filter(jp => jp.project_id === projectId);
};

// 職種で絞り込み
export const getJobPostsByTrade = (trade: string): MockJobPost[] => {
  return mockJobPosts.filter(jp => jp.trade === trade);
};

// 公開中の案件のみ取得
export const getPublishedJobPosts = (): MockJobPost[] => {
  return mockJobPosts.filter(jp => jp.is_published);
};
