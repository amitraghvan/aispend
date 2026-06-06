/**
 * API Contract — Standardized Response Format
 *
 * Every API response uses this format for consistency.
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export function apiSuccess<T>(data: T, meta?: ApiSuccessResponse<T>['meta']): NextResponse<ApiSuccessResponse<T>> {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
  if (meta) body.meta = meta;
  return NextResponse.json(body, { status: 200 });
}

export function apiCreated<T>(data: T): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true as const, data, timestamp: new Date().toISOString() },
    { status: 201 }
  );
}

export function apiError(
  code: string,
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: { code, message, ...(details ? { details } : {}) },
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function apiNotFound(message: string = 'Resource not found'): NextResponse<ApiErrorResponse> {
  return apiError('NOT_FOUND', message, 404);
}

export function apiValidationError(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError('VALIDATION_ERROR', message, 400, details);
}

export function apiServerError(message: string = 'Internal server error'): NextResponse<ApiErrorResponse> {
  return apiError('INTERNAL_ERROR', message, 500);
}

export function apiRateLimited(): NextResponse<ApiErrorResponse> {
  return apiError('RATE_LIMITED', 'Too many requests. Please try again later.', 429);
}

/**
 * Pagination helper
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function parsePagination(
  searchParams: URLSearchParams,
  defaults: { page?: number; pageSize?: number } = {}
): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || String(defaults.page ?? 1), 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || String(defaults.pageSize ?? 20), 10)));
  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
