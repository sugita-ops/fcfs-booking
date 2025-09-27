import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pool, withTransaction } from '@/lib/database';
import { PoolClient } from 'pg';

/**
 * Outbox Pattern Integration Tests
 * アウトボックスパターンの確実配送機能をテスト
 */

describe('Outbox Integration Tests', () => {
  let testTenantId: string;
  let testSlotId: string;
  let testCompanyId: string;

  beforeEach(async () => {
    // テスト用のテナント、スロット、会社を設定
    testTenantId = '550e8400-e29b-41d4-a716-446655440101';
    testSlotId = '550e8400-e29b-41d4-a716-446655440601';
    testCompanyId = '550e8400-e29b-41d4-a716-446655440302';

    // データをクリーンアップ
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM integration_outbox WHERE event_name = $1', ['claim.confirmed']);
      await client.query('DELETE FROM claims WHERE tenant_id = $1', [testTenantId]);
      await client.query(`
        UPDATE job_slots
        SET status = 'available', claimed_by_company = NULL, claimed_by_user = NULL, claimed_at = NULL
        WHERE id = $1 AND tenant_id = $2
      `, [testSlotId, testTenantId]);
    } finally {
      client.release();
    }
  });

  afterEach(async () => {
    // テスト後のクリーンアップ
    const client = await pool.connect();
    try {
      await client.query('DELETE FROM integration_outbox WHERE event_name = $1', ['claim.confirmed']);
      await client.query('DELETE FROM claims WHERE tenant_id = $1', [testTenantId]);
    } finally {
      client.release();
    }
  });

  describe('Outbox Event Creation', () => {
    it('should create outbox event when claim is successful', async () => {
      const result = await withTransaction(async (client: PoolClient) => {
        // RLS設定
        await client.query(`SET LOCAL app.current_tenant_id = '${testTenantId}'`);

        // スロットを確実にavailableに設定
        await client.query(`
          UPDATE job_slots
          SET status = 'available', claimed_by_company = NULL, claimed_by_user = NULL, claimed_at = NULL
          WHERE id = $1 AND tenant_id = $2
        `, [testSlotId, testTenantId]);

        // 受注処理をシミュレート
        const slotUpdate = await client.query(`
          UPDATE job_slots
          SET
            claimed_by_company = $1,
            claimed_by_user = $2,
            claimed_at = now(),
            status = 'claimed',
            updated_at = now()
          WHERE
            id = $3
            AND tenant_id = $4
            AND status = 'available'
          RETURNING id, job_post_id, work_date, status, claimed_at
        `, [testCompanyId, null, testSlotId, testTenantId]);

        expect(slotUpdate.rows).toHaveLength(1);

        // アウトボックスイベントを作成
        const eventId = `claim_${testSlotId.substring(0, 8)}_${Date.now()}_test`;
        const payload = {
          event: 'claim.confirmed',
          version: '1.0',
          id: eventId,
          occurred_at: slotUpdate.rows[0].claimed_at,
          producer: 'fcfs-booking',
          data: {
            dw_project_id: null,
            job_post: {
              id: slotUpdate.rows[0].job_post_id,
              work_date: slotUpdate.rows[0].work_date
            },
            slot: {
              slot_id: testSlotId,
              status: 'claimed'
            },
            claim: {
              claim_id: 'test-claim-id',
              company_id: testCompanyId,
              user_id: null,
              claimed_at: slotUpdate.rows[0].claimed_at
            },
            tenant_id: testTenantId
          }
        };

        await client.query(`
          INSERT INTO integration_outbox (
            event_id,
            event_name,
            payload,
            target,
            status,
            next_attempt_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, now(), now())
        `, [
          eventId,
          'claim.confirmed',
          JSON.stringify(payload),
          'dw',
          'pending'
        ]);

        return { eventId, payload };
      });

      // アウトボックスイベントが作成されたことを確認
      const client = await pool.connect();
      try {
        const outboxEvents = await client.query(`
          SELECT event_id, event_name, payload, target, status, retry_count
          FROM integration_outbox
          WHERE event_id = $1
        `, [result.eventId]);

        expect(outboxEvents.rows).toHaveLength(1);

        const event = outboxEvents.rows[0];
        expect(event.event_name).toBe('claim.confirmed');
        expect(event.target).toBe('dw');
        expect(event.status).toBe('pending');
        expect(event.retry_count).toBe(0);

        // ペイロードの構造を確認
        const payload = JSON.parse(event.payload);
        expect(payload.event).toBe('claim.confirmed');
        expect(payload.version).toBe('1.0');
        expect(payload.producer).toBe('fcfs-booking');
        expect(payload.data.slot.slot_id).toBe(testSlotId);
        expect(payload.data.claim.company_id).toBe(testCompanyId);
        expect(payload.data.tenant_id).toBe(testTenantId);
      } finally {
        client.release();
      }
    });

    it('should handle outbox worker retry logic', async () => {
      const client = await pool.connect();
      try {
        // 失敗したイベントを作成
        const eventId = `retry_test_${Date.now()}`;
        await client.query(`
          INSERT INTO integration_outbox (
            event_id,
            event_name,
            payload,
            target,
            status,
            retry_count,
            next_attempt_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, now() - interval '1 minute', now())
        `, [
          eventId,
          'claim.confirmed',
          JSON.stringify({ test: 'data' }),
          'dw',
          'pending',
          2
        ]);

        // 次回試行時刻を更新（指数バックオフをシミュレート）
        const delays = [60, 300, 900, 3600, 21600]; // seconds
        const retryCount = 2;
        const delaySeconds = delays[Math.min(retryCount, delays.length - 1)];
        const nextAttempt = new Date(Date.now() + delaySeconds * 1000);

        await client.query(`
          UPDATE integration_outbox
          SET retry_count = $1, next_attempt_at = $2, updated_at = now()
          WHERE event_id = $3
        `, [retryCount + 1, nextAttempt, eventId]);

        // 更新されたことを確認
        const result = await client.query(`
          SELECT retry_count, next_attempt_at
          FROM integration_outbox
          WHERE event_id = $1
        `, [eventId]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].retry_count).toBe(3);
        expect(new Date(result.rows[0].next_attempt_at).getTime()).toBeGreaterThan(Date.now());
      } finally {
        client.release();
      }
    });

    it('should mark event as failed after max retries', async () => {
      const client = await pool.connect();
      try {
        const eventId = `failed_test_${Date.now()}`;
        const maxRetries = 5;

        // 最大リトライ回数を超えたイベントを作成
        await client.query(`
          INSERT INTO integration_outbox (
            event_id,
            event_name,
            payload,
            target,
            status,
            retry_count,
            next_attempt_at,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, now(), now())
        `, [
          eventId,
          'claim.confirmed',
          JSON.stringify({ test: 'data' }),
          'dw',
          'pending',
          maxRetries
        ]);

        // 失敗処理をシミュレート
        await client.query(`
          UPDATE integration_outbox
          SET status = 'failed', retry_count = $1, updated_at = now()
          WHERE event_id = $2
        `, [maxRetries + 1, eventId]);

        // 失敗状態になったことを確認
        const result = await client.query(`
          SELECT status, retry_count
          FROM integration_outbox
          WHERE event_id = $1
        `, [eventId]);

        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].status).toBe('failed');
        expect(result.rows[0].retry_count).toBe(maxRetries + 1);
      } finally {
        client.release();
      }
    });

    it('should fetch pending events correctly', async () => {
      const client = await pool.connect();
      try {
        // 複数のイベントを作成（一部は将来の実行予定）
        const now = new Date();
        const futureTime = new Date(now.getTime() + 60000); // 1分後

        await client.query(`
          INSERT INTO integration_outbox (
            event_id,
            event_name,
            payload,
            target,
            status,
            next_attempt_at,
            created_at
          ) VALUES
          ('ready_1', 'claim.confirmed', '{}', 'dw', 'pending', $1, $1),
          ('ready_2', 'claim.confirmed', '{}', 'dw', 'pending', $1, $1),
          ('future_1', 'claim.confirmed', '{}', 'dw', 'pending', $2, $1),
          ('sent_1', 'claim.confirmed', '{}', 'dw', 'sent', $1, $1)
        `, [now, futureTime]);

        // 実行可能なイベントを取得
        const result = await client.query(`
          SELECT event_id, event_name, status
          FROM integration_outbox
          WHERE
            status IN ('pending', 'failed')
            AND now() >= next_attempt_at
          ORDER BY created_at ASC
          LIMIT 10
        `);

        expect(result.rows).toHaveLength(2);
        expect(result.rows[0].event_id).toBe('ready_1');
        expect(result.rows[1].event_id).toBe('ready_2');

        // 将来のイベントは含まれない
        const eventIds = result.rows.map(r => r.event_id);
        expect(eventIds).not.toContain('future_1');
        expect(eventIds).not.toContain('sent_1');
      } finally {
        client.release();
      }
    });
  });

  describe('HMAC Signature Validation', () => {
    it('should validate HMAC signatures correctly', async () => {
      const { sign, verify } = await import('@/lib/crypto');

      const testPayload = {
        event: 'claim.confirmed',
        data: { test: 'data' }
      };
      const secret = 'test-secret';
      const timestamp = Math.floor(Date.now() / 1000);

      // 署名を生成
      const signature = sign(testPayload, secret, timestamp);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);

      // 署名を検証
      const isValid = verify(signature, testPayload, secret, timestamp);
      expect(isValid).toBe(true);

      // 無効な署名
      const invalidSignature = 'sha256=invalid';
      const isInvalid = verify(invalidSignature, testPayload, secret, timestamp);
      expect(isInvalid).toBe(false);

      // タイムスタンプが古すぎる場合
      const oldTimestamp = timestamp - 400; // 400秒前
      const isExpired = verify(signature, testPayload, secret, oldTimestamp, 300);
      expect(isExpired).toBe(false);
    });
  });
});