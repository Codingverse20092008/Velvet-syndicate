import { Response } from 'express';
import { ErrorCode } from './errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  code: ErrorCode | null;
}

/**
 * Generates a standardized success response for Express
 */
export function successResponse(res: Response, data: any, status = 200) {
  const response: ApiResponse = {
    success: true,
    data,
    error: null,
    code: null,
  };
  return res.status(status).json(response);
}

/**
 * Generates a standardized error response for Express
 */
export function errorResponse(res: Response, error: string, code: ErrorCode, status = 400) {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error,
    code,
  };
  return res.status(status).json(response);
}
