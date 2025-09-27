import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { requireAuth } from '@/lib/auth';
import { withTransaction, setTenantContext } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  validationError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface Tenant {
  id: string;
  name: string;
  integration_mode: 'standalone' | 'dandori';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantsListResponse {
  tenants: Tenant[];
  total_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    // For MVP, any authenticated user can view tenants (ops_admin check)
    if (!userId) {
      return forbiddenError('Admin access required');
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Validate parameters
    if (limit < 1 || limit > 1000) {
      return validationError('limit must be between 1 and 1000');
    }

    if (offset < 0) {
      return validationError('offset must be non-negative');
    }

    const result = await withTransaction(async (client: PoolClient) => {
      // Don't set tenant context for admin operations - we want to see all tenants

      // Get total count
      const totalCountResult = await client.query(`
        SELECT COUNT(*) as total_count FROM tenants
      `);
      const totalCount = parseInt(totalCountResult.rows[0].total_count);

      // Get tenants
      const tenantsResult = await client.query(`
        SELECT
          id,
          name,
          integration_mode,
          is_active,
          created_at,
          updated_at
        FROM tenants
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);

      return {
        tenants: tenantsResult.rows,
        total_count: totalCount
      };
    });

    const response: TenantsListResponse = {
      tenants: result.tenants,
      total_count: result.total_count
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Admin tenants API error:', error);
    return handleApiError(error);
  }
}

// Only GET method is supported for listing
export async function POST() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}

export async function PUT() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}

export async function DELETE() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}