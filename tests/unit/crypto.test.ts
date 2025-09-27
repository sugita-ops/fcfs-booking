import { describe, it, expect } from 'vitest';
import {
  sign,
  verify,
  signWithTimestamp,
  generateEventId,
  createClaimConfirmedPayload
} from '@/lib/crypto';

/**
 * Crypto Utilities Unit Tests
 * HMAC署名とペイロード生成のユニットテスト
 */

describe('Crypto Utilities', () => {
  const testSecret = 'test-secret-key';
  const testPayload = {
    event: 'claim.confirmed',
    data: { test: 'data' }
  };

  describe('HMAC Signature Generation', () => {
    it('should generate valid HMAC signature', () => {
      const signature = sign(testPayload, testSecret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(signature.startsWith('sha256=')).toBe(true);
      expect(signature.length).toBe(71); // 'sha256=' + 64 hex chars
    });

    it('should generate consistent signatures for same input', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature1 = sign(testPayload, testSecret, timestamp);
      const signature2 = sign(testPayload, testSecret, timestamp);

      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different inputs', () => {
      const payload1 = { test: 'data1' };
      const payload2 = { test: 'data2' };

      const signature1 = sign(payload1, testSecret);
      const signature2 = sign(payload2, testSecret);

      expect(signature1).not.toBe(signature2);
    });

    it('should handle string payloads', () => {
      const stringPayload = JSON.stringify(testPayload);
      const signature = sign(stringPayload, testSecret);

      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('HMAC Signature Verification', () => {
    it('should verify valid signatures', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = sign(testPayload, testSecret, timestamp);
      const isValid = verify(signature, testPayload, testSecret, timestamp);

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const invalidSignature = 'sha256=invalid0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const isValid = verify(invalidSignature, testPayload, testSecret);

      expect(isValid).toBe(false);
    });

    it('should reject malformed signatures', () => {
      const malformedSignatures = [
        'invalid-format',
        'md5=invalidalgorithm',
        'sha256=short',
        'sha256=',
        ''
      ];

      malformedSignatures.forEach(signature => {
        const isValid = verify(signature, testPayload, testSecret);
        expect(isValid).toBe(false);
      });
    });

    it('should handle timestamp validation', () => {
      const now = Math.floor(Date.now() / 1000);
      const signature = sign(testPayload, testSecret, now);

      // Valid timestamp (within tolerance)
      expect(verify(signature, testPayload, testSecret, now, 300)).toBe(true);

      // Too old (beyond tolerance)
      const oldTimestamp = now - 400;
      expect(verify(signature, testPayload, testSecret, oldTimestamp, 300)).toBe(false);

      // From future (beyond tolerance)
      const futureTimestamp = now + 400;
      expect(verify(signature, testPayload, testSecret, futureTimestamp, 300)).toBe(false);
    });

    it('should work without timestamp when none provided', () => {
      const signature = sign(testPayload, testSecret);
      const isValid = verify(signature, testPayload, testSecret);

      expect(isValid).toBe(true);
    });
  });

  describe('Signature with Timestamp', () => {
    it('should generate signature with current timestamp', () => {
      const before = Math.floor(Date.now() / 1000);
      const result = signWithTimestamp(testPayload, testSecret);
      const after = Math.floor(Date.now() / 1000);

      expect(result.signature).toMatch(/^sha256=[a-f0-9]{64}$/);
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);

      // Verify the signature works
      const isValid = verify(result.signature, testPayload, testSecret, result.timestamp);
      expect(isValid).toBe(true);
    });
  });

  describe('Event ID Generation', () => {
    it('should generate unique event IDs', () => {
      const prefix = 'claim';
      const entityId = '550e8400-e29b-41d4-a716-446655440000';

      const id1 = generateEventId(prefix, entityId);
      const id2 = generateEventId(prefix, entityId);

      expect(id1).not.toBe(id2);
      expect(id1.startsWith(`${prefix}_${entityId.substring(0, 8)}_`)).toBe(true);
      expect(id2.startsWith(`${prefix}_${entityId.substring(0, 8)}_`)).toBe(true);
    });

    it('should include timestamp and random components', () => {
      const prefix = 'test';
      const entityId = 'abcd1234-efgh-5678-ijkl-mnop9876qrst';

      const eventId = generateEventId(prefix, entityId);
      const parts = eventId.split('_');

      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe(prefix);
      expect(parts[1]).toBe(entityId.substring(0, 8));
      expect(parseInt(parts[2])).toBeGreaterThan(0); // timestamp
      expect(parts[3]).toMatch(/^[a-z0-9]{6}$/); // random string
    });
  });

  describe('Claim Confirmed Payload Creation', () => {
    it('should create properly structured payload', () => {
      const claimData = {
        claim_id: '550e8400-e29b-41d4-a716-446655440001',
        slot_id: '550e8400-e29b-41d4-a716-446655440002',
        company_id: '550e8400-e29b-41d4-a716-446655440003',
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        tenant_id: '550e8400-e29b-41d4-a716-446655440005',
        dw_project_id: 'DW123',
        job_post_id: '550e8400-e29b-41d4-a716-446655440006'
      };

      const payload = createClaimConfirmedPayload(claimData);

      expect(payload).toEqual({
        event: 'claim.confirmed',
        version: '1.0',
        id: expect.stringMatching(/^claim_550e8400_\d+_[a-z0-9]{6}$/),
        occurred_at: claimData.claimed_at,
        producer: 'fcfs-booking',
        data: {
          dw_project_id: 'DW123',
          job_post: {
            id: claimData.job_post_id,
            work_date: claimData.work_date
          },
          slot: {
            slot_id: claimData.slot_id,
            status: 'claimed'
          },
          claim: {
            claim_id: claimData.claim_id,
            company_id: claimData.company_id,
            user_id: claimData.user_id,
            claimed_at: claimData.claimed_at
          },
          tenant_id: claimData.tenant_id
        }
      });
    });

    it('should handle null dw_project_id', () => {
      const claimData = {
        claim_id: '550e8400-e29b-41d4-a716-446655440001',
        slot_id: '550e8400-e29b-41d4-a716-446655440002',
        company_id: '550e8400-e29b-41d4-a716-446655440003',
        user_id: null,
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        tenant_id: '550e8400-e29b-41d4-a716-446655440005',
        job_post_id: '550e8400-e29b-41d4-a716-446655440006'
      };

      const payload = createClaimConfirmedPayload(claimData);

      expect((payload as any).data.dw_project_id).toBe(null);
      expect((payload as any).data.claim.user_id).toBe(null);
    });

    it('should generate event ID with claim prefix', () => {
      const claimData = {
        claim_id: '550e8400-e29b-41d4-a716-446655440001',
        slot_id: '550e8400-e29b-41d4-a716-446655440002',
        company_id: '550e8400-e29b-41d4-a716-446655440003',
        user_id: '550e8400-e29b-41d4-a716-446655440004',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        tenant_id: '550e8400-e29b-41d4-a716-446655440005',
        job_post_id: '550e8400-e29b-41d4-a716-446655440006'
      };

      const payload = createClaimConfirmedPayload(claimData);

      expect((payload as any).id).toMatch(/^claim_550e8400_\d+_[a-z0-9]{6}$/);
      expect((payload as any).id.startsWith('claim_550e8400_')).toBe(true);
    });
  });
});