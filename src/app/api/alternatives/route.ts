import { NextRequest } from 'next/server';
import { AlternativesResponse } from '@/types/api';
import { alternativesQuerySchema, validateQueryParams } from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import { queryWithTenant } from '@/lib/database';
import {
  jsonSuccess,
  validationError,
  notFoundError,
  handleApiError
} from '@/lib/responses';

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication and authorization
    const { tenantId } = requireAuth(request);

    // 2. Parse and validate query parameters
    const { searchParams } = new URL(request.url);
    const validation = validateQueryParams(alternativesQuerySchema, searchParams);

    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slotId, days } = validation.data;

    // 3. Get original slot information to determine search criteria
    const originalSlotQuery = await queryWithTenant(
      tenantId,
      `
      SELECT
        js.job_post_id,
        js.work_date,
        jp.project_id,
        jp.trade,
        jp.title as job_title
      FROM job_slots js
      JOIN job_posts jp ON js.job_post_id = jp.id
      WHERE js.id = $1 AND js.tenant_id = $2
      `,
      [slotId, tenantId]
    );

    if (originalSlotQuery.rows.length === 0) {
      return notFoundError('Slot');
    }

    const originalSlot = originalSlotQuery.rows[0];

    // 4. Find alternative slots
    // Search criteria:
    // - Same project_id and trade
    // - Within ±days range of original work_date
    // - Status = 'available'
    // - Order by work_date ASC, created_at DESC
    // - Limit to 3 alternatives
    const alternativesResult = await queryWithTenant(
      tenantId,
      `
      SELECT
        js.id as slot_id,
        js.work_date,
        jp.id as job_post_id,
        jp.title,
        jp.trade,
        js.created_at
      FROM job_slots js
      JOIN job_posts jp ON js.job_post_id = jp.id
      WHERE
        jp.project_id = $1
        AND jp.trade = $2
        AND js.status = 'available'
        AND js.id != $3
        AND js.work_date BETWEEN
          ($4::date - INTERVAL '1 day' * $6) AND
          ($4::date + INTERVAL '1 day' * $6)
        AND js.tenant_id = $5
      ORDER BY
        js.work_date ASC,
        js.created_at DESC
      LIMIT 3
      `,
      [
        originalSlot.project_id,
        originalSlot.trade,
        slotId,
        originalSlot.work_date,
        tenantId,
        days
      ]
    );

    // 5. Format response
    const alternatives = alternativesResult.rows.map((row: any) => ({
      slot_id: row.slot_id,
      work_date: row.work_date,
      job_post: {
        id: row.job_post_id,
        title: row.title,
        trade: row.trade
      }
    }));

    const response: AlternativesResponse = {
      alternatives
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Alternatives API error:', error);
    return handleApiError(error);
  }
}

// Only GET method is supported
export async function POST() {
  return jsonSuccess({ message: 'Method not allowed' }, 405);
}

export async function PUT() {
  return jsonSuccess({ message: 'Method not allowed' }, 405);
}

export async function DELETE() {
  return jsonSuccess({ message: 'Method not allowed' }, 405);
}