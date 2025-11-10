/**
 * ダンドリワーク API 同期エンドポイント
 *
 * POST /api/dandori-work/sync
 * - ダンドリワークから現場情報を取得し、プロジェクトとして同期
 */

import { NextRequest, NextResponse } from 'next/server';
import { DandoriWorkAPIClient, convertSiteToProject } from '@/lib/dandori-work-api';
import type { DandoriWorkConfig, SyncHistory } from '@/types/dandori-work';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 同期実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      apiKey: string;
      placeCode: string;
      baseUrl?: string;
    };

    // 設定検証
    if (!body.apiKey || !body.placeCode) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_CONFIG',
            message: 'APIキーとプレイスコードは必須です',
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

    // 同期履歴の開始
    const syncHistory: SyncHistory = {
      id: generateSyncId(),
      startedAt: new Date().toISOString(),
      status: 'running',
      projectsAdded: 0,
      projectsUpdated: 0,
    };

    try {
      // API クライアント初期化
      const client = new DandoriWorkAPIClient(config);

      // 現場一覧を取得
      console.log('[Sync] Fetching sites from Dandori Work API...');
      const sites = await client.getSites();
      console.log(`[Sync] Fetched ${sites.length} sites`);

      // 既存のプロジェクトを取得（localStorage から）
      const existingProjectsJson = request.headers.get('x-existing-projects');
      let existingProjects = [];

      if (existingProjectsJson) {
        try {
          existingProjects = JSON.parse(existingProjectsJson);
        } catch (parseError) {
          console.warn('[Sync] Failed to parse existing projects:', parseError);
          existingProjects = [];
        }
      }

      const existingProjectIds = new Set(
        existingProjects.map((p: { id: string }) => p.id)
      );

      // 現場をプロジェクトに変換
      const convertedProjects = sites.map(convertSiteToProject);

      // 新規 vs 更新を判定
      const newProjects = [];
      const updatedProjects = [];

      for (const project of convertedProjects) {
        if (existingProjectIds.has(project.id)) {
          updatedProjects.push(project);
        } else {
          newProjects.push(project);
        }
      }

      // 同期履歴を更新
      syncHistory.completedAt = new Date().toISOString();
      syncHistory.status = 'completed';
      syncHistory.projectsAdded = newProjects.length;
      syncHistory.projectsUpdated = updatedProjects.length;

      console.log('[Sync] Sync completed successfully');
      console.log(`[Sync] Added: ${newProjects.length}, Updated: ${updatedProjects.length}`);

      return NextResponse.json({
        success: true,
        syncHistory,
        data: {
          newProjects,
          updatedProjects,
          totalSites: sites.length,
        },
      });

    } catch (apiError) {
      // API エラー
      const errorMessage = (apiError as Error).message;
      syncHistory.completedAt = new Date().toISOString();
      syncHistory.status = 'failed';
      syncHistory.errors = [errorMessage];

      console.error('[Sync] API Error:', apiError);

      return NextResponse.json(
        {
          success: false,
          syncHistory,
          error: {
            code: 'API_ERROR',
            message: errorMessage,
          },
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Sync] Unexpected error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: '同期処理中に予期しないエラーが発生しました',
          details: (error as Error).message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * 同期履歴IDを生成
 */
function generateSyncId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `sync-${timestamp}-${random}`;
}
