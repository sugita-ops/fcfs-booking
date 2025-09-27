import { NextRequest } from 'next/server';
import { PoolClient } from 'pg';
import {
  ClaimRequest,
  ClaimResponse,
  JobSlot,
  Claim,
  IntegrationOutboxEvent
} from '@/types/api';
import { claimRequestSchema, validateRequestBody } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { withTransaction, generateUuid, setTenantContext } from '@/lib/database';
import {
  jsonSuccess,
  jsonError,
  conflictError,
  validationError,
  internalServerError,
  handleApiError
} from '@/lib/responses';
import { generateEventId, createClaimConfirmedPayload } from '@/lib/crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Authentication and authorization
    const { tenantId, userId } = requireAuth(request);

    // 2. Parse and validate request body
    const body = await request.json();
    const validation = validateRequestBody(claimRequestSchema, body);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slotId, companyId, requestId } = validation.data;

    // 3. Execute FCFS claim in transaction
    const result = await withTransaction(async (client: PoolClient) => {
      // Set tenant context for RLS
      await setTenantContext(client, tenantId);

      // Check for idempotency - if request_id already exists, return existing result
      const existingClaim = await client.query(`
        SELECT
          c.id as claim_id,
          c.company_id,
          c.user_id,
          c.claimed_at,
          js.id as slot_id,
          js.status,
          js.work_date
        FROM claims c
        JOIN job_slots js ON c.job_slot_id = js.id
        WHERE c.request_id = $1 AND c.tenant_id = $2
      `, [requestId, tenantId]);

      if (existingClaim.rows.length > 0) {
        const existing = existingClaim.rows[0];
        return {
          isIdempotent: true,
          slot: {
            id: existing.slot_id,
            status: existing.status,
            work_date: existing.work_date
          },
          claim: {
            id: existing.claim_id,
            company_id: existing.company_id,
            user_id: existing.user_id,
            claimed_at: existing.claimed_at
          }
        };
      }

      // Atomic FCFS operation: Update slot with conditions
      const slotUpdate = await client.query(`
        UPDATE job_slots
        SET
          claimed_by_company = $1,
          claimed_by_user = $2,
          claimed_at = now(),
          status = 'claimed',
          updated_at = now()
        WHERE
          id = $3
          AND tenant_id = $4
          AND status = 'available'
        RETURNING
          id,
          job_post_id,
          work_date,
          status,
          claimed_at
      `, [companyId, userId || null, slotId, tenantId]);

      // Check if slot was successfully claimed
      if (slotUpdate.rows.length === 0) {
        // Slot was not available - check if it exists and get current status
        const slotCheck = await client.query(`
          SELECT id, status
          FROM job_slots
          WHERE id = $1 AND tenant_id = $2
        `, [slotId, tenantId]);

        if (slotCheck.rows.length === 0) {
          throw new Error('Slot not found or access denied');
        }

        // Slot exists but not available - return conflict
        return { isConflict: true };
      }

      const updatedSlot = slotUpdate.rows[0];

      // Create claim record
      const claimId = generateUuid();
      const claimInsert = await client.query(`
        INSERT INTO claims (
          id,
          tenant_id,
          job_slot_id,
          company_id,
          user_id,
          request_id,
          claimed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, company_id, user_id, claimed_at
      `, [
        claimId,
        tenantId,
        slotId,
        companyId,
        userId || null,
        requestId,
        updatedSlot.claimed_at
      ]);

      const newClaim = claimInsert.rows[0];

      // Get additional data for outbox payload
      const jobPostQuery = await client.query(`
        SELECT jp.id, jp.title, jp.trade, p.dw_project_id
        FROM job_posts jp
        JOIN projects p ON jp.project_id = p.id
        WHERE jp.id = $1 AND jp.tenant_id = $2
      `, [updatedSlot.job_post_id, tenantId]);

      const jobPost = jobPostQuery.rows[0];

      // Create structured payload using utility function
      const payload = createClaimConfirmedPayload({
        claim_id: claimId,
        slot_id: slotId,
        company_id: companyId,
        user_id: userId || null,
        work_date: updatedSlot.work_date,
        claimed_at: updatedSlot.claimed_at,
        tenant_id: tenantId,
        dw_project_id: jobPost?.dw_project_id || null,
        job_post_id: updatedSlot.job_post_id
      });

      // Insert integration outbox event with structured payload
      const eventId = generateEventId('claim', claimId);
      await client.query(`
        INSERT INTO integration_outbox (
          event_id,
          event_name,
          payload,
          target,
          status,
          next_attempt_at,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, now(), now())
      `, [
        eventId,
        'claim.confirmed',
        JSON.stringify(payload),
        'dw',
        'pending'
      ]);

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
        'claim',
        'job_slots',
        slotId,
        JSON.stringify({
          company_id: companyId,
          request_id: requestId,
          previous_status: 'available',
          new_status: 'claimed'
        })
      ]);

      return {
        isSuccess: true,
        slot: {
          id: updatedSlot.id,
          status: updatedSlot.status,
          work_date: updatedSlot.work_date
        },
        claim: {
          id: newClaim.id,
          company_id: newClaim.company_id,
          user_id: newClaim.user_id,
          claimed_at: newClaim.claimed_at
        }
      };
    });

    // 4. Handle transaction result
    if (result.isConflict) {
      return conflictError(
        'ALREADY_CLAIMED',
        'This slot has been claimed by someone else.'
      );
    }

    if (result.isIdempotent || result.isSuccess) {
      const response: ClaimResponse = {
        slot: result.slot,
        claim: result.claim
      };
      return jsonSuccess(response);
    }

    return internalServerError('Unexpected transaction result');

  } catch (error) {
    console.error('Claim API error:', error);
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