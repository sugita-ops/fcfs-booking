import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import { requireAuth } from '@/lib/auth';
import { withTransaction } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  notFoundError,
  conflictError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface RequeueResponse {
  event: {
    id: number;
    event_id: string;
    status: 'pending';
    retry_count: number;
    next_attempt_at: string;
    updated_at: string;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    if (!userId) {
      return forbiddenError('Admin access required');
    }

    const eventId = parseInt(params.id);

    if (isNaN(eventId)) {
      return jsonError('INVALID_EVENT_ID', 'Invalid event ID format', 400);
    }

    const result = await withTransaction(async (client: PoolClient) => {
      // Check if event exists and is in failed status
      const eventCheck = await client.query(`
        SELECT
          id,
          event_id,
          event_name,
          status,
          retry_count
        FROM integration_outbox
        WHERE id = $1
      `, [eventId]);

      if (eventCheck.rows.length === 0) {
        throw new Error('EVENT_NOT_FOUND');
      }

      const event = eventCheck.rows[0];

      if (event.status !== 'failed') {
        throw new Error('EVENT_NOT_FAILED');
      }

      // Add jitter to prevent thundering herd (±10% of current time)
      const now = new Date();
      const jitterMs = Math.random() * 0.2 * 60000 - 0.1 * 60000; // ±10% of 1 minute
      const nextAttemptAt = new Date(now.getTime() + jitterMs);

      // Update event to pending status with reset retry count
      const updateResult = await client.query(`
        UPDATE integration_outbox
        SET
          status = 'pending',
          retry_count = 0,
          next_attempt_at = $1,
          updated_at = now()
        WHERE id = $2
        RETURNING
          id,
          event_id,
          status,
          retry_count,
          next_attempt_at,
          updated_at
      `, [nextAttemptAt, eventId]);

      const updatedEvent = updateResult.rows[0];

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
        tenantId,
        userId,
        'ops_admin',
        'outbox_requeue',
        'integration_outbox',
        eventId.toString(),
        JSON.stringify({
          event_id: event.event_id,
          event_name: event.event_name,
          previous_status: 'failed',
          new_status: 'pending',
          previous_retry_count: event.retry_count,
          new_retry_count: 0,
          next_attempt_at: nextAttemptAt.toISOString()
        })
      ]);

      return updatedEvent;
    });

    const response: RequeueResponse = {
      event: result
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Requeue outbox event API error:', error);

    if (error instanceof Error) {
      switch (error.message) {
        case 'EVENT_NOT_FOUND':
          return notFoundError('Outbox event not found');

        case 'EVENT_NOT_FAILED':
          return conflictError(
            'EVENT_NOT_FAILED',
            'Only failed events can be requeued'
          );
      }
    }

    return handleApiError(error);
  }
}

// Only POST method is supported
export async function GET() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only POST method is supported', 405);
}

export async function PUT() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only POST method is supported', 405);
}

export async function DELETE() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only POST method is supported', 405);
}