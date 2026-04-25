import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-response';
import { ZodError } from 'zod';
import { handleApiError, getStatusCode } from './errors';

type Handler = (req: NextRequest, params: any) => Promise<NextResponse>;

export function withErrorHandling(handler: Handler) {
  return async (req: NextRequest, params: any) => {
    try {
      return await handler(req, params);
    } catch (error) {
      if (error instanceof ZodError) {
        return errorResponse(
          error.issues[0]?.message || 'Validation failed',
          'VALIDATION_ERROR',
          400
        );
      }

      const { error: message, code } = handleApiError(error);
      const status = getStatusCode(error);

      return errorResponse(message, code, status);
    }
  };
}

