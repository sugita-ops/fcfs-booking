/**
 * モックデータ: 工事スロット
 */

import { MockJobSlot } from './types';

const TENANT_ID = 'tenant-demo-001';

// 日付生成ヘルパー
const addDays = (dateStr: string, days: number): string => {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// スロット生成ヘルパー
const generateSlots = (
  jobPostId: string,
  startDate: string,
  count: number,
  statuses: Array<'available' | 'claimed' | 'completed' | 'cancelled'>
): MockJobSlot[] => {
  const slots: MockJobSlot[] = [];

  for (let i = 0; i < count; i++) {
    const workDate = addDays(startDate, i * 2); // 2日おき
    const status = statuses[i % statuses.length];

    slots.push({
      id: `slot-${jobPostId}-${i + 1}`,
      tenant_id: TENANT_ID,
      job_post_id: jobPostId,
      work_date: workDate,
      status: status,
      claimed_by_company: status === 'claimed' || status === 'completed'
        ? `sub-00${(i % 8) + 1}`
        : null,
      claimed_by_user: status === 'claimed' || status === 'completed'
        ? `user-sub-00${(i % 8) + 1}`
        : null,
      claimed_at: status === 'claimed' || status === 'completed'
        ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      slot_no: i + 1,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    });
  }

  return slots;
};

export const mockJobSlots: MockJobSlot[] = [
  // job-001: 基礎工事 (7スロット)
  ...generateSlots('job-001', '2024-11-05', 7, ['available', 'available', 'claimed', 'completed', 'available', 'claimed', 'available']),

  // job-002: 鉄筋組立工事 (7スロット)
  ...generateSlots('job-002', '2024-11-25', 7, ['available', 'claimed', 'available', 'available', 'claimed', 'completed', 'available']),

  // job-003: 型枠工事 (7スロット)
  ...generateSlots('job-003', '2024-12-01', 7, ['available', 'available', 'available', 'claimed', 'available', 'claimed', 'completed']),

  // job-004: 内装仕上げ工事 (6スロット)
  ...generateSlots('job-004', '2025-02-01', 6, ['available', 'available', 'available', 'available', 'available', 'available']),

  // job-005: マンション内装リフォーム (7スロット)
  ...generateSlots('job-005', '2024-12-05', 7, ['claimed', 'completed', 'available', 'claimed', 'available', 'available', 'claimed']),

  // job-006: 配管設備更新工事 (6スロット)
  ...generateSlots('job-006', '2024-12-10', 6, ['available', 'claimed', 'available', 'completed', 'available', 'claimed']),

  // job-007: 電気設備工事 (5スロット)
  ...generateSlots('job-007', '2025-01-10', 5, ['available', 'available', 'available', 'available', 'claimed']),

  // job-008: 商業施設基礎工事 (6スロット)
  ...generateSlots('job-008', '2024-11-01', 6, ['completed', 'completed', 'claimed', 'claimed', 'available', 'available']),

  // job-009: 鉄筋工事 (7スロット)
  ...generateSlots('job-009', '2024-12-05', 7, ['available', 'claimed', 'available', 'claimed', 'available', 'available', 'completed']),

  // job-010: 店舗内装工事 (7スロット)
  ...generateSlots('job-010', '2025-03-01', 7, ['available', 'available', 'available', 'available', 'available', 'available', 'available']),

  // job-011: 工場基礎工事 (5スロット)
  ...generateSlots('job-011', '2024-12-15', 5, ['available', 'available', 'claimed', 'available', 'available']),

  // job-012: 型枠工事 (6スロット)
  ...generateSlots('job-012', '2025-01-15', 6, ['available', 'available', 'available', 'claimed', 'available', 'available']),

  // job-013: 戸建て基礎工事 (5スロット)
  ...generateSlots('job-013', '2024-11-25', 5, ['completed', 'claimed', 'available', 'available', 'claimed']),

  // job-014: 戸建て型枠工事 (5スロット)
  ...generateSlots('job-014', '2024-12-10', 5, ['available', 'claimed', 'available', 'available', 'available']),

  // job-015: 戸建て内装工事 (6スロット)
  ...generateSlots('job-015', '2025-01-05', 6, ['available', 'available', 'available', 'available', 'claimed', 'available'])
];

// スロットIDからスロット情報を取得
export const getJobSlotById = (id: string): MockJobSlot | undefined => {
  return mockJobSlots.find(js => js.id === id);
};

// 工事案件IDで絞り込み
export const getJobSlotsByJobPost = (jobPostId: string): MockJobSlot[] => {
  return mockJobSlots.filter(js => js.job_post_id === jobPostId);
};

// ステータスで絞り込み
export const getJobSlotsByStatus = (status: string): MockJobSlot[] => {
  return mockJobSlots.filter(js => js.status === status);
};

// 利用可能なスロットのみ取得
export const getAvailableSlots = (): MockJobSlot[] => {
  return mockJobSlots.filter(js => js.status === 'available');
};

// 日付範囲で絞り込み
export const getJobSlotsByDateRange = (startDate: string, endDate: string): MockJobSlot[] => {
  return mockJobSlots.filter(js => {
    return js.work_date >= startDate && js.work_date <= endDate;
  });
};

// 会社IDで予約済みスロットを取得
export const getJobSlotsByCompany = (companyId: string): MockJobSlot[] => {
  return mockJobSlots.filter(js => js.claimed_by_company === companyId);
};

console.log(`[Mock Data] Generated ${mockJobSlots.length} job slots`);
