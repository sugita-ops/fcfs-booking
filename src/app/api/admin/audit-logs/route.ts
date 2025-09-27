import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { requireAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  validationError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface AuditLog {
  id: number;
  tenant_id: string;
  actor_user_id: string | null;
  actor_role: string;
  action: string;
  target_table: string;
  target_id: string;
  payload: any;
  created_at: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total_count: number;
  filtered_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    if (!userId) {
      return forbiddenError('Admin access required');
    }

    // Parse query parameters
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');
    const actorUser = url.searchParams.get('actor_user');
    const action = url.searchParams.get('action');
    const targetTable = url.searchParams.get('target_table');

    // Validate parameters
    if (limit < 1 || limit > 1000) {
      return validationError('limit must be between 1 and 1000');
    }

    if (offset < 0) {
      return validationError('offset must be non-negative');
    }

    // Default to last 7 days if no date range specified
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultStartDate.getDate() - 7);

    const result = await withTransaction(async (client: PoolClient) => {
      // Build WHERE conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      // Date range filter
      const actualStartDate = startDate || defaultStartDate.toISOString().split('T')[0];
      const actualEndDate = endDate || new Date().toISOString().split('T')[0];

      conditions.push(`created_at >= $${paramIndex}::date`);
      params.push(actualStartDate);
      paramIndex++;

      conditions.push(`created_at <= $${paramIndex}::date + interval '1 day'`);
      params.push(actualEndDate);
      paramIndex++;

      // Optional filters
      if (actorUser) {
        conditions.push(`actor_user_id = $${paramIndex}`);
        params.push(actorUser);
        paramIndex++;
      }

      if (action) {
        conditions.push(`action = $${paramIndex}`);
        params.push(action);
        paramIndex++;
      }

      if (targetTable) {
        conditions.push(`target_table = $${paramIndex}`);
        params.push(targetTable);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const totalCountQuery = `
        SELECT COUNT(*) as total_count
        FROM audit_logs
        ${whereClause}
      `;
      const totalCountResult = await client.query(totalCountQuery, params);
      const totalCount = parseInt(totalCountResult.rows[0].total_count);

      // Get audit logs
      const logsQuery = `
        SELECT
          id,
          tenant_id,
          actor_user_id,
          actor_role,
          action,
          target_table,
          target_id,
          payload,
          created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const logsResult = await client.query(logsQuery, [
        ...params,
        limit,
        offset
      ]);

      return {
        logs: logsResult.rows,
        total_count: totalCount,
        filtered_count: logsResult.rowCount || 0
      };
    });

    const response: AuditLogsResponse = {
      logs: result.logs,
      total_count: result.total_count,
      filtered_count: result.filtered_count
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Admin audit logs API error:', error);
    return handleApiError(error);
  }
}

// Only GET method is supported
export async function POST() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}