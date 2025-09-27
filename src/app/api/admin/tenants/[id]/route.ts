import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { requireAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  validationError,
  notFoundError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface TenantUpdateRequest {
  integration_mode?: 'standalone' | 'dandori';
  is_active?: boolean;
}

interface TenantUpdateResponse {
  tenant: {
    id: string;
    name: string;
    integration_mode: 'standalone' | 'dandori';
    is_active: boolean;
    updated_at: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    if (!userId) {
      return forbiddenError('Admin access required');
    }

    const targetTenantId = params.id;

    const result = await withTransaction(async (client: PoolClient) => {
      // Get specific tenant
      const tenantResult = await client.query(`
        SELECT
          id,
          name,
          integration_mode,
          is_active,
          created_at,
          updated_at
        FROM tenants
        WHERE id = $1
      `, [targetTenantId]);

      if (tenantResult.rows.length === 0) {
        throw new Error('TENANT_NOT_FOUND');
      }

      return tenantResult.rows[0];
    });

    return jsonSuccess({ tenant: result });

  } catch (error) {
    console.error('Admin tenant detail API error:', error);

    if (error instanceof Error && error.message === 'TENANT_NOT_FOUND') {
      return notFoundError('Tenant not found');
    }

    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    if (!userId) {
      return forbiddenError('Admin access required');
    }

    const targetTenantId = params.id;

    // Parse and validate request body
    const body = await request.json() as TenantUpdateRequest;

    // Validate fields
    if (body.integration_mode && !['standalone', 'dandori'].includes(body.integration_mode)) {
      return validationError('integration_mode must be either "standalone" or "dandori"');
    }

    if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
      return validationError('is_active must be a boolean');
    }

    // Check if there's anything to update
    if (!body.integration_mode && body.is_active === undefined) {
      return validationError('No fields to update provided');
    }

    const result = await withTransaction(async (client: PoolClient) => {
      // Check if tenant exists
      const tenantCheck = await client.query(`
        SELECT id, name, integration_mode, is_active
        FROM tenants
        WHERE id = $1
      `, [targetTenantId]);

      if (tenantCheck.rows.length === 0) {
        throw new Error('TENANT_NOT_FOUND');
      }

      const currentTenant = tenantCheck.rows[0];

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      if (body.integration_mode) {
        updateFields.push(`integration_mode = $${paramIndex}`);
        updateValues.push(body.integration_mode);
        paramIndex++;
      }

      if (body.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        updateValues.push(body.is_active);
        paramIndex++;
      }

      updateFields.push(`updated_at = now()`);
      updateValues.push(targetTenantId);

      const updateQuery = `
        UPDATE tenants
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, integration_mode, is_active, updated_at
      `;

      const updateResult = await client.query(updateQuery, updateValues);
      const updatedTenant = updateResult.rows[0];

      // Create audit log
      await client.query(`
        INSERT INTO audit_logs (
          tenant_id,
          actor_user_id,
          actor_role,
          action,
          target_table,
          target_id,
          payload,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      `, [
        targetTenantId,
        userId,
        'ops_admin',
        'tenant_update',
        'tenants',
        targetTenantId,
        JSON.stringify({
          previous: {
            integration_mode: currentTenant.integration_mode,
            is_active: currentTenant.is_active
          },
          updated: {
            integration_mode: body.integration_mode || currentTenant.integration_mode,
            is_active: body.is_active !== undefined ? body.is_active : currentTenant.is_active
          }
        })
      ]);

      return updatedTenant;
    });

    const response: TenantUpdateResponse = {
      tenant: result
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Admin tenant update API error:', error);

    if (error instanceof Error && error.message === 'TENANT_NOT_FOUND') {
      return notFoundError('Tenant not found');
    }

    return handleApiError(error);
  }
}

// Only GET and PUT methods are supported
export async function POST() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET and PUT methods are supported', 405);
}

export async function DELETE() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET and PUT methods are supported', 405);
}