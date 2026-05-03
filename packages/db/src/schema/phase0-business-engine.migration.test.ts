import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Repo root: packages/db/src/schema → ../../../.. */
const repoRoot = join(__dirname, '..', '..', '..', '..');
const migrationPath = join(repoRoot, 'supabase', 'migrations', '00019_business_engine.sql');

describe('Phase 0 migration contract (00019_business_engine.sql)', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('defines orders public_stage trigger and engine mapping function', () => {
    expect(sql).toContain('orders_public_stage_from_engine');
    expect(sql).toContain('orders_sync_public_stage_trg');
    expect(sql).toContain('public_stage');
  });

  it('defines delivery routing / ETA columns', () => {
    expect(sql).toContain('route_to_pickup_polyline');
    expect(sql).toContain('route_to_dropoff_polyline');
    expect(sql).toContain('route_progress_pct');
    expect(sql).toContain('routing_computed_at');
  });

  it('defines platform_accounts and ledger balance trigger', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS platform_accounts');
    expect(sql).toContain('ledger_entries_touch_platform_accounts');
  });

  it('defines stripe_reconciliation referencing stripe_events_processed', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS stripe_reconciliation');
    expect(sql).toContain('REFERENCES stripe_events_processed');
  });

  it('defines service_areas with GIST spatial index', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS service_areas');
    expect(sql).toContain('USING GIST (polygon)');
  });

  it('defines ledger idempotency unique index', () => {
    expect(sql).toContain('idempotency_key');
    expect(sql).toContain('uq_ledger_entries_idempotency_key');
  });

  it('defines instant_payout_requests and drivers.instant_payouts_enabled', () => {
    expect(sql).toContain('instant_payouts_enabled');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS instant_payout_requests');
  });
});

describe('Phase 5 migration contract (00020_ledger_entries_order_optional.sql)', () => {
  const migrationPath = join(repoRoot, 'supabase', 'migrations', '00020_ledger_entries_order_optional.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  it('allows ledger_entries.order_id to be nullable for payout debits', () => {
    expect(sql).toMatch(/order_id/i);
    expect(sql).toContain('ledger_entries');
  });
});
