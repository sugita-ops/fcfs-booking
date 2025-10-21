/**
 * 自社情報によるフィルタリングロジック
 */

import { CompanyProfile, TRADE_KEY_MAP } from './company-profile';
import { MockJobSlotWithPost } from './mock-data';

/**
 * 自社情報に基づいてスロットをフィルタリング
 */
export const filterSlotsByCompanyProfile = (
  slots: MockJobSlotWithPost[],
  profile: CompanyProfile | null
): MockJobSlotWithPost[] => {
  // プロフィール未登録の場合は全件返す
  if (!profile) return slots;

  return slots.filter(slot => {
    // 1. 職種チェック (必須条件)
    // 日本語の職種を英語キーに変換してチェック
    const availableTradeKeys = profile.availableTrades.map(t => TRADE_KEY_MAP[t] || t);
    const tradeMatch = availableTradeKeys.includes(slot.job_post.trade);
    if (!tradeMatch) return false;

    // 2. エリアチェック (必須条件)
    const address = slot.project.address;

    // 都道府県チェック
    const prefectureMatch = profile.availablePrefectures.some(pref =>
      address.includes(pref)
    );
    if (!prefectureMatch) return false;

    // 市区町村チェック (指定がある場合のみ)
    if (profile.availableCities.length > 0) {
      const cityMatch = profile.availableCities.some(city =>
        address.includes(city)
      );
      if (!cityMatch) return false;
    }

    // 3. 価格チェック (任意条件)
    if (profile.minimumPrice !== undefined) {
      if (slot.job_post.unit_price < profile.minimumPrice) {
        return false;
      }
    }

    // すべての条件を満たした
    return true;
  });
};
