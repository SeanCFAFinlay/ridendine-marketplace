/**
 * Merges finance / Phase 5+ schema columns that may be missing from generated
 * `database.types.ts` when typegen runs against an older remote DB.
 * Prefer regenerating types after applying migrations; this keeps the client strictly typed.
 */
import type { Database as GeneratedDatabase } from './generated/database.types';

type GenPublic = GeneratedDatabase['public'];
type GenTables = GenPublic['Tables'];

type PlatformAccountsTable = {
  Row: {
    id: string;
    account_type: string;
    owner_id: string;
    balance_cents: number;
    pending_payout_cents: number;
    lifetime_earned_cents: number;
    currency: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    account_type: string;
    owner_id: string;
    balance_cents?: number;
    pending_payout_cents?: number;
    lifetime_earned_cents?: number;
    currency?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    account_type?: string;
    owner_id?: string;
    balance_cents?: number;
    pending_payout_cents?: number;
    lifetime_earned_cents?: number;
    currency?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type StripeReconciliationTable = {
  Row: {
    id: string;
    stripe_event_id: string;
    ledger_entry_ids: string[];
    status: string;
    variance_cents: number;
    variance_flagged: boolean;
    notes: string | null;
    resolved_by: string | null;
    resolved_at: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    stripe_event_id: string;
    ledger_entry_ids?: string[];
    status?: string;
    variance_cents?: number;
    variance_flagged?: boolean;
    notes?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    stripe_event_id?: string;
    ledger_entry_ids?: string[];
    status?: string;
    variance_cents?: number;
    variance_flagged?: boolean;
    notes?: string | null;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at?: string;
  };
  Relationships: [];
};

type InstantPayoutRequestsTable = {
  Row: {
    id: string;
    driver_id: string;
    amount_cents: number;
    fee_cents: number;
    status: string;
    stripe_payout_id: string | null;
    failure_reason: string | null;
    requested_at: string;
    executed_at: string | null;
  };
  Insert: {
    id?: string;
    driver_id: string;
    amount_cents: number;
    fee_cents: number;
    status?: string;
    stripe_payout_id?: string | null;
    failure_reason?: string | null;
    requested_at?: string;
    executed_at?: string | null;
  };
  Update: {
    id?: string;
    driver_id?: string;
    amount_cents?: number;
    fee_cents?: number;
    status?: string;
    stripe_payout_id?: string | null;
    failure_reason?: string | null;
    requested_at?: string;
    executed_at?: string | null;
  };
  Relationships: [];
};

type ServiceAreasTable = {
  Row: {
    id: string;
    name: string;
    polygon: unknown;
    is_active: boolean;
    surge_multiplier: number;
    dispatch_radius_km: number | null;
    offer_ttl_seconds: number | null;
    max_offer_attempts: number | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    name: string;
    polygon: unknown;
    is_active?: boolean;
    surge_multiplier?: number;
    dispatch_radius_km?: number | null;
    offer_ttl_seconds?: number | null;
    max_offer_attempts?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    name?: string;
    polygon?: unknown;
    is_active?: boolean;
    surge_multiplier?: number;
    dispatch_radius_km?: number | null;
    offer_ttl_seconds?: number | null;
    max_offer_attempts?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};

type DriversExtended = Omit<GenTables['drivers'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['drivers']['Row'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
  Insert: GenTables['drivers']['Insert'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
  Update: GenTables['drivers']['Update'] & {
    instant_payouts_enabled?: boolean;
    stripe_connect_account_id?: string | null;
    payout_blocked?: boolean;
  };
};

type ChefPayoutsExtended = Omit<GenTables['chef_payouts'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['chef_payouts']['Row'] & { payout_run_id?: string | null };
  Insert: GenTables['chef_payouts']['Insert'] & { payout_run_id?: string | null };
  Update: GenTables['chef_payouts']['Update'] & { payout_run_id?: string | null };
};

type DriverPayoutsExtended = Omit<GenTables['driver_payouts'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['driver_payouts']['Row'] & { stripe_payout_id?: string | null };
  Insert: GenTables['driver_payouts']['Insert'] & { stripe_payout_id?: string | null };
  Update: GenTables['driver_payouts']['Update'] & { stripe_payout_id?: string | null };
};

type StripeEventsExtended = Omit<GenTables['stripe_events_processed'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['stripe_events_processed']['Row'] & { stripe_amount_cents?: number | null };
  Insert: GenTables['stripe_events_processed']['Insert'] & { stripe_amount_cents?: number | null };
  Update: GenTables['stripe_events_processed']['Update'] & { stripe_amount_cents?: number | null };
};

type MergedTables = Omit<
  GenTables,
  'drivers' | 'chef_payouts' | 'driver_payouts' | 'stripe_events_processed'
> & {
  drivers: DriversExtended;
  chef_payouts: ChefPayoutsExtended;
  driver_payouts: DriverPayoutsExtended;
  stripe_events_processed: StripeEventsExtended;
  stripe_reconciliation: StripeReconciliationTable;
  platform_accounts: PlatformAccountsTable;
  instant_payout_requests: InstantPayoutRequestsTable;
  service_areas: ServiceAreasTable;
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GenPublic, 'Tables'> & {
    Tables: MergedTables;
  };
};
