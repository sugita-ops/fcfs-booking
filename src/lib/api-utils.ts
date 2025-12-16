import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { TenantUser, Subcontractor, AdminUser } from '@/types/database';

// API Response helper
export function apiResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

// API Error helper
export function apiError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { error: { message, code: code || 'ERROR' } },
    { status }
  );
}

// Common error responses
export const errors = {
  unauthorized: () => apiError('Unauthorized', 401, 'UNAUTHORIZED'),
  forbidden: () => apiError('Forbidden', 403, 'FORBIDDEN'),
  notFound: (resource = 'Resource') => apiError(`${resource} not found`, 404, 'NOT_FOUND'),
  badRequest: (message: string) => apiError(message, 400, 'BAD_REQUEST'),
  internal: (message = 'Internal server error') => apiError(message, 500, 'INTERNAL_ERROR'),
};

// User info from auth
export interface AuthUser {
  userId: string;
  type: 'tenant_user' | 'subcontractor' | 'admin';
  tenantUser?: TenantUser;
  subcontractor?: Subcontractor;
  adminUser?: AdminUser;
  tenantId?: string;
}

// Get authenticated user and their profile
export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Check admin
  const { data: adminUser } = await supabase
    .from('admin_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single();

  if (adminUser) {
    return {
      userId: user.id,
      type: 'admin',
      adminUser,
    };
  }

  // Check tenant user
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single();

  if (tenantUser) {
    return {
      userId: user.id,
      type: 'tenant_user',
      tenantUser,
      tenantId: tenantUser.tenant_id,
    };
  }

  // Check subcontractor
  const { data: subcontractor } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('auth_user_id', user.id)
    .eq('status', 'active')
    .single();

  if (subcontractor) {
    return {
      userId: user.id,
      type: 'subcontractor',
      subcontractor,
    };
  }

  return null;
}

// Require authentication
export async function requireAuth(): Promise<AuthUser> {
  const authUser = await getAuthUser();
  if (!authUser) {
    throw new AuthError('Unauthorized', 401);
  }
  return authUser;
}

// Require tenant user
export async function requireTenantUser(): Promise<AuthUser & { tenantUser: TenantUser; tenantId: string }> {
  const authUser = await requireAuth();
  if (authUser.type !== 'tenant_user' || !authUser.tenantUser || !authUser.tenantId) {
    throw new AuthError('Forbidden', 403);
  }
  return authUser as AuthUser & { tenantUser: TenantUser; tenantId: string };
}

// Require subcontractor
export async function requireSubcontractor(): Promise<AuthUser & { subcontractor: Subcontractor }> {
  const authUser = await requireAuth();
  if (authUser.type !== 'subcontractor' || !authUser.subcontractor) {
    throw new AuthError('Forbidden', 403);
  }
  return authUser as AuthUser & { subcontractor: Subcontractor };
}

// Require admin
export async function requireAdmin(): Promise<AuthUser & { adminUser: AdminUser }> {
  const authUser = await requireAuth();
  if (authUser.type !== 'admin' || !authUser.adminUser) {
    throw new AuthError('Forbidden', 403);
  }
  return authUser as AuthUser & { adminUser: AdminUser };
}

// Custom auth error
export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// API route wrapper with error handling
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | { error: { message: string; code: string } }>> {
  return handler().catch((error) => {
    console.error('API Error:', error);

    if (error instanceof AuthError) {
      return apiError(error.message, error.status, error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN');
    }

    return errors.internal(error.message);
  });
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export function getPagination(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  return { page, limit, from, to };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
