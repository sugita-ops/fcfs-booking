/**
 * モックデータ: 会社マスター
 */

import { MockCompany } from './types';

const TENANT_ID = 'tenant-demo-001';

export const mockCompanies: MockCompany[] = [
  // 元請け業者 (2社)
  {
    id: 'gc-001',
    tenant_id: TENANT_ID,
    name: '東建総合建設株式会社',
    is_gc: true,
    trades: 'general_construction',
    address: '東京都新宿区西新宿1-1-1',
    contact_name: '田中 太郎',
    contact_phone: '03-1234-5678',
    contact_email: 'tanaka@toukensogyo.co.jp',
    rating: 4.8,
    is_active: true,
    created_at: '2024-01-15T09:00:00Z'
  },
  {
    id: 'gc-002',
    tenant_id: TENANT_ID,
    name: '大和建設工業株式会社',
    is_gc: true,
    trades: 'general_construction',
    address: '東京都港区六本木6-10-1',
    contact_name: '佐藤 一郎',
    contact_phone: '03-2345-6789',
    contact_email: 'sato@daiwakensetsu.co.jp',
    rating: 4.9,
    is_active: true,
    created_at: '2024-01-20T10:00:00Z'
  },

  // 下請け業者 (8社 - 最小限)
  {
    id: 'sub-001',
    tenant_id: TENANT_ID,
    name: '山田基礎工業',
    is_gc: false,
    trades: 'foundation',
    address: '東京都品川区大井1-2-3',
    contact_name: '山田 次郎',
    contact_phone: '03-3456-7890',
    contact_email: 'yamada@kiso.co.jp',
    rating: 4.5,
    is_active: true,
    created_at: '2024-02-01T09:00:00Z'
  },
  {
    id: 'sub-002',
    tenant_id: TENANT_ID,
    name: '鈴木鉄筋株式会社',
    is_gc: false,
    trades: 'rebar',
    address: '東京都渋谷区渋谷2-21-1',
    contact_name: '鈴木 健二',
    contact_phone: '03-4567-8901',
    contact_email: 'suzuki@tekkin.co.jp',
    rating: 4.7,
    is_active: true,
    created_at: '2024-02-05T10:00:00Z'
  },
  {
    id: 'sub-003',
    tenant_id: TENANT_ID,
    name: '佐藤型枠工事',
    is_gc: false,
    trades: 'formwork',
    address: '神奈川県横浜市西区みなとみらい3-1-1',
    contact_name: '佐藤 三郎',
    contact_phone: '045-1234-5678',
    contact_email: 'sato@katawaku.co.jp',
    rating: 4.3,
    is_active: true,
    created_at: '2024-02-10T11:00:00Z'
  },
  {
    id: 'sub-004',
    tenant_id: TENANT_ID,
    name: '田中内装',
    is_gc: false,
    trades: 'interior',
    address: '東京都豊島区東池袋1-18-1',
    contact_name: '田中 花子',
    contact_phone: '03-5678-9012',
    contact_email: 'tanaka@naisou.co.jp',
    rating: 4.6,
    is_active: true,
    created_at: '2024-02-15T09:30:00Z'
  },
  {
    id: 'sub-005',
    tenant_id: TENANT_ID,
    name: '高橋電気工業',
    is_gc: false,
    trades: 'electrical',
    address: '埼玉県さいたま市浦和区高砂3-15-1',
    contact_name: '高橋 五郎',
    contact_phone: '048-1234-5678',
    contact_email: 'takahashi@denki.co.jp',
    rating: 4.8,
    is_active: true,
    created_at: '2024-02-20T10:30:00Z'
  },
  {
    id: 'sub-006',
    tenant_id: TENANT_ID,
    name: '伊藤配管設備',
    is_gc: false,
    trades: 'plumbing',
    address: '千葉県千葉市中央区新町1000',
    contact_name: '伊藤 六郎',
    contact_phone: '043-1234-5678',
    contact_email: 'ito@haikan.co.jp',
    rating: 4.4,
    is_active: true,
    created_at: '2024-02-25T11:30:00Z'
  },
  {
    id: 'sub-007',
    tenant_id: TENANT_ID,
    name: '渡辺塗装',
    is_gc: false,
    trades: 'painting',
    address: '神奈川県川崎市中原区小杉町1-403',
    contact_name: '渡辺 七郎',
    contact_phone: '044-1234-5678',
    contact_email: 'watanabe@tosou.co.jp',
    rating: 4.2,
    is_active: true,
    created_at: '2024-03-01T09:00:00Z'
  },
  {
    id: 'sub-008',
    tenant_id: TENANT_ID,
    name: '中村左官工業',
    is_gc: false,
    trades: 'plastering',
    address: '東京都世田谷区三軒茶屋2-11-22',
    contact_name: '中村 八郎',
    contact_phone: '03-6789-0123',
    contact_email: 'nakamura@sakan.co.jp',
    rating: 4.5,
    is_active: true,
    created_at: '2024-03-05T10:00:00Z'
  }
];

// 会社IDから会社情報を取得
export const getCompanyById = (id: string): MockCompany | undefined => {
  return mockCompanies.find(c => c.id === id);
};

// 元請け業者一覧を取得
export const getGeneralContractors = (): MockCompany[] => {
  return mockCompanies.filter(c => c.is_gc);
};

// 下請け業者一覧を取得
export const getSubcontractors = (): MockCompany[] => {
  return mockCompanies.filter(c => !c.is_gc);
};

// 職種で絞り込み
export const getCompaniesByTrade = (trade: string): MockCompany[] => {
  return mockCompanies.filter(c => c.trades.includes(trade));
};
