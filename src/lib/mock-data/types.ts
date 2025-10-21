/**
 * モックデータ用の型定義
 */

// 会社情報
export interface MockCompany {
  id: string;
  tenant_id: string;
  name: string;
  is_gc: boolean; // true: 元請け, false: 下請け
  trades: string; // カンマ区切り
  address: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  rating: number; // 0.00 - 5.00
  is_active: boolean;
  created_at: string;
}

// ユーザー情報
export interface MockUser {
  id: string;
  email: string;
  name: string;
  phone: string;
  company_id: string;
  role: 'gc_admin' | 'sub_admin' | 'worker';
  is_active: boolean;
}

// プロジェクト情報
export interface MockProject {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;
  created_by: string; // user_id
  created_at: string;
}

// 工事案件
export interface MockJobPost {
  id: string;
  tenant_id: string;
  project_id: string;
  trade: string;
  title: string;
  description: string;
  unit_price: number; // 円
  start_date: string;
  end_date: string;
  capacity: number; // スロット数
  is_published: boolean;
  created_at: string;
}

// 工事スロット
export interface MockJobSlot {
  id: string;
  tenant_id: string;
  job_post_id: string;
  work_date: string; // YYYY-MM-DD
  status: 'available' | 'claimed' | 'completed' | 'cancelled';
  claimed_by_company: string | null;
  claimed_by_user: string | null;
  claimed_at: string | null;
  slot_no: number;
  created_at: string;
}

// 予約情報
export interface MockClaim {
  id: string;
  tenant_id: string;
  job_slot_id: string;
  company_id: string;
  user_id: string;
  request_id: string;
  claimed_at: string;
  // 拡張情報
  number_of_workers?: number;
  equipment_needed?: string;
  special_requests?: string;
  emergency_contact?: string;
  insurance_number?: string;
}

// スロットと案件を結合したビュー
export interface MockJobSlotWithPost extends MockJobSlot {
  job_post: MockJobPost;
  project: MockProject;
}

// ユーザーと会社を結合したビュー
export interface MockUserWithCompany extends MockUser {
  company: MockCompany;
}

// 検索パラメータ
export interface SearchParams {
  startDate?: string;
  endDate?: string;
  minPrice?: number;
  maxPrice?: number;
  area?: string;
  status?: string;
  keyword?: string;
  trade?: string;
  sortBy?: 'date' | 'price';
  sortOrder?: 'asc' | 'desc';
}

// 保存された検索条件
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  params: SearchParams;
  created_at: string;
}

// 統計データ (時系列)
export interface TimelineStats {
  date: string;
  available: number;
  claimed: number;
  completed: number;
  revenue: number;
}
