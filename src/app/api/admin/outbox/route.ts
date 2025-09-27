import { NextRequest, NextResponse } from 'next/server';
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

interface OutboxEvent {
  id: number;
  event_id: string;
  event_name: string;
  payload: any;
  target: string;
  status: 'pending' | 'sent' | 'failed';
  retry_count: number;
  next_attempt_at: string;
  created_at: string;
  updated_at: string;
}

interface OutboxListResponse {
  events: OutboxEvent[];
  total_count: number;
  filtered_count: number;
}

export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const { tenantId, userId } = requireAuth(request);

    // TODO: In production, check for ops_admin role
    // For now, we'll allow any authenticated user within RLS constraints
    if (!userId) {
      return forbiddenError('Admin access required');
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Validate status parameter
    if (status && !['pending', 'sent', 'failed'].includes(status)) {
      return validationError('status must be one of: pending, sent, failed');
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 1000) {
      return validationError('limit must be between 1 and 1000');
    }

    if (offset < 0) {
      return validationError('offset must be non-negative');
    }

    const result = await withTransaction(async (client: PoolClient) => {
      // Set tenant context for RLS (if outbox table has tenant-based RLS)
      await setTenantContext(client, tenantId);

      // Build query conditions
      const conditions = [];
      const params = [];
      let paramIndex = 1;

      if (status) {
        conditions.push(`status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const totalCountQuery = `
        SELECT COUNT(*) as total_count
        FROM integration_outbox
        ${whereClause}
      `;
      const totalCountResult = await client.query(totalCountQuery, params);
      const totalCount = parseInt(totalCountResult.rows[0].total_count);

      // Get filtered events
      const eventsQuery = `
        SELECT
          id,
          event_id,
          event_name,
          payload,
          target,
          status,
          retry_count,
          next_attempt_at,
          created_at,
          updated_at
        FROM integration_outbox
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const eventsResult = await client.query(eventsQuery, [
        ...params,
        limit,
        offset
      ]);

      return {
        events: eventsResult.rows,
        total_count: totalCount,
        filtered_count: eventsResult.rowCount || 0
      };
    });

    const response: OutboxListResponse = {
      events: result.events,
      total_count: result.total_count,
      filtered_count: result.filtered_count
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Admin outbox API error:', error);
    return handleApiError(error);
  }
}

// Only GET method is supported for outbox listing
export async function POST() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}

export async function PUT() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}

export async function DELETE() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}