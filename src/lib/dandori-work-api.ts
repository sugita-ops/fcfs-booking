/**
 * ダンドリワーク API クライアントライブラリ
 *
 * @description
 * ダンドリワーク APIとの連携を行うためのクライアントライブラリ。
 * Bearer Token認証、エラーハンドリング、リトライロジックを提供。
 *
 * @see DANDORI_WORK_API_ANALYSIS.md
 */

import type {
  DandoriWorkSite,
  DandoriWorkSitesResponse,
  DandoriWorkConfig,
  DandoriWorkAPIError,
  ConvertedProject
} from '@/types/dandori-work';

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG = {
  baseUrl: 'https://api.dandoli.jp/api',
  timeout: 30000,                       // 30秒
  maxRetries: 3,
  retryDelay: 1000,                     // 1秒
} as const;

/**
 * HTTP リクエストオプション
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  timeout?: number;
  retries?: number;
}

/**
 * ダンドリワーク API クライアント
 */
export class DandoriWorkAPIClient {
  private config: DandoriWorkConfig;
  private baseUrl: string;

  constructor(config: DandoriWorkConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || DEFAULT_CONFIG.baseUrl;
  }

  /**
   * 認証ヘッダーを生成
   */
  private getAuthHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.config.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * HTTP リクエスト実行（リトライ機能付き）
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      timeout = DEFAULT_CONFIG.timeout,
      retries = DEFAULT_CONFIG.maxRetries,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          method,
          headers: this.getAuthHeaders(),
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json() as DandoriWorkAPIError;
          throw new Error(
            `API Error (${response.status}): ${errorData.error?.message || response.statusText}`
          );
        }

        const data = await response.json() as T;
        return data;

      } catch (error) {
        lastError = error as Error;

        // リトライ可能なエラーの場合のみリトライ
        if (attempt < retries && this.isRetryableError(error)) {
          const delay = DEFAULT_CONFIG.retryDelay * Math.pow(2, attempt);
          console.warn(`Retry attempt ${attempt + 1}/${retries} after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        break;
      }
    }

    clearTimeout(timeoutId);
    throw lastError || new Error('Request failed');
  }

  /**
   * リトライ可能なエラーかどうか判定
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof TypeError) {
      // ネットワークエラー
      return true;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      // タイムアウトやサーバーエラー
      return message.includes('timeout') ||
             message.includes('503') ||
             message.includes('502') ||
             message.includes('500');
    }
    return false;
  }

  /**
   * 指定ミリ秒待機
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 現場一覧を取得
   *
   * @param placeCode プレイスコード（省略時は設定値を使用）
   * @returns 現場一覧
   */
  async getSites(placeCode?: string): Promise<DandoriWorkSite[]> {
    const code = placeCode || this.config.placeCode;
    const endpoint = `/co/places/${code}/sites`;

    try {
      const response = await this.request<any>(endpoint);
      console.log('[DandoriWork API] Full response:', JSON.stringify(response, null, 2));

      // レスポンス形式を確認
      if (Array.isArray(response)) {
        console.log('[DandoriWork API] Response is an array, returning directly');
        return response;
      } else if (response.sites) {
        console.log(`[DandoriWork API] Found ${response.sites.length} sites in response.sites`);
        return response.sites;
      } else if (response.data) {
        console.log(`[DandoriWork API] Found data in response.data`);
        return response.data;
      } else {
        console.warn('[DandoriWork API] Unexpected response format:', Object.keys(response));
        return [];
      }
    } catch (error) {
      console.error('Failed to get sites:', error);
      throw new Error(`現場一覧の取得に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * 現場数を取得
   *
   * @param placeCode プレイスコード（省略時は設定値を使用）
   * @returns 現場数
   */
  async getSitesCount(placeCode?: string): Promise<number> {
    const code = placeCode || this.config.placeCode;
    const endpoint = `/co/places/${code}/sites/count`;

    try {
      const response = await this.request<{ count: number }>(endpoint);
      return response.count || 0;
    } catch (error) {
      console.error('Failed to get sites count:', error);
      throw new Error(`現場数の取得に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * 特定の現場情報を取得
   *
   * @param siteCode 現場コード
   * @param placeCode プレイスコード（省略時は設定値を使用）
   * @returns 現場情報
   */
  async getSite(siteCode: string, placeCode?: string): Promise<DandoriWorkSite> {
    const code = placeCode || this.config.placeCode;
    const endpoint = `/co/places/${code}/sites/${siteCode}`;

    try {
      return await this.request<DandoriWorkSite>(endpoint);
    } catch (error) {
      console.error(`Failed to get site ${siteCode}:`, error);
      throw new Error(`現場情報の取得に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * 現場情報を更新
   *
   * @param siteCode 現場コード
   * @param data 更新データ
   * @param placeCode プレイスコード（省略時は設定値を使用）
   * @returns 更新後の現場情報
   */
  async updateSite(
    siteCode: string,
    data: Partial<DandoriWorkSite>,
    placeCode?: string
  ): Promise<DandoriWorkSite> {
    const code = placeCode || this.config.placeCode;
    const endpoint = `/co/places/${code}/sites/${siteCode}`;

    try {
      return await this.request<DandoriWorkSite>(endpoint, {
        method: 'PUT',
        body: data,
      });
    } catch (error) {
      console.error(`Failed to update site ${siteCode}:`, error);
      throw new Error(`現場情報の更新に失敗しました: ${(error as Error).message}`);
    }
  }

  /**
   * API接続テスト
   *
   * @returns 接続成功の場合true
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getSitesCount();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}

/**
 * ダンドリワーク Site を ダンドリブッキング Project に変換
 *
 * @param site ダンドリワーク現場情報
 * @returns 変換後のプロジェクト情報
 */
export function convertSiteToProject(site: DandoriWorkSite): any {
  return {
    id: `dw-${site.site_code}`,         // プレフィックスでダンドリワーク由来と識別
    name: site.site_name || site.site_code,
    location: site.address || '',
    startDate: site.start_date,
    endDate: site.end_date,
    status: mapSiteStatusToProjectStatus(site.status),
    source: 'dandori-work',
    externalId: site.site_code,
    // 元請けダッシュボードで必要な追加フィールド
    budget: 0,                           // ダンドリワークAPIに予算情報があれば設定
    actualCost: 0,
    progress: 0,
    subcontractors: [],
    manager: 'ダンドリワーク連携',
  };
}

/**
 * ダンドリワークのステータスコードをプロジェクトステータスに変換
 *
 * @param statusCode ステータスコード
 * @returns プロジェクトステータス
 */
function mapSiteStatusToProjectStatus(statusCode?: number): 'planning' | 'in_progress' | 'completed' | 'on_hold' {
  // 実際のステータスコードは検証環境で確認後に更新
  switch (statusCode) {
    case 0:
      return 'planning';      // 準備中
    case 1:
      return 'in_progress';   // 進行中
    case 2:
      return 'completed';     // 完了
    case 3:
      return 'on_hold';       // 中断
    default:
      return 'planning';      // デフォルトは計画中
  }
}

/**
 * API設定を検証
 *
 * @param config API設定
 * @returns 検証結果
 */
export function validateConfig(config: Partial<DandoriWorkConfig>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.apiKey || config.apiKey.trim() === '') {
    errors.push('APIキーが設定されていません');
  }

  if (!config.placeCode || config.placeCode.trim() === '') {
    errors.push('プレイスコードが設定されていません');
  }

  if (config.baseUrl && !config.baseUrl.startsWith('http')) {
    errors.push('ベースURLが不正です（httpまたはhttpsで開始する必要があります）');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
