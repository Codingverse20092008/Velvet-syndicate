import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { handleApiError, getStatusCode } from './errors';
import { logger } from './logger';
import { errorResponse } from './api-response-express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return errorResponse(
      res,
      err.issues[0]?.message || 'Validation failed',
      'VALIDATION_ERROR',
      400
    );
  }

  const { error: message, code } = handleApiError(err);
  const status = getStatusCode(err);

  logger.error({ err, path: req.path, method: req.method }, 'API Error');

  return errorResponse(res, message, code as any, status);
}


// Async handler wrapper for Express
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
