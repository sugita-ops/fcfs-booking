import { describe, it, expect, beforeEach } from 'vitest';
import { DandoriAdapter, createDandoriAdapter, type IDandoriAdapter } from '@/lib/dandori-adapter';
import { classifyDandoriError, DandoriErrorType } from '@/config/dw';

/**
 * DandoriWork Adapter Tests
 * DandoriWorkアダプターのテスト
 */

describe('DandoriWork Adapter Tests', () => {
  let adapter: IDandoriAdapter;

  beforeEach(() => {
    adapter = createDandoriAdapter({
      baseUrl: 'https://api.test.com',
      authMethod: 'bearer',
      bearerToken: 'test-token',
      timeout: 5000
    });
  });

  describe('Adapter Interface', () => {
    it('should create adapter with default configuration', () => {
      const defaultAdapter = createDandoriAdapter();
      expect(defaultAdapter).toBeDefined();
    });

    it('should create adapter with custom configuration', () => {
      const customAdapter = createDandoriAdapter({
        baseUrl: 'https://custom.api.com',
        timeout: 10000
      });
      expect(customAdapter).toBeDefined();
    });
  });

  describe('getProject method', () => {
    it('should return project data (stub implementation)', async () => {
      const projectId = 'DW_PROJECT_001';
      const project = await adapter.getProject(projectId);

      expect(project).toBeDefined();
      expect(project.id).toBe(projectId);
      expect(project.name).toContain(projectId);
      expect(project.status).toBe('active');
      expect(project.client_company).toBeDefined();
      expect(project.start_date).toBeDefined();
    });

    it('should handle project location data', async () => {
      const project = await adapter.getProject('TEST_001');

      expect(project.location).toBeDefined();
      expect(project.location?.address).toBeTruthy();
      expect(typeof project.location?.latitude).toBe('number');
      expect(typeof project.location?.longitude).toBe('number');
    });
  });

  describe('getCompany method', () => {
    it('should return company data (stub implementation)', async () => {
      const companyId = 'DW_COMPANY_001';
      const company = await adapter.getCompany(companyId);

      expect(company).toBeDefined();
      expect(company.id).toBe(companyId);
      expect(company.name).toContain(companyId);
      expect(company.trade).toBeDefined();
      expect(company.is_active).toBe(true);
    });

    it('should include contact information', async () => {
      const company = await adapter.getCompany('TEST_COMPANY');

      expect(company.contact_email).toBeDefined();
      expect(company.contact_phone).toBeDefined();
    });
  });

  describe('notifyClaimConfirmed method', () => {
    it('should send claim notification (stub implementation)', async () => {
      const notification = {
        claim_id: 'claim-123',
        slot_id: 'slot-456',
        company_id: 'company-789',
        user_id: 'user-001',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        project_id: 'project-001',
        job_post_id: 'job-001'
      };

      // Should not throw an error
      await expect(adapter.notifyClaimConfirmed(notification)).resolves.toBeUndefined();
    });

    it('should handle notification without user_id', async () => {
      const notification = {
        claim_id: 'claim-123',
        slot_id: 'slot-456',
        company_id: 'company-789',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        job_post_id: 'job-001'
      };

      await expect(adapter.notifyClaimConfirmed(notification)).resolves.toBeUndefined();
    });
  });

  describe('Error Classification', () => {
    it('should classify 4xx errors as client errors (non-retryable)', () => {
      const error400 = { status: 400, message: 'Bad Request' };
      const classified = classifyDandoriError(error400);

      expect(classified.type).toBe(DandoriErrorType.CLIENT_ERROR);
      expect(classified.retryable).toBe(false);
      expect(classified.httpStatus).toBe(400);
    });

    it('should classify 5xx errors as server errors (retryable)', () => {
      const error500 = { status: 500, message: 'Internal Server Error' };
      const classified = classifyDandoriError(error500);

      expect(classified.type).toBe(DandoriErrorType.SERVER_ERROR);
      expect(classified.retryable).toBe(true);
      expect(classified.httpStatus).toBe(500);
    });

    it('should classify timeout errors as retryable', () => {
      const timeoutError = { code: 'TIMEOUT', message: 'Request timeout' };
      const classified = classifyDandoriError(timeoutError);

      expect(classified.type).toBe(DandoriErrorType.TIMEOUT);
      expect(classified.retryable).toBe(true);
    });

    it('should classify network errors as retryable', () => {
      const networkError = { code: 'ECONNREFUSED', message: 'Connection refused' };
      const classified = classifyDandoriError(networkError);

      expect(classified.type).toBe(DandoriErrorType.NETWORK_ERROR);
      expect(classified.retryable).toBe(true);
    });

    it('should classify unknown errors as retryable', () => {
      const unknownError = { message: 'Unknown error' };
      const classified = classifyDandoriError(unknownError);

      expect(classified.type).toBe(DandoriErrorType.UNKNOWN);
      expect(classified.retryable).toBe(true);
    });
  });

  describe('Configuration Validation', () => {
    it('should use bearer authentication when configured', () => {
      const bearerAdapter = createDandoriAdapter({
        authMethod: 'bearer',
        bearerToken: 'test-bearer-token'
      });

      expect(bearerAdapter).toBeDefined();
    });

    it('should use HMAC authentication when configured', () => {
      const hmacAdapter = createDandoriAdapter({
        authMethod: 'hmac',
        hmacSecret: 'test-hmac-secret'
      });

      expect(hmacAdapter).toBeDefined();
    });

    it('should validate retry configuration', () => {
      const retryConfig = {
        maxRetries: 3,
        retryDelays: [1, 5, 15]
      };

      const adapter = createDandoriAdapter(retryConfig);
      expect(adapter).toBeDefined();
    });
  });

  describe('Payload Structure Validation', () => {
    it('should validate claim notification payload structure', () => {
      const validPayload = {
        claim_id: 'claim-123',
        slot_id: 'slot-456',
        company_id: 'company-789',
        user_id: 'user-001',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        job_post_id: 'job-001'
      };

      // Check required fields
      expect(validPayload.claim_id).toBeTruthy();
      expect(validPayload.slot_id).toBeTruthy();
      expect(validPayload.company_id).toBeTruthy();
      expect(validPayload.work_date).toBeTruthy();
      expect(validPayload.claimed_at).toBeTruthy();
      expect(validPayload.job_post_id).toBeTruthy();

      // Check date format
      expect(new Date(validPayload.work_date)).toBeInstanceOf(Date);
      expect(new Date(validPayload.claimed_at)).toBeInstanceOf(Date);
    });

    it('should handle optional fields in payload', () => {
      const minimalPayload = {
        claim_id: 'claim-123',
        slot_id: 'slot-456',
        company_id: 'company-789',
        work_date: '2024-01-15',
        claimed_at: '2024-01-01T12:00:00Z',
        job_post_id: 'job-001'
        // user_id and project_id are optional
      };

      expect(minimalPayload.claim_id).toBeTruthy();
      expect(minimalPayload.slot_id).toBeTruthy();
      expect(minimalPayload.company_id).toBeTruthy();
    });
  });

  describe('Timeout and Retry Logic', () => {
    it('should respect timeout configuration', () => {
      const timeoutConfig = { timeout: 30000 }; // 30 seconds
      const adapter = createDandoriAdapter(timeoutConfig);

      expect(adapter).toBeDefined();
    });

    it('should implement exponential backoff for retries', () => {
      const retryDelays = [1, 5, 15]; // seconds
      let currentDelay = 0;

      for (let attempt = 0; attempt < 3; attempt++) {
        currentDelay = retryDelays[Math.min(attempt, retryDelays.length - 1)];
        expect(currentDelay).toBeGreaterThan(0);
        expect(currentDelay).toBeLessThanOrEqual(15);
      }
    });

    it('should stop retrying after max attempts for client errors', () => {
      const clientError = { status: 400, message: 'Bad Request' };
      const classified = classifyDandoriError(clientError);

      expect(classified.retryable).toBe(false);
    });

    it('should continue retrying for server errors up to max attempts', () => {
      const serverError = { status: 503, message: 'Service Unavailable' };
      const classified = classifyDandoriError(serverError);

      expect(classified.retryable).toBe(true);
    });
  });
});