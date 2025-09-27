import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { Pool, PoolClient } from 'pg';

// Test configuration
const testPool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/fcfs_booking'
});

// Test data constants
const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_SLOT_ID_1 = '550e8400-e29b-41d4-a716-446655440601';
const TEST_SLOT_ID_2 = '550e8400-e29b-41d4-a716-446655440602';
const TEST_SLOT_ID_3 = '550e8400-e29b-41d4-a716-446655440603';
const TEST_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440302';

// Mock API endpoint functions
async function mockClaimAPI(
  slotId: string,
  companyId: string,
  requestId: string,
  tenantId: string = TEST_TENANT_ID
): Promise<Response> {
  const body = JSON.stringify({ slotId, companyId, requestId });

  // Simulate API call by directly importing and calling the handler
  const { POST } = await import('../../src/app/api/claims/route');

  const mockRequest = new Request('http://localhost:3000/api/claims', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer dev-token` // Uses our test token
    },
    body
  });

  return POST(mockRequest as any);
}

async function mockAlternativesAPI(
  slotId: string,
  days: number = 3,
  tenantId: string = TEST_TENANT_ID
): Promise<Response> {
  const { GET } = await import('../../src/app/api/alternatives/route');

  const mockRequest = new Request(
    `http://localhost:3000/api/alternatives?slotId=${slotId}&days=${days}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer dev-token`
      }
    }
  );

  return GET(mockRequest as any);
}

// Helper functions
async function setTenantContext(client: PoolClient, tenantId: string) {
  await client.query(
    "SELECT set_config('request.jwt.claims', $1, true)",
    [JSON.stringify({ tenant_id: tenantId })]
  );
}

async function clearTenantContext(client: PoolClient) {
  await client.query("SELECT set_config('request.jwt.claims', '', true)");
}

async function getSlotStatus(slotId: string): Promise<string | null> {
  const client = await testPool.connect();
  try {
    await setTenantContext(client, TEST_TENANT_ID);
    const result = await client.query(
      'SELECT status FROM job_slots WHERE id = $1',
      [slotId]
    );
    return result.rows.length > 0 ? result.rows[0].status : null;
  } finally {
    await clearTenantContext(client);
    client.release();
  }
}

async function resetSlotStatus(slotId: string) {
  const client = await testPool.connect();
  try {
    await setTenantContext(client, TEST_TENANT_ID);
    await client.query(`
      UPDATE job_slots
      SET status = 'available',
          claimed_by_company = NULL,
          claimed_by_user = NULL,
          claimed_at = NULL
      WHERE id = $1
    `, [slotId]);

    // Clean up claims for this slot
    await client.query('DELETE FROM claims WHERE job_slot_id = $1', [slotId]);
  } finally {
    await clearTenantContext(client);
    client.release();
  }
}

async function getOutboxCount(): Promise<number> {
  const client = await testPool.connect();
  try {
    const result = await client.query(
      "SELECT COUNT(*) as count FROM integration_outbox WHERE event_name = 'claim.confirmed'"
    );
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

describe('Claims API Tests', () => {
  beforeAll(async () => {
    // Ensure test data is available
    console.log('Setting up test environment...');
  });

  afterAll(async () => {
    await testPool.end();
  });

  beforeEach(async () => {
    // Reset test slots to available status before each test
    await resetSlotStatus(TEST_SLOT_ID_1);
    await resetSlotStatus(TEST_SLOT_ID_2);
    await resetSlotStatus(TEST_SLOT_ID_3);
  });

  describe('POST /api/claims', () => {
    it('should successfully claim an available slot', async () => {
      const requestId = `test-${Date.now()}-1`;
      const response = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('slot');
      expect(data).toHaveProperty('claim');
      expect(data.slot.status).toBe('claimed');
      expect(data.claim.company_id).toBe(TEST_COMPANY_ID);

      // Verify slot status in database
      const status = await getSlotStatus(TEST_SLOT_ID_1);
      expect(status).toBe('claimed');
    });

    it('should return 409 for already claimed slot', async () => {
      const requestId1 = `test-${Date.now()}-2a`;
      const requestId2 = `test-${Date.now()}-2b`;

      // First claim should succeed
      const response1 = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId1);
      expect(response1.status).toBe(200);

      // Second claim should fail with 409
      const response2 = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId2);
      expect(response2.status).toBe(409);

      const errorData = await response2.json();
      expect(errorData.code).toBe('ALREADY_CLAIMED');
    });

    it('should handle idempotent requests (same requestId)', async () => {
      const requestId = `test-${Date.now()}-3`;

      // First request
      const response1 = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);
      expect(response1.status).toBe(200);
      const data1 = await response1.json();

      // Second request with same requestId
      const response2 = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);
      expect(response2.status).toBe(200);
      const data2 = await response2.json();

      // Should return identical data
      expect(data1.claim.id).toBe(data2.claim.id);
      expect(data1.slot.id).toBe(data2.slot.id);
    });

    it('should create outbox event on successful claim', async () => {
      const initialCount = await getOutboxCount();
      const requestId = `test-${Date.now()}-4`;

      const response = await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);
      expect(response.status).toBe(200);

      const finalCount = await getOutboxCount();
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should enforce RLS - different tenant cannot access slot', async () => {
      const requestId = `test-${Date.now()}-5`;

      // Mock request with different tenant_id by using a different JWT
      const body = JSON.stringify({
        slotId: TEST_SLOT_ID_1,
        companyId: TEST_COMPANY_ID,
        requestId
      });

      const { POST } = await import('../../src/app/api/claims/route');

      // Create request with wrong tenant token
      const mockRequest = new Request('http://localhost:3000/api/claims', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Buffer.from(JSON.stringify({
            tenant_id: '550e8400-e29b-41d4-a716-446655440999' // Wrong tenant
          })).toString('base64')}`
        },
        body
      });

      const response = await POST(mockRequest as any);

      // Should return error (slot not found due to RLS)
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Concurrent Claims Test', () => {
    it('should handle 10 concurrent claims - only 1 should succeed', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const requestId = `concurrent-${Date.now()}-${i}`;
        return mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);
      });

      const responses = await Promise.all(promises);

      // Count successful and conflict responses
      const successful = responses.filter(r => r.status === 200);
      const conflicts = responses.filter(r => r.status === 409);

      expect(successful.length).toBe(1);
      expect(conflicts.length).toBe(9);

      // Verify final slot status
      const status = await getSlotStatus(TEST_SLOT_ID_1);
      expect(status).toBe('claimed');
    });
  });

  describe('GET /api/alternatives', () => {
    it('should return alternative slots for same project and trade', async () => {
      // Claim one slot to create a scenario for alternatives
      const requestId = `test-${Date.now()}-6`;
      await mockClaimAPI(TEST_SLOT_ID_1, TEST_COMPANY_ID, requestId);

      // Get alternatives for the claimed slot
      const response = await mockAlternativesAPI(TEST_SLOT_ID_1, 3);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('alternatives');
      expect(Array.isArray(data.alternatives)).toBe(true);

      // Should return available alternatives (2 remaining slots)
      expect(data.alternatives.length).toBeGreaterThan(0);
      expect(data.alternatives.length).toBeLessThanOrEqual(3);

      // Check structure of alternatives
      if (data.alternatives.length > 0) {
        const alt = data.alternatives[0];
        expect(alt).toHaveProperty('slot_id');
        expect(alt).toHaveProperty('work_date');
        expect(alt).toHaveProperty('job_post');
        expect(alt.job_post).toHaveProperty('id');
        expect(alt.job_post).toHaveProperty('title');
        expect(alt.job_post).toHaveProperty('trade');
      }
    });

    it('should return alternatives ordered by work_date ASC', async () => {
      const response = await mockAlternativesAPI(TEST_SLOT_ID_1, 7);
      expect(response.status).toBe(200);

      const data = await response.json();

      if (data.alternatives.length > 1) {
        for (let i = 1; i < data.alternatives.length; i++) {
          const prevDate = new Date(data.alternatives[i - 1].work_date);
          const currDate = new Date(data.alternatives[i].work_date);
          expect(currDate >= prevDate).toBe(true);
        }
      }
    });

    it('should respect RLS for alternatives', async () => {
      const { GET } = await import('../../src/app/api/alternatives/route');

      // Request with wrong tenant
      const mockRequest = new Request(
        `http://localhost:3000/api/alternatives?slotId=${TEST_SLOT_ID_1}&days=3`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${Buffer.from(JSON.stringify({
              tenant_id: '550e8400-e29b-41d4-a716-446655440999' // Wrong tenant
            })).toString('base64')}`
          }
        }
      );

      const response = await GET(mockRequest as any);
      expect(response.status).toBe(404); // Slot not found due to RLS
    });
  });
});