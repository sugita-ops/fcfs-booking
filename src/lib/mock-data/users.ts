/**
 * モックデータ: ユーザーマスター
 */

import { MockUser, MockUserWithCompany } from './types';
import { mockCompanies, getCompanyById } from './companies';

export const mockUsers: MockUser[] = [
  // 元請け業者のユーザー
  {
    id: 'user-gc-001',
    email: 'tanaka@toukensogyo.co.jp',
    name: '田中 太郎',
    phone: '090-1234-5678',
    company_id: 'gc-001',
    role: 'gc_admin',
    is_active: true
  },
  {
    id: 'user-gc-002',
    email: 'suzuki@toukensogyo.co.jp',
    name: '鈴木 花子',
    phone: '090-2345-6789',
    company_id: 'gc-001',
    role: 'worker',
    is_active: true
  },
  {
    id: 'user-gc-003',
    email: 'sato@daiwakensetsu.co.jp',
    name: '佐藤 一郎',
    phone: '090-3456-7890',
    company_id: 'gc-002',
    role: 'gc_admin',
    is_active: true
  },

  // 下請け業者のユーザー
  {
    id: 'user-sub-001',
    email: 'yamada@kiso.co.jp',
    name: '山田 次郎',
    phone: '090-4567-8901',
    company_id: 'sub-001',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-002',
    email: 'suzuki@tekkin.co.jp',
    name: '鈴木 健二',
    phone: '090-5678-9012',
    company_id: 'sub-002',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-003',
    email: 'sato@katawaku.co.jp',
    name: '佐藤 三郎',
    phone: '090-6789-0123',
    company_id: 'sub-003',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-004',
    email: 'tanaka@naisou.co.jp',
    name: '田中 花子',
    phone: '090-7890-1234',
    company_id: 'sub-004',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-005',
    email: 'takahashi@denki.co.jp',
    name: '高橋 五郎',
    phone: '090-8901-2345',
    company_id: 'sub-005',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-006',
    email: 'ito@haikan.co.jp',
    name: '伊藤 六郎',
    phone: '090-9012-3456',
    company_id: 'sub-006',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-007',
    email: 'watanabe@tosou.co.jp',
    name: '渡辺 七郎',
    phone: '090-0123-4567',
    company_id: 'sub-007',
    role: 'sub_admin',
    is_active: true
  },
  {
    id: 'user-sub-008',
    email: 'nakamura@sakan.co.jp',
    name: '中村 八郎',
    phone: '090-1234-5670',
    company_id: 'sub-008',
    role: 'sub_admin',
    is_active: true
  }
];

// ユーザーIDからユーザー情報を取得
export const getUserById = (id: string): MockUser | undefined => {
  return mockUsers.find(u => u.id === id);
};

// ユーザーIDから会社情報付きユーザー情報を取得
export const getUserWithCompany = (id: string): MockUserWithCompany | undefined => {
  const user = getUserById(id);
  if (!user) return undefined;

  const company = getCompanyById(user.company_id);
  if (!company) return undefined;

  return {
    ...user,
    company
  };
};

// メールアドレスからユーザーを検索
export const getUserByEmail = (email: string): MockUser | undefined => {
  return mockUsers.find(u => u.email === email);
};

// 会社IDから所属ユーザー一覧を取得
export const getUsersByCompany = (companyId: string): MockUser[] => {
  return mockUsers.filter(u => u.company_id === companyId);
};

// 開発用: クイックログインユーザー
export const getQuickLoginUsers = () => {
  return {
    gc_admin: getUserWithCompany('user-gc-001'),  // 元請け管理者
    sub_admin: getUserWithCompany('user-sub-001') // 下請け管理者
  };
};
