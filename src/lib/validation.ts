import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid('Invalid UUID format');

// Claims API Schemas
export const claimRequestSchema = z.object({
  slotId: uuidSchema,
  companyId: uuidSchema,
  requestId: uuidSchema,
});

export const alternativesQuerySchema = z.object({
  slotId: uuidSchema,
  days: z.coerce.number().int().min(1).max(30).default(3),
});

export const cancelClaimRequestSchema = z.object({
  slotId: uuidSchema,
  reason: z.enum(['no_show', 'weather', 'client_change', 'material_delay', 'other']),
});

// Validation helper
export function validateRequestBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Invalid input' };
  }
}

export function validateQueryParams<T>(
  schema: z.ZodSchema<T>,
  params: URLSearchParams
): { success: true; data: T } | { success: false; error: string } {
  try {
    const queryObject = Object.fromEntries(params.entries());
    const result = schema.parse(queryObject);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join(', ') };
    }
    return { success: false, error: 'Invalid query parameters' };
  }
}