/**
 * 下請け業者の自社情報管理
 */

export interface CompanyProfile {
  userId: string;
  companyId: string;
  // 対応可能職種
  availableTrades: string[];
  // 対応可能エリア
  availablePrefectures: string[]; // 必須
  availableCities: string[]; // 任意
  // 対応可能価格帯
  minimumPrice?: number; // 任意
  // 保有設備
  equipment: string[];
  // 保有資格
  certifications: string[];
  // 更新日時
  updatedAt: string;
}

const STORAGE_KEY_PREFIX = 'companyProfile_';

/**
 * 自社情報を保存
 */
export const saveCompanyProfile = (profile: CompanyProfile): void => {
  const key = `${STORAGE_KEY_PREFIX}${profile.userId}`;
  localStorage.setItem(key, JSON.stringify({
    ...profile,
    updatedAt: new Date().toISOString()
  }));
};

/**
 * 自社情報を取得
 */
export const getCompanyProfile = (userId: string): CompanyProfile | null => {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
};

/**
 * 自社情報を削除
 */
export const deleteCompanyProfile = (userId: string): void => {
  const key = `${STORAGE_KEY_PREFIX}${userId}`;
  localStorage.removeItem(key);
};

/**
 * 自社情報が登録済みかチェック
 */
export const hasCompanyProfile = (userId: string): boolean => {
  const profile = getCompanyProfile(userId);
  if (!profile) return false;

  // 必須項目(職種・都道府県)が設定されているかチェック
  return profile.availableTrades.length > 0 && profile.availablePrefectures.length > 0;
};

/**
 * 職種リスト
 */
export const TRADE_OPTIONS = [
  '基礎工事',
  '鉄筋工事',
  '型枠工事',
  '左官工事',
  '内装仕上げ',
  '電気設備',
  '配管工事'
] as const;

/**
 * 職種の日本語→英語キーマッピング
 */
export const TRADE_KEY_MAP: Record<string, string> = {
  '基礎工事': 'foundation',
  '鉄筋工事': 'rebar',
  '型枠工事': 'formwork',
  '左官工事': 'plastering',
  '内装仕上げ': 'interior',
  '電気設備': 'electrical',
  '配管工事': 'plumbing'
};

/**
 * 都道府県リスト
 */
export const PREFECTURE_OPTIONS = [
  '東京都',
  '神奈川県',
  '埼玉県',
  '千葉県',
  '茨城県',
  '栃木県',
  '群馬県'
] as const;
