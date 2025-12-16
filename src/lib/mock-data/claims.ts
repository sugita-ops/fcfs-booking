/**
 * モックデータ: 予約(Claims)
 */

import { MockClaim } from './types';
import { mockJobSlots } from './job-slots';

const TENANT_ID = 'tenant-demo-001';

// claimed または completed のスロットから claims を生成
export const mockClaims: MockClaim[] = mockJobSlots
  .filter(slot => slot.status === 'claimed' || slot.status === 'completed')
  .map((slot, index) => ({
    id: `claim-${slot.id}`,
    tenant_id: TENANT_ID,
    job_slot_id: slot.id,
    company_id: slot.claimed_by_company!,
    user_id: slot.claimed_by_user!,
    request_id: `req-${slot.id}-${Date.now()}`,
    claimed_at: slot.claimed_at!,
    // 拡張情報 (一部のclaimにのみ付与)
    number_of_workers: index % 3 === 0 ? Math.floor(Math.random() * 10) + 3 : undefined,
    equipment_needed: index % 4 === 0 ? 'クレーン車、足場材料' : undefined,
    special_requests: index % 5 === 0 ? '騒音制限あり(午前8時〜午後5時)' : undefined,
    emergency_contact: index % 2 === 0 ? '090-9999-8888' : undefined,
    insurance_number: `INS-${Math.floor(Math.random() * 1000000)}`
  }));

// ClaimIDからClaim情報を取得
export const getClaimById = (id: string): MockClaim | undefined => {
  return mockClaims.find(c => c.id === id);
};

// スロットIDからClaim情報を取得
export const getClaimBySlotId = (slotId: string): MockClaim | undefined => {
  return mockClaims.find(c => c.job_slot_id === slotId);
};

// 会社IDでClaimを絞り込み
export const getClaimsByCompany = (companyId: string): MockClaim[] => {
  return mockClaims.filter(c => c.company_id === companyId);
};

// ユーザーIDでClaimを絞り込み
export const getClaimsByUser = (userId: string): MockClaim[] => {
  return mockClaims.filter(c => c.user_id === userId);
};

// Request IDでClaimを検索 (冪等性チェック用)
export const getClaimByRequestId = (requestId: string): MockClaim | undefined => {
  return mockClaims.find(c => c.request_id === requestId);
};

console.log(`[Mock Data] Generated ${mockClaims.length} claims`);
