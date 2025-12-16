/**
 * ダンドリワーク API 型定義
 * @see DANDORI_WORK_API_ANALYSIS.md
 */

/**
 * ダンドリワーク API 現場（Site）情報
 */
export interface DandoriWorkSite {
  site_code: string;                    // 現場コード（一意識別子）
  site_name?: string;                   // 現場名
  start_date: string;                   // 開始日（ISO 8601形式）
  end_date: string;                     // 終了日（ISO 8601形式）
  address?: string;                     // 住所
  status?: number;                      // ステータス
  place_code: string;                   // プレイスコード
  site_type?: string;                   // 現場種類
  // 追加フィールドは実APIレスポンスから判明次第追加
}

/**
 * 現場一覧取得レスポンス
 */
export interface DandoriWorkSitesResponse {
  sites: DandoriWorkSite[];
  total_count?: number;
}

/**
 * 現場参加者情報
 */
export interface DandoriWorkSiteCrew {
  crew_id: string;
  crew_name: string;
  role?: string;
}

/**
 * 現場資料情報
 */
export interface DandoriWorkDocument {
  uuid: string;
  file_name: string;
  file_size?: number;
  uploaded_at?: string;
}

/**
 * ダンドリワーク API設定
 */
export interface DandoriWorkConfig {
  apiKey: string;                       // Bearer Token
  placeCode: string;                    // プレイスコード
  baseUrl?: string;                     // カスタムベースURL（デフォルト: https://api.dandoli.jp/api）
}

/**
 * 同期設定
 */
export interface SyncConfig {
  enabled: boolean;                     // 同期有効/無効
  lastSyncAt?: string;                  // 最終同期日時（ISO 8601）
  syncMode: 'manual' | 'scheduled';     // 同期モード
  autoSyncInterval?: number;            // 自動同期間隔（分）
}

/**
 * 同期履歴
 */
export interface SyncHistory {
  id: string;
  startedAt: string;                    // 開始日時（ISO 8601）
  completedAt?: string;                 // 完了日時（ISO 8601）
  status: 'running' | 'completed' | 'failed';
  projectsAdded: number;                // 追加されたプロジェクト数
  projectsUpdated: number;              // 更新されたプロジェクト数
  errors?: string[];                    // エラーメッセージ
}

/**
 * API エラーレスポンス
 */
export interface DandoriWorkAPIError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * ダンドリブッキング Project への変換結果
 */
export interface ConvertedProject {
  id: string;
  name: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  source: 'dandori-work';               // データソース識別
  externalId: string;                   // 元のsite_code
}
