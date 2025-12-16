/**
 * ダンドリワーク API 接続テストエンドポイント
 *
 * POST /api/dandori-work/test-connection
 * - API設定の妥当性を確認
 */

import { NextRequest, NextResponse } from 'next/server';
import { DandoriWorkAPIClient, validateConfig } from '@/lib/dandori-work-api';
import type { DandoriWorkConfig } from '@/types/dandori-work';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 接続テスト実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      apiKey: string;
      placeCode: string;
      baseUrl?: string;
    };

    // 設定検証
    const validation = validateConfig(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONFIG',
            message: '設定が不正です',
            details: validation.errors,
          },
        },
        { status: 400 }
      );
    }

    const config: DandoriWorkConfig = {
      apiKey: body.apiKey,
      placeCode: body.placeCode,
      baseUrl: body.baseUrl,
    };

    // API クライアント初期化
    const client = new DandoriWorkAPIClient(config);

    console.log('[Test Connection] Testing connection to Dandori Work API...');

    // 接続テスト実行
    const isConnected = await client.testConnection();

    if (isConnected) {
      // 現場数を取得して追加情報として返す
      const sitesCount = await client.getSitesCount();

      console.log('[Test Connection] Connection successful');
      console.log(`[Test Connection] Sites count: ${sitesCount}`);

      return NextResponse.json({
        success: true,
        message: 'API接続に成功しました',
        data: {
          sitesCount,
          apiVersion: '1.5.0',
          placeCode: config.placeCode,
        },
      });
    } else {
      console.log('[Test Connection] Connection failed');

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'CONNECTION_FAILED',
            message: 'API接続に失敗しました',
          },
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Test Connection] Error:', error);

    const errorMessage = (error as Error).message;
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';

    // エラーメッセージから適切なステータスコードを判定
    if (errorMessage.includes('401') || errorMessage.includes('403')) {
      statusCode = 401;
      errorCode = 'AUTH_ERROR';
    } else if (errorMessage.includes('404')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    } else if (errorMessage.includes('timeout')) {
      statusCode = 408;
      errorCode = 'TIMEOUT';
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: errorCode,
          message: errorMessage,
        },
      },
      { status: statusCode }
    );
  }
}
