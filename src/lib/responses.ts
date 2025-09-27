import { NextResponse } from 'next/server';
import { ApiError } from '@/types/api';

export function jsonError(
  code: string,
  message: string,
  status: number = 400
): NextResponse<ApiError> {
  return NextResponse.json(
    { code, message },
    { status }
  );
}

export function jsonSuccess<T>(data: T, status: number = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

// Specific error responses for common cases
export function unauthorizedError(): NextResponse<ApiError> {
  return jsonError('UNAUTHORIZED', 'Invalid or missing authentication', 401);
}

export function forbiddenError(message: string = 'Access denied'): NextResponse<ApiError> {
  return jsonError('FORBIDDEN', message, 403);
}

export function notFoundError(resource: string = 'Resource'): NextResponse<ApiError> {
  return jsonError('NOT_FOUND', `${resource} not found`, 404);
}

export function validationError(details: string): NextResponse<ApiError> {
  return jsonError('VALIDATION_ERROR', `Invalid input: ${details}`, 422);
}

export function conflictError(code: string, message: string): NextResponse<ApiError> {
  return jsonError(code, message, 409);
}

export function internalServerError(message: string = 'Internal server error'): NextResponse<ApiError> {
  return jsonError('INTERNAL_ERROR', message, 500);
}

// Error handler for catching and formatting unexpected errors
export function handleApiError(error: unknown): NextResponse<ApiError> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('Unauthorized')) {
      return unauthorizedError();
    }

    if (error.message.includes('not found')) {
      return notFoundError();
    }

    // Database constraint violations
    if (error.message.includes('duplicate key')) {
      return conflictError('DUPLICATE_ENTRY', 'Resource already exists');
    }

    if (error.message.includes('foreign key')) {
      return validationError('Referenced resource does not exist');
    }
  }

  return internalServerError();
}