// ==========================================
// SHARED ENGINE CLIENT HELPERS
// Common utilities used by all app engine wrappers
// FND-016 fix: consolidated from 4 app-level duplicates
// ==========================================

import { createAdminClient } from '@ridendine/db';
import { createCentralEngine, type CentralEngine } from './core/engine.factory';
import type { PaymentAdapter } from './types/payment-adapter';

// Payment adapter registered once at app startup
let registeredPaymentAdapter: PaymentAdapter | undefined;

/**
 * Register a PaymentAdapter so the engine can void Stripe payments on reject/cancel.
 * Call this once at app startup before getAdminEngine() is first called.
 */
export function registerPaymentAdapter(adapter: PaymentAdapter): void {
  registeredPaymentAdapter = adapter;
}

/**
 * Get a fresh central engine instance per request.
 * Uses admin client for full database access.
 * Named getAdminEngine to avoid conflict with core getEngine(client).
 */
export function getAdminEngine(): CentralEngine {
  const client = createAdminClient();
  return createCentralEngine(client, registeredPaymentAdapter);
}

/**
 * Reset the payment adapter (for testing)
 */
export function resetEngineClient(): void {
  registeredPaymentAdapter = undefined;
}

/**
 * Standard JSON error response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400
): Response {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

/**
 * Standard JSON success response
 */
export function successResponse<T>(data: T, status: number = 200): Response {
  return Response.json(
    { success: true, data },
    { status }
  );
}
