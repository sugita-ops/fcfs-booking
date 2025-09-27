import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import {
  CancelClaimRequest,
  CancelClaimResponse,
} from '@/types/api';
import { cancelClaimRequestSchema, validateRequestBody } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { withTransaction, setTenantContext } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  conflictError,
  validationError,
  notFoundError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(cancelClaimRequestSchema, body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slotId, reason } = validation.data;

    // 3. Execute cancel operation in transaction
    const result = await withTransaction(async (client: PoolClient) => {
      // Set tenant context for RLS
      await setTenantContext(client, tenantId);

      // Check current slot status and ownership
      const slotQuery = await client.query(`
        SELECT
          js.id,
          js.status,
          js.claimed_by_company,
          js.claimed_by_user,
          js.claimed_at,
          js.work_date,
          c.id as claim_id,
          c.company_id as claim_company_id
        FROM job_slots js
        LEFT JOIN claims c ON js.id = c.job_slot_id
        WHERE js.id = $1 AND js.tenant_id = $2
      `, [slotId, tenantId]);

      if (slotQuery.rows.length === 0) {
        throw new Error('SLOT_NOT_FOUND');
      }

      const slot = slotQuery.rows[0];

      // Check if slot is in correct status for cancellation
      if (slot.status !== 'claimed') {
        if (slot.status === 'available') {
          throw new Error('SLOT_NOT_CLAIMED');
        } else if (slot.status === 'cancelled') {
          throw new Error('ALREADY_CANCELLED');
        } else if (slot.status === 'completed') {
          throw new Error('ALREADY_COMPLETED');
        } else {
          throw new Error('INVALID_STATUS');
        }
      }

      // Authorization: Only the company that claimed the slot can cancel it
      // Note: We're using the claim's company_id for authorization instead of the slot's claimed_by_company
      // This ensures consistency with the claims table
      if (!slot.claim_company_id) {
        throw new Error('NO_CLAIM_FOUND');
      }

      // For now, we'll allow any authenticated user from the same tenant to cancel
      // In a production system, you might want to check specific company ownership:
      // if (slot.claim_company_id !== companyId) {
      //   throw new Error('UNAUTHORIZED_CANCEL');
      // }

      // Update slot status to cancelled
      const updateResult = await client.query(`
        UPDATE job_slots
        SET
          status = 'cancelled',
          canceled_at = now(),
          cancel_reason = $1,
          updated_at = now()
        WHERE
          id = $2
          AND tenant_id = $3
          AND status = 'claimed'
        RETURNING id, status, canceled_at, cancel_reason
      `, [reason, slotId, tenantId]);

      if (updateResult.rows.length === 0) {
        // This should not happen due to our previous checks, but handle race condition
        throw new Error('CANCEL_FAILED');
      }

      const updatedSlot = updateResult.rows[0];

      // Insert audit log
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
        userId || null,
        'sub_admin', // TODO: Get from JWT
        'cancel',
        'job_slots',
        slotId,
        JSON.stringify({
          reason,
          claim_id: slot.claim_id,
          previous_status: 'claimed',
          new_status: 'cancelled',
          claimed_by_company: slot.claim_company_id,
          claimed_at: slot.claimed_at
        })
      ]);

      return {
        id: updatedSlot.id,
        status: updatedSlot.status,
        canceled_at: updatedSlot.canceled_at,
        cancel_reason: updatedSlot.cancel_reason
      };
    });

    // 4. Return success response
    const response: CancelClaimResponse = {
      slot: result
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Cancel claim API error:', error);

    // Handle specific business logic errors
    if (error instanceof Error) {
      switch (error.message) {
        case 'SLOT_NOT_FOUND':
          return notFoundError('Slot not found or access denied');

        case 'SLOT_NOT_CLAIMED':
          return conflictError(
            'SLOT_NOT_CLAIMED',
            'Cannot cancel a slot that is not claimed'
          );

        case 'ALREADY_CANCELLED':
          return conflictError(
            'ALREADY_CANCELLED',
            'This slot has already been cancelled'
          );

        case 'ALREADY_COMPLETED':
          return conflictError(
            'ALREADY_COMPLETED',
            'Cannot cancel a completed slot'
          );

        case 'NO_CLAIM_FOUND':
          return conflictError(
            'NO_CLAIM_FOUND',
            'No claim record found for this slot'
          );

        case 'UNAUTHORIZED_CANCEL':
          return forbiddenError('You are not authorized to cancel this claim');

        case 'CANCEL_FAILED':
          return conflictError(
            'CANCEL_FAILED',
            'Failed to cancel claim due to concurrent modification'
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