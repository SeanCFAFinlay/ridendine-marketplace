import { randomUUID } from 'crypto';

const HEADER_NAME = 'x-correlation-id';

export function getCorrelationId(request: Request): string {
  const existing = request.headers.get(HEADER_NAME)?.trim();
  if (existing) return existing.slice(0, 128);
  return randomUUID();
}

export function withCorrelationId(response: Response, correlationId: string): Response {
  response.headers.set(HEADER_NAME, correlationId);
  return response;
}
