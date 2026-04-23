// ==========================================
// STANDARDIZED API RESPONSE HELPERS
// Shared across all apps for consistent API behavior.
// ==========================================

import { ZodSchema, ZodError } from 'zod';

// ---- Response types ----

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ---- Response builders ----

export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiSuccessResponse<T>, { status });
}

export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
): Response {
  return Response.json(
    { success: false, error: { code, message, ...(details ? { details } : {}) } } satisfies ApiErrorResponse,
    { status },
  );
}

// ---- Convenience shortcuts ----

export function api401(message = 'Authentication required'): Response {
  return apiError('UNAUTHORIZED', message, 401);
}

export function api403(message = 'Forbidden'): Response {
  return apiError('FORBIDDEN', message, 403);
}

export function api404(resource: string): Response {
  return apiError('NOT_FOUND', `${resource} not found`, 404);
}

export function api500(message = 'Internal server error'): Response {
  return apiError('INTERNAL_ERROR', message, 500);
}

// ---- Validation helper ----

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): { data: T } | { error: Response } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { data: result.data };
  }
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    if (!fieldErrors[path]) fieldErrors[path] = [];
    fieldErrors[path].push(issue.message);
  }
  return {
    error: apiError('VALIDATION_ERROR', 'Request validation failed', 400, { fields: fieldErrors }),
  };
}

// ---- Safe JSON body parser ----

export async function parseJsonBody(request: Request): Promise<{ data: unknown } | { error: Response }> {
  try {
    const data = await request.json();
    return { data };
  } catch {
    return { error: apiError('INVALID_JSON', 'Request body must be valid JSON', 400) };
  }
}

// ---- Pagination helpers ----

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  status = 200,
): Response {
  const totalPages = Math.ceil(total / limit);
  return Response.json(
    {
      success: true,
      data: { items, total, page, limit, totalPages, hasMore: page < totalPages } satisfies PaginatedData<T>,
    },
    { status },
  );
}

// ---- Catch-all error handler for route handlers ----

export function handleRouteError(err: unknown): Response {
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return apiError('VALIDATION_ERROR', 'Validation failed', 400, { fields: fieldErrors });
  }

  if (err instanceof Error) {
    if (err.message === 'Unauthorized' || err.message === 'Authentication required') {
      return api401();
    }
    if (err.message.includes('not found')) {
      return apiError('NOT_FOUND', err.message, 404);
    }
    return apiError('BAD_REQUEST', err.message, 400);
  }

  return api500();
}
