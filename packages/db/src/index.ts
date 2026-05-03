// ==========================================
// RIDENDINE DATABASE PACKAGE
// ==========================================

// Re-export clients
export * from './client';

// Re-export repositories
export * from './repositories';

// Re-export generated types (will exist after running db:generate)
export type { Database } from './database.merged';
export type { Tables, Enums } from './generated/database.types';

// Re-export real-time hooks + Phase 11 contract helpers
export * from './hooks/use-realtime';
export * from './realtime';
