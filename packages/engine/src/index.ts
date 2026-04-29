// ==========================================
// RIDENDINE ENGINE - CENTRAL BUSINESS LOGIC
// ==========================================

// Core engine factory and utilities
export * from './core';

// Domain orchestrators
export * from './orchestrators/order.orchestrator';
export * from './orchestrators/kitchen.engine';
export * from './orchestrators/dispatch.engine';
export * from './orchestrators/commerce.engine';
export * from './orchestrators/support.engine';
export * from './orchestrators/platform.engine';
export * from './orchestrators/ops.engine';

// Analytics services
export * from './services/ops-analytics.service';

// Legacy services (for backwards compatibility)
export * from './services/orders.service';
export * from './services/chefs.service';
export * from './services/customers.service';
export * from './services/permissions.service';
export * from './services/storage.service';
export * from './services/dispatch.service';

// Constants
export * from './constants';

// Shared client helpers (explicit to avoid naming conflicts with core getEngine)
export {
  getAdminEngine,
  registerPaymentAdapter,
  resetEngineClient,
  errorResponse,
  successResponse,
} from './client-helpers';
