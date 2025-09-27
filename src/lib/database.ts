import { Pool, PoolClient } from 'pg';

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export { pool };

// Transaction wrapper with proper error handling
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Set tenant context for RLS (used in tests)
export async function setTenantContext(
  client: PoolClient,
  tenantId: string
): Promise<void> {
  await client.query(
    "SELECT set_config('request.jwt.claims', $1, true)",
    [JSON.stringify({ tenant_id: tenantId })]
  );
}

// Clear tenant context
export async function clearTenantContext(
  client: PoolClient
): Promise<void> {
  await client.query(
    "SELECT set_config('request.jwt.claims', '', true)"
  );
}

// Simple query helper with RLS context
export async function queryWithTenant(
  tenantId: string,
  text: string,
  params?: any[]
): Promise<any> {
  const client = await pool.connect();

  try {
    await setTenantContext(client, tenantId);
    const result = await client.query(text, params);
    return result;
  } finally {
    await clearTenantContext(client);
    client.release();
  }
}

// Generate UUID for database operations
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}