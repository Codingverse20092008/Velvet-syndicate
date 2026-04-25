import { NextResponse } from 'next/server';
import { ErrorCode } from './errors';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error: string | null;
  code: ErrorCode | null;
}

/**
 * Generates a standardized success response for Next.js
 */
export function successResponse<T>(data: T, status = 200) {
  const response: ApiResponse<T> = {
    success: true,
    data,
    error: null,
    code: null,
  };
  return NextResponse.json(response, { status });
}

/**
 * Generates a standardized error response for Next.js
 */
export function errorResponse(error: string, code: ErrorCode, status = 400, options: ResponseInit = {}) {
  const response: ApiResponse<null> = {
    success: false,
    data: null,
    error,
    code,
  };
  return NextResponse.json(response, { status, ...options });
}
