import { logger } from './logger';
import { ErrorCode } from './api-response';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode = 500,
    public code: ErrorCode = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'UNAUTHORIZED'); // Mapping Forbidden to UNAUTHORIZED for simplicity if not in list
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'VALIDATION_ERROR'); // Mapping Conflict to VALIDATION_ERROR if not in list
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}

export class OutOfStockError extends AppError {
  constructor(message = 'Item out of stock') {
    super(message, 400, 'OUT_OF_STOCK');
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      data: null,
    };
  }

  logger.error({ err: error }, 'Unexpected error');
  return {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR' as ErrorCode,
    data: null,
  };
}

export function getStatusCode(error: unknown): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}