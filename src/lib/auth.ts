import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

export interface JWTPayload {
  tenant_id: string;
  user_id?: string;
  role?: string;
  exp?: number;
}

export function getTenantFromJwt(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // For development: simple JWT decode without verification
  // In production, use proper JWT verification with secret
  try {
    if (token === 'dev-token') {
      // Development mode: return test tenant ID
      return '550e8400-e29b-41d4-a716-446655440001';
    }

    // Parse JWT payload (simplified for MVP)
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    return payload.tenant_id || null;
  } catch {
    return null;
  }
}

export async function verifyJwt(token: string): Promise<JWTPayload | null> {
  try {
    // For production: implement proper JWT verification
    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'dev-secret'
    );

    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    // For development: return test payload
    if (token === 'dev-token') {
      return {
        tenant_id: '550e8400-e29b-41d4-a716-446655440001',
        user_id: '550e8400-e29b-41d4-a716-446655440201',
        role: 'sub_admin'
      };
    }
    return null;
  }
}

export function requireAuth(request: NextRequest): { tenantId: string; userId?: string } {
  const tenantId = getTenantFromJwt(request);

  if (!tenantId) {
    throw new Error('Unauthorized: Invalid or missing JWT token');
  }

  // Extract user_id from JWT for audit logging
  // Simplified for MVP - in production, properly verify and extract
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.substring(7);
  let userId: string | undefined;

  try {
    if (token === 'dev-token') {
      userId = '550e8400-e29b-41d4-a716-446655440201';
    } else if (token) {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64').toString()
      );
      userId = payload.user_id;
    }
  } catch {
    // Continue without user_id
  }

  return { tenantId, userId };
}