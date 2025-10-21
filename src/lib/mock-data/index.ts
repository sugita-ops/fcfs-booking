/**
 * モックデータ統合エクスポート & Mock API
 */

import {
  SearchParams,
  SavedSearch,
  TimelineStats,
  MockJobSlotWithPost,
  MockUserWithCompany
} from './types';

// 各モックデータをエクスポート
export * from './types';
export * from './companies';
export * from './users';
export * from './projects';
export * from './job-posts';
export * from './job-slots';
export * from './claims';

// インポート
import { mockCompanies, getCompanyById } from './companies';
import { mockUsers, getUserWithCompany, getQuickLoginUsers } from './users';
import { mockProjects, getProjectById } from './projects';
import { mockJobPosts, getJobPostById } from './job-posts';
import { mockJobSlots, getAvailableSlots, getJobSlotsByStatus } from './job-slots';
import { mockClaims, getClaimsByCompany } from './claims';

/**
 * Mock API: スロット一覧取得 (検索・フィルタ対応)
 */
export const getSlots = (params: SearchParams = {}): MockJobSlotWithPost[] => {
  let results = [...mockJobSlots];

  // ステータスフィルタ
  if (params.status) {
    results = results.filter(slot => slot.status === params.status);
  }

  // 日付範囲フィルタ
  if (params.startDate && params.endDate) {
    results = results.filter(slot => {
      return slot.work_date >= params.startDate! && slot.work_date <= params.endDate!;
    });
  } else if (params.startDate) {
    results = results.filter(slot => slot.work_date >= params.startDate!);
  } else if (params.endDate) {
    results = results.filter(slot => slot.work_date <= params.endDate!);
  }

  // JobPostとProjectを結合
  const slotsWithPost: MockJobSlotWithPost[] = results
    .map(slot => {
      const jobPost = getJobPostById(slot.job_post_id);
      if (!jobPost) return null;

      const project = getProjectById(jobPost.project_id);
      if (!project) return null;

      return {
        ...slot,
        job_post: jobPost,
        project: project
      };
    })
    .filter((item): item is MockJobSlotWithPost => item !== null);

  // 価格帯フィルタ
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const filtered = slotsWithPost.filter(slot => {
      const price = slot.job_post.unit_price;
      if (params.minPrice !== undefined && price < params.minPrice) return false;
      if (params.maxPrice !== undefined && price > params.maxPrice) return false;
      return true;
    });
    slotsWithPost.length = 0;
    slotsWithPost.push(...filtered);
  }

  // エリアフィルタ
  if (params.area) {
    const filtered = slotsWithPost.filter(slot =>
      slot.project.address.includes(params.area!)
    );
    slotsWithPost.length = 0;
    slotsWithPost.push(...filtered);
  }

  // 職種フィルタ
  if (params.trade) {
    const filtered = slotsWithPost.filter(slot =>
      slot.job_post.trade === params.trade
    );
    slotsWithPost.length = 0;
    slotsWithPost.push(...filtered);
  }

  // キーワード検索 (タイトル・説明文)
  if (params.keyword) {
    const keyword = params.keyword.toLowerCase();
    const filtered = slotsWithPost.filter(slot => {
      const title = slot.job_post.title.toLowerCase();
      const description = (slot.job_post.description || '').toLowerCase();
      const projectName = slot.project.name.toLowerCase();
      return title.includes(keyword) || description.includes(keyword) || projectName.includes(keyword);
    });
    slotsWithPost.length = 0;
    slotsWithPost.push(...filtered);
  }

  // ソート
  const sortBy = params.sortBy || 'date';
  const sortOrder = params.sortOrder || 'asc';

  slotsWithPost.sort((a, b) => {
    let compareValue = 0;

    if (sortBy === 'date') {
      compareValue = a.work_date.localeCompare(b.work_date);
    } else if (sortBy === 'price') {
      compareValue = a.job_post.unit_price - b.job_post.unit_price;
    }

    return sortOrder === 'asc' ? compareValue : -compareValue;
  });

  return slotsWithPost;
};

/**
 * Mock API: ユーザー情報取得
 */
export const getUserInfo = (userId: string): MockUserWithCompany | null => {
  return getUserWithCompany(userId) || null;
};

/**
 * Mock API: 統計データ取得 (時系列)
 */
export const getStats = (params: {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}): TimelineStats[] => {
  // 簡易実装: 日別データを生成
  const stats: TimelineStats[] = [];
  const start = new Date(params.startDate);
  const end = new Date(params.endDate);

  let current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split('T')[0];

    // その日のスロット状況を集計
    const daySlots = mockJobSlots.filter(slot => slot.work_date === dateStr);

    stats.push({
      date: dateStr,
      available: daySlots.filter(s => s.status === 'available').length,
      claimed: daySlots.filter(s => s.status === 'claimed').length,
      completed: daySlots.filter(s => s.status === 'completed').length,
      revenue: daySlots
        .filter(s => s.status === 'completed')
        .reduce((sum, slot) => {
          const jobPost = getJobPostById(slot.job_post_id);
          return sum + (jobPost?.unit_price || 0);
        }, 0)
    });

    // 次の日へ
    current.setDate(current.getDate() + 1);
  }

  return stats;
};

/**
 * Mock API: 予約履歴取得
 */
export const getClaims = (userId: string) => {
  const user = getUserWithCompany(userId);
  if (!user) return [];

  return getClaimsByCompany(user.company.id).map(claim => {
    const slot = mockJobSlots.find(s => s.id === claim.job_slot_id);
    if (!slot) return null;

    const jobPost = getJobPostById(slot.job_post_id);
    if (!jobPost) return null;

    const project = getProjectById(jobPost.project_id);
    if (!project) return null;

    return {
      ...claim,
      slot: {
        ...slot,
        job_post: jobPost,
        project: project
      }
    };
  }).filter(item => item !== null);
};

/**
 * Mock API: 検索条件保存 (localStorage利用)
 */
export const saveSearch = (userId: string, name: string, params: SearchParams): void => {
  const savedSearches = getSavedSearches(userId);

  const newSearch: SavedSearch = {
    id: `search-${Date.now()}`,
    user_id: userId,
    name,
    params,
    created_at: new Date().toISOString()
  };

  savedSearches.push(newSearch);
  localStorage.setItem(`savedSearches_${userId}`, JSON.stringify(savedSearches));
};

/**
 * Mock API: お気に入り検索取得
 */
export const getSavedSearches = (userId: string): SavedSearch[] => {
  const stored = localStorage.getItem(`savedSearches_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

/**
 * Mock API: お気に入り検索削除
 */
export const deleteSavedSearch = (userId: string, searchId: string): void => {
  const savedSearches = getSavedSearches(userId);
  const filtered = savedSearches.filter(s => s.id !== searchId);
  localStorage.setItem(`savedSearches_${userId}`, JSON.stringify(filtered));
};

/**
 * 開発用: クイックログイン情報
 */
export const mockAPI = {
  getSlots,
  getUserInfo,
  getStats,
  getClaims,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
  getQuickLoginUsers
};

// デバッグ用: データ量を出力
console.log('[Mock Data Summary]');
console.log(`- Companies: ${mockCompanies.length}`);
console.log(`- Users: ${mockUsers.length}`);
console.log(`- Projects: ${mockProjects.length}`);
console.log(`- Job Posts: ${mockJobPosts.length}`);
console.log(`- Job Slots: ${mockJobSlots.length}`);
console.log(`- Claims: ${mockClaims.length}`);
console.log(`- Available Slots: ${getAvailableSlots().length}`);
