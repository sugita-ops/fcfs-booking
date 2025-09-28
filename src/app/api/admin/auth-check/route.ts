import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import {
  jsonSuccess,
  jsonError,
  forbiddenError,
  handleApiError
} from '@/lib/responses';

interface AuthCheckResponse {
  user: {
    user_id: string | null | undefined;
    tenant_id: string;
    role: string;
  };
  permissions: {
    can_access_admin: boolean;
    can_manage_tenants: boolean;
    can_view_outbox: boolean;
    can_requeue_events: boolean;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Authentication required
    const { tenantId, userId } = requireAuth(request);

    // For MVP, we'll consider any authenticated user as ops_admin
    // In production, check the actual role from JWT or database
    const isOpsAdmin = true; // TODO: Implement proper role checking

    if (!isOpsAdmin) {
      return forbiddenError('Admin access required');
    }

    const response: AuthCheckResponse = {
      user: {
        user_id: userId,
        tenant_id: tenantId,
        role: 'ops_admin'
      },
      permissions: {
        can_access_admin: true,
        can_manage_tenants: true,
        can_view_outbox: true,
        can_requeue_events: true
      }
    };

    return jsonSuccess(response);

  } catch (error) {
    console.error('Auth check API error:', error);
    return handleApiError(error);
  }
}

// Only GET method is supported
export async function POST() {
  return jsonError('METHOD_NOT_ALLOWED', 'Only GET method is supported', 405);
}