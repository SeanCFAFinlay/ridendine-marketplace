import type { NextRequest } from 'next/server';
import type { ZodSchema } from 'zod';
import { errorResponse, successResponse } from '@/lib/engine';
import type { OperationResult } from '@ridendine/types';

export async function parseJsonBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      'INVALID_INPUT',
      parsed.error.issues[0]?.message || 'Invalid request payload',
      400
    );
  }

  return parsed.data;
}

export function operationResultResponse<T>(
  result: OperationResult<T>,
  successStatus = 200
): Response {
  if (!result.success) {
    return errorResponse(
      result.error?.code || 'COMMAND_FAILED',
      result.error?.message || 'Operation failed',
      400
    );
  }
  return successResponse(result.data, successStatus);
}
