/**
 * Merges finance / Phase 5+ schema columns that may be missing from generated
 * `database.types.ts` when typegen runs against an older remote DB.
 * Prefer regenerating types after applying migrations; this keeps the client strictly typed.
 */
import type { Database as GeneratedDatabase } from './generated/database.types';

type GenPublic = GeneratedDatabase['public'];
type GenTables = GenPublic['Tables'];
type GenFunctions = GenPublic['Functions'];

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

// Migration 00043 — typegen ran against an older remote DB without this table.
type PromoCodeUsagesTable = {
  Row: {
    id: string;
    promo_id: string;
    customer_id: string;
    order_id: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    promo_id: string;
    customer_id: string;
    order_id?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    promo_id?: string;
    customer_id?: string;
    order_id?: string | null;
    created_at?: string;
  };
  Relationships: [];
};

// Migration 00045 — SECURITY DEFINER aggregation RPCs missing from typegen.
type LiabilitySummaryReturns = Array<{
  id: string;
  name: string | null;
  amount: number;
}>;

type MergedFunctions = GenFunctions & {
  get_chef_liability_summaries: {
    Args: { p_limit?: number };
    Returns: LiabilitySummaryReturns;
  };
  get_driver_liability_summaries: {
    Args: { p_limit?: number };
    Returns: LiabilitySummaryReturns;
  };
};

// customers.user_id was made nullable by migration 00030 purely so dev/staging
// seed rows can exist without auth users. Every application-created customer
// has a user_id, and engine + app code (customers.service, push subscription
// routes) rely on it being present. Narrow Row to non-null; Insert/Update keep
// the generated nullable shape so seed-style writes still typecheck.
type CustomersNarrowed = Omit<GenTables['customers'], 'Row'> & {
  Row: Omit<GenTables['customers']['Row'], 'user_id'> & { user_id: string };
};

// packages/engine permissions.service upserts platform_users rows with only
// (user_id, role, is_active, updated_at) — valid for the update path of the
// upsert on existing rows. email/name are NOT NULL in the schema but are made
// optional here so that pre-existing call pattern keeps compiling.
type PlatformUsersLoosened = Omit<GenTables['platform_users'], 'Insert' | 'Update'> & {
  Insert: Omit<GenTables['platform_users']['Insert'], 'email' | 'name'> & {
    email?: string;
    name?: string;
  };
  Update: GenTables['platform_users']['Update'];
};

// apps/web notifications routes reference legacy alias columns `read` and
// `action_url` that the canonical schema spells `is_read` / (no equivalent).
// Kept as optional members for compile compatibility with that pre-existing
// code path; regenerating after a column-alias migration should remove this.
type NotificationsWithAliases = {
  Row: GenTables['notifications']['Row'] & {
    read?: boolean | null;
    action_url?: string | null;
  };
  // body is NOT NULL in-schema but migration 00010 installed a trigger that
  // backfills it from `message`, so inserts may omit it.
  Insert: Omit<GenTables['notifications']['Insert'], 'body'> & {
    body?: string;
    read?: boolean | null;
    action_url?: string | null;
  };
  Update: GenTables['notifications']['Update'] & {
    read?: boolean | null;
    action_url?: string | null;
  };
  Relationships: GenTables['notifications']['Relationships'];
};

// ------------------------------------------------------------------
// Migration 00056 — inventory tables (typegen runs against an older remote DB).
// ------------------------------------------------------------------
type StorageLocationsTable = {
  Row: { id: string; storefront_id: string; name: string; type: string; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; name: string; type?: string; created_at?: string; updated_at?: string };
  Update: { id?: string; storefront_id?: string; name?: string; type?: string; created_at?: string; updated_at?: string };
  Relationships: [];
};

type InventoryItemsTable = {
  Row: {
    id: string;
    storefront_id: string;
    name: string;
    category: string | null;
    unit: string;
    current_quantity: number;
    par_quantity: number | null;
    reorder_point: number | null;
    cost_per_unit: number;
    preferred_supplier_id: string | null;
    storage_location_id: string | null;
    expiry_date: string | null;
    lot_code: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    name: string;
    category?: string | null;
    unit?: string;
    current_quantity?: number;
    par_quantity?: number | null;
    reorder_point?: number | null;
    cost_per_unit?: number;
    preferred_supplier_id?: string | null;
    storage_location_id?: string | null;
    expiry_date?: string | null;
    lot_code?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<InventoryItemsTable['Insert']>;
  Relationships: [];
};

type InventoryStockMovementsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    movement_type: string;
    quantity: number;
    unit_cost: number | null;
    reference_type: string | null;
    reference_id: string | null;
    note: string | null;
    created_by: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    movement_type: string;
    quantity: number;
    unit_cost?: number | null;
    reference_type?: string | null;
    reference_id?: string | null;
    note?: string | null;
    created_by?: string | null;
    created_at?: string;
  };
  Update: Partial<InventoryStockMovementsTable['Insert']>;
  Relationships: [];
};

type InventoryCountsTable = {
  Row: {
    id: string;
    storefront_id: string;
    status: string;
    counted_by: string | null;
    note: string | null;
    created_at: string;
    completed_at: string | null;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    status?: string;
    counted_by?: string | null;
    note?: string | null;
    created_at?: string;
    completed_at?: string | null;
  };
  Update: Partial<InventoryCountsTable['Insert']>;
  Relationships: [];
};

type InventoryCountLinesTable = {
  Row: {
    id: string;
    count_id: string;
    inventory_item_id: string;
    counted_quantity: number;
    system_quantity: number | null;
    variance: number | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    count_id: string;
    inventory_item_id: string;
    counted_quantity: number;
    system_quantity?: number | null;
    variance?: number | null;
    created_at?: string;
  };
  Update: Partial<InventoryCountLinesTable['Insert']>;
  Relationships: [];
};

type InventoryWasteEventsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    quantity: number;
    reason: string | null;
    cost_value: number | null;
    created_by: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    quantity: number;
    reason?: string | null;
    cost_value?: number | null;
    created_by?: string | null;
    created_at?: string;
  };
  Update: Partial<InventoryWasteEventsTable['Insert']>;
  Relationships: [];
};

type InventoryAlertsTable = {
  Row: {
    id: string;
    storefront_id: string;
    inventory_item_id: string;
    alert_type: string;
    status: string;
    detail: Record<string, unknown>;
    created_at: string;
    resolved_at: string | null;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    inventory_item_id: string;
    alert_type: string;
    status?: string;
    detail?: Record<string, unknown>;
    created_at?: string;
    resolved_at?: string | null;
  };
  Update: Partial<InventoryAlertsTable['Insert']>;
  Relationships: [];
};

// ------------------------------------------------------------------
// Migration 00057 — suppliers & receiving.
// ------------------------------------------------------------------
type SuppliersTable = {
  Row: {
    id: string;
    storefront_id: string;
    name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    notes: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    name: string;
    contact_name?: string | null;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<SuppliersTable['Insert']>;
  Relationships: [];
};

type SupplierItemsTable = {
  Row: {
    id: string;
    supplier_id: string;
    storefront_id: string;
    inventory_item_id: string | null;
    supplier_sku: string | null;
    name: string;
    pack_size: number;
    pack_unit: string | null;
    unit_cost: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    supplier_id: string;
    storefront_id: string;
    inventory_item_id?: string | null;
    supplier_sku?: string | null;
    name: string;
    pack_size?: number;
    pack_unit?: string | null;
    unit_cost?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<SupplierItemsTable['Insert']>;
  Relationships: [];
};

type PurchaseOrdersTable = {
  Row: {
    id: string;
    storefront_id: string;
    supplier_id: string | null;
    status: string;
    reference: string | null;
    notes: string | null;
    total_cost: number;
    expected_at: string | null;
    submitted_at: string | null;
    received_at: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    supplier_id?: string | null;
    status?: string;
    reference?: string | null;
    notes?: string | null;
    total_cost?: number;
    expected_at?: string | null;
    submitted_at?: string | null;
    received_at?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<PurchaseOrdersTable['Insert']>;
  Relationships: [];
};

type PurchaseOrderLinesTable = {
  Row: {
    id: string;
    purchase_order_id: string;
    supplier_item_id: string | null;
    inventory_item_id: string | null;
    description: string | null;
    quantity: number;
    pack_size: number;
    unit_cost: number;
    received_quantity: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    purchase_order_id: string;
    supplier_item_id?: string | null;
    inventory_item_id?: string | null;
    description?: string | null;
    quantity?: number;
    pack_size?: number;
    unit_cost?: number;
    received_quantity?: number;
    created_at?: string;
  };
  Update: Partial<PurchaseOrderLinesTable['Insert']>;
  Relationships: [];
};

type ReceivingBatchesTable = {
  Row: {
    id: string;
    storefront_id: string;
    purchase_order_id: string | null;
    received_by: string | null;
    note: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    purchase_order_id?: string | null;
    received_by?: string | null;
    note?: string | null;
    created_at?: string;
  };
  Update: Partial<ReceivingBatchesTable['Insert']>;
  Relationships: [];
};

type SupplierPriceHistoryTable = {
  Row: {
    id: string;
    supplier_item_id: string;
    storefront_id: string;
    unit_cost: number;
    pack_size: number | null;
    source: string;
    effective_at: string;
    created_at: string;
  };
  Insert: {
    id?: string;
    supplier_item_id: string;
    storefront_id: string;
    unit_cost: number;
    pack_size?: number | null;
    source?: string;
    effective_at?: string;
    created_at?: string;
  };
  Update: Partial<SupplierPriceHistoryTable['Insert']>;
  Relationships: [];
};

// ------------------------------------------------------------------
// Migration 00058 — production planning.
// ------------------------------------------------------------------
type PrepTasksTable = {
  Row: {
    id: string;
    storefront_id: string;
    menu_item_id: string | null;
    station_id: string | null;
    title: string;
    target_quantity: number | null;
    completed_quantity: number;
    status: string;
    plan_date: string;
    assigned_to: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    menu_item_id?: string | null;
    station_id?: string | null;
    title: string;
    target_quantity?: number | null;
    completed_quantity?: number;
    status?: string;
    plan_date: string;
    assigned_to?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<PrepTasksTable['Insert']>;
  Relationships: [];
};

type PrepTaskEventsTable = {
  Row: {
    id: string;
    prep_task_id: string;
    storefront_id: string;
    event_type: string;
    from_status: string | null;
    to_status: string | null;
    actor_user_id: string | null;
    detail: Record<string, unknown>;
    created_at: string;
  };
  Insert: {
    id?: string;
    prep_task_id: string;
    storefront_id: string;
    event_type: string;
    from_status?: string | null;
    to_status?: string | null;
    actor_user_id?: string | null;
    detail?: Record<string, unknown>;
    created_at?: string;
  };
  Update: Partial<PrepTaskEventsTable['Insert']>;
  Relationships: [];
};

type ProductionBatchesTable = {
  Row: {
    id: string;
    storefront_id: string;
    recipe_version_id: string | null;
    menu_item_id: string | null;
    name: string;
    planned_yield: number | null;
    actual_yield: number | null;
    waste_quantity: number;
    status: string;
    plan_date: string | null;
    started_at: string | null;
    completed_at: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    recipe_version_id?: string | null;
    menu_item_id?: string | null;
    name: string;
    planned_yield?: number | null;
    actual_yield?: number | null;
    waste_quantity?: number;
    status?: string;
    plan_date?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    notes?: string | null;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<ProductionBatchesTable['Insert']>;
  Relationships: [];
};

type ProductionBatchInputsTable = {
  Row: {
    id: string;
    batch_id: string;
    inventory_item_id: string | null;
    quantity: number;
    unit: string | null;
    consumed: boolean;
    created_at: string;
  };
  Insert: {
    id?: string;
    batch_id: string;
    inventory_item_id?: string | null;
    quantity?: number;
    unit?: string | null;
    consumed?: boolean;
    created_at?: string;
  };
  Update: Partial<ProductionBatchInputsTable['Insert']>;
  Relationships: [];
};

type ProductionBatchOutputsTable = {
  Row: {
    id: string;
    batch_id: string;
    inventory_item_id: string | null;
    menu_item_id: string | null;
    quantity: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    batch_id: string;
    inventory_item_id?: string | null;
    menu_item_id?: string | null;
    quantity?: number;
    created_at?: string;
  };
  Update: Partial<ProductionBatchOutputsTable['Insert']>;
  Relationships: [];
};

// ------------------------------------------------------------------
// Migration 00059 — labour.
// ------------------------------------------------------------------
type KitchenStaffTable = {
  Row: {
    id: string;
    storefront_id: string;
    user_id: string | null;
    name: string;
    role: string | null;
    station_id: string | null;
    hourly_rate: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    user_id?: string | null;
    name: string;
    role?: string | null;
    station_id?: string | null;
    hourly_rate?: number;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<KitchenStaffTable['Insert']>;
  Relationships: [];
};

type KitchenShiftsTable = {
  Row: {
    id: string;
    storefront_id: string;
    staff_id: string;
    scheduled_start: string;
    scheduled_end: string;
    role: string | null;
    station_id: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    staff_id: string;
    scheduled_start: string;
    scheduled_end: string;
    role?: string | null;
    station_id?: string | null;
    notes?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<KitchenShiftsTable['Insert']>;
  Relationships: [];
};

type TimeEntriesTable = {
  Row: {
    id: string;
    storefront_id: string;
    staff_id: string;
    shift_id: string | null;
    clock_in: string;
    clock_out: string | null;
    hourly_rate: number;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    staff_id: string;
    shift_id?: string | null;
    clock_in?: string;
    clock_out?: string | null;
    hourly_rate?: number;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<TimeEntriesTable['Insert']>;
  Relationships: [];
};

type LaborAllocationsTable = {
  Row: {
    id: string;
    storefront_id: string;
    time_entry_id: string | null;
    target_type: string | null;
    target_id: string | null;
    amount: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    time_entry_id?: string | null;
    target_type?: string | null;
    target_id?: string | null;
    amount?: number;
    created_at?: string;
  };
  Update: Partial<LaborAllocationsTable['Insert']>;
  Relationships: [];
};

type LaborCostSnapshotsTable = {
  Row: {
    id: string;
    storefront_id: string;
    snapshot_date: string;
    labor_cost: number;
    labor_hours: number;
    staff_count: number;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    snapshot_date: string;
    labor_cost?: number;
    labor_hours?: number;
    staff_count?: number;
    created_at?: string;
  };
  Update: Partial<LaborCostSnapshotsTable['Insert']>;
  Relationships: [];
};

type KitchenStationAssignmentsTable = {
  Row: {
    id: string;
    storefront_id: string;
    staff_id: string;
    station_id: string;
    shift_id: string | null;
    assigned_at: string;
    released_at: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    staff_id: string;
    station_id: string;
    shift_id?: string | null;
    assigned_at?: string;
    released_at?: string | null;
    created_at?: string;
  };
  Update: Partial<KitchenStationAssignmentsTable['Insert']>;
  Relationships: [];
};

// ------------------------------------------------------------------
// Migration 00060 — close-of-day + service controls.
// ------------------------------------------------------------------
type KitchenDailySummariesTable = {
  Row: {
    id: string;
    storefront_id: string;
    summary_date: string;
    orders_completed: number;
    gross_sales: number;
    net_sales: number;
    food_cost: number | null;
    packaging_cost: number | null;
    labor_cost: number | null;
    waste_value: number | null;
    refund_loss: number | null;
    prime_cost: number | null;
    avg_prep_minutes: number | null;
    late_tickets: number;
    top_sellers: unknown;
    sold_out_items: unknown;
    notes: string | null;
    metadata: Record<string, unknown>;
    closed_by: string | null;
    closed_at: string;
    reopened_at: string | null;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    storefront_id: string;
    summary_date: string;
    orders_completed?: number;
    gross_sales?: number;
    net_sales?: number;
    food_cost?: number | null;
    packaging_cost?: number | null;
    labor_cost?: number | null;
    waste_value?: number | null;
    refund_loss?: number | null;
    prime_cost?: number | null;
    avg_prep_minutes?: number | null;
    late_tickets?: number;
    top_sellers?: unknown;
    sold_out_items?: unknown;
    notes?: string | null;
    metadata?: Record<string, unknown>;
    closed_by?: string | null;
    closed_at?: string;
    reopened_at?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: Partial<KitchenDailySummariesTable['Insert']>;
  Relationships: [];
};

type ChefStorefrontsExtended = Omit<GenTables['chef_storefronts'], 'Row' | 'Insert' | 'Update'> & {
  Row: GenTables['chef_storefronts']['Row'] & {
    service_state?: string;
    service_state_reason?: string | null;
    prep_time_buffer_minutes?: number;
  };
  Insert: GenTables['chef_storefronts']['Insert'] & {
    service_state?: string;
    service_state_reason?: string | null;
    prep_time_buffer_minutes?: number;
  };
  Update: GenTables['chef_storefronts']['Update'] & {
    service_state?: string;
    service_state_reason?: string | null;
    prep_time_buffer_minutes?: number;
  };
};

// ------------------------------------------------------------------
// Migration 00055 — recipes & costing.
// ------------------------------------------------------------------
type RecipesTable = {
  Row: { id: string; storefront_id: string; menu_item_id: string | null; name: string; is_active: boolean; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; menu_item_id?: string | null; name: string; is_active?: boolean; created_at?: string; updated_at?: string };
  Update: Partial<RecipesTable['Insert']>;
  Relationships: [];
};
type RecipeVersionsTable = {
  Row: { id: string; recipe_id: string; version: number; batch_yield: number; portion_size: string | null; waste_factor: number; notes: string | null; is_active: boolean; created_at: string; updated_at: string };
  Insert: { id?: string; recipe_id: string; version?: number; batch_yield?: number; portion_size?: string | null; waste_factor?: number; notes?: string | null; is_active?: boolean; created_at?: string; updated_at?: string };
  Update: Partial<RecipeVersionsTable['Insert']>;
  Relationships: [];
};
type RecipeIngredientsTable = {
  Row: { id: string; recipe_version_id: string; inventory_item_id: string | null; name: string; quantity: number; unit: string; cost_per_unit: number; waste_factor: number; sort_order: number; created_at: string };
  Insert: { id?: string; recipe_version_id: string; inventory_item_id?: string | null; name: string; quantity?: number; unit?: string; cost_per_unit?: number; waste_factor?: number; sort_order?: number; created_at?: string };
  Update: Partial<RecipeIngredientsTable['Insert']>;
  Relationships: [];
};
type RecipeStepsTable = {
  Row: { id: string; recipe_version_id: string; step_number: number; instruction: string; station: string | null; duration_minutes: number | null; phase: string; created_at: string };
  Insert: { id?: string; recipe_version_id: string; step_number: number; instruction: string; station?: string | null; duration_minutes?: number | null; phase?: string; created_at?: string };
  Update: Partial<RecipeStepsTable['Insert']>;
  Relationships: [];
};
type MenuItemRecipeVersionsTable = {
  Row: { id: string; menu_item_id: string; recipe_version_id: string; is_active: boolean; created_at: string };
  Insert: { id?: string; menu_item_id: string; recipe_version_id: string; is_active?: boolean; created_at?: string };
  Update: Partial<MenuItemRecipeVersionsTable['Insert']>;
  Relationships: [];
};
type RecipeCostSnapshotsTable = {
  Row: { id: string; recipe_version_id: string; menu_item_id: string | null; ingredient_cost: number; packaging_cost: number; total_cost: number; food_cost_pct: number | null; sell_price: number | null; snapshot_reason: string | null; created_at: string };
  Insert: { id?: string; recipe_version_id: string; menu_item_id?: string | null; ingredient_cost: number; packaging_cost?: number; total_cost: number; food_cost_pct?: number | null; sell_price?: number | null; snapshot_reason?: string | null; created_at?: string };
  Update: Partial<RecipeCostSnapshotsTable['Insert']>;
  Relationships: [];
};
type PackagingItemsTable = {
  Row: { id: string; storefront_id: string; name: string; unit: string | null; cost_per_unit: number; is_active: boolean; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; name: string; unit?: string | null; cost_per_unit?: number; is_active?: boolean; created_at?: string; updated_at?: string };
  Update: Partial<PackagingItemsTable['Insert']>;
  Relationships: [];
};
type MenuItemPackagingTable = {
  Row: { id: string; menu_item_id: string; packaging_item_id: string; quantity: number; created_at: string };
  Insert: { id?: string; menu_item_id: string; packaging_item_id: string; quantity?: number; created_at?: string };
  Update: Partial<MenuItemPackagingTable['Insert']>;
  Relationships: [];
};

// ------------------------------------------------------------------
// Migration 00054 — kitchen ticket internal state.
// ------------------------------------------------------------------
type KitchenStationsTable = {
  Row: { id: string; storefront_id: string; name: string; sort_order: number; is_active: boolean; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; name: string; sort_order?: number; is_active?: boolean; created_at?: string; updated_at?: string };
  Update: Partial<KitchenStationsTable['Insert']>;
  Relationships: [];
};
type KitchenTicketsTable = {
  Row: { id: string; storefront_id: string; order_id: string; queue_entry_id: string | null; kitchen_status: string; priority: number; station_id: string | null; started_at: string | null; packing_started_at: string | null; packed_at: string | null; ready_at: string | null; problem_reason: string | null; notes: string | null; metadata: Record<string, unknown>; created_at: string; updated_at: string };
  Insert: { id?: string; storefront_id: string; order_id: string; queue_entry_id?: string | null; kitchen_status?: string; priority?: number; station_id?: string | null; started_at?: string | null; packing_started_at?: string | null; packed_at?: string | null; ready_at?: string | null; problem_reason?: string | null; notes?: string | null; metadata?: Record<string, unknown>; created_at?: string; updated_at?: string };
  Update: Partial<KitchenTicketsTable['Insert']>;
  Relationships: [];
};
type KitchenTicketItemsTable = {
  Row: { id: string; ticket_id: string; order_item_id: string | null; menu_item_id: string | null; station_id: string | null; status: string; quantity: number; modifiers_snapshot: unknown; allergen_flags: string[]; special_instructions: string | null; started_at: string | null; completed_at: string | null; created_at: string; updated_at: string };
  Insert: { id?: string; ticket_id: string; order_item_id?: string | null; menu_item_id?: string | null; station_id?: string | null; status?: string; quantity?: number; modifiers_snapshot?: unknown; allergen_flags?: string[]; special_instructions?: string | null; started_at?: string | null; completed_at?: string | null; created_at?: string; updated_at?: string };
  Update: Partial<KitchenTicketItemsTable['Insert']>;
  Relationships: [];
};
type KitchenTicketEventsTable = {
  Row: { id: string; ticket_id: string; storefront_id: string; event_type: string; from_status: string | null; to_status: string | null; actor_user_id: string | null; detail: Record<string, unknown>; created_at: string };
  Insert: { id?: string; ticket_id: string; storefront_id: string; event_type: string; from_status?: string | null; to_status?: string | null; actor_user_id?: string | null; detail?: Record<string, unknown>; created_at?: string };
  Update: Partial<KitchenTicketEventsTable['Insert']>;
  Relationships: [];
};
type OrderPackChecksTable = {
  Row: { id: string; order_id: string; ticket_id: string | null; storefront_id: string; checked_items: unknown; bag_count: number; utensils_included: boolean; sauces_included: boolean; allergy_label_applied: boolean; sealed: boolean; photo_url: string | null; completed_by: string | null; completed_at: string | null; created_at: string; updated_at: string };
  Insert: { id?: string; order_id: string; ticket_id?: string | null; storefront_id: string; checked_items?: unknown; bag_count?: number; utensils_included?: boolean; sauces_included?: boolean; allergy_label_applied?: boolean; sealed?: boolean; photo_url?: string | null; completed_by?: string | null; completed_at?: string | null; created_at?: string; updated_at?: string };
  Update: Partial<OrderPackChecksTable['Insert']>;
  Relationships: [];
};

type MergedTables = Omit<
  GenTables,
  | 'chef_storefronts'
  | 'drivers'
  | 'chef_payouts'
  | 'driver_payouts'
  | 'stripe_events_processed'
  | 'customers'
  | 'platform_users'
  | 'notifications'
> & {
  customers: CustomersNarrowed;
  platform_users: PlatformUsersLoosened;
  notifications: NotificationsWithAliases;
  drivers: DriversExtended;
  chef_payouts: ChefPayoutsExtended;
  driver_payouts: DriverPayoutsExtended;
  stripe_events_processed: StripeEventsExtended;
  stripe_reconciliation: StripeReconciliationTable;
  platform_accounts: PlatformAccountsTable;
  instant_payout_requests: InstantPayoutRequestsTable;
  service_areas: ServiceAreasTable;
  promo_code_usages: PromoCodeUsagesTable;
  // Kitchen OS tables (recipes, inventory, suppliers, production, labour,
  // tickets, packaging, pay_periods) now come straight from the regenerated
  // types — they include the ghost-kitchen kitchen_id re-scope. The old
  // hand-written overrides here predated that and are intentionally dropped.
  chef_storefronts: ChefStorefrontsExtended;
};

export type Database = Omit<GeneratedDatabase, 'public'> & {
  public: Omit<GenPublic, 'Tables' | 'Functions'> & {
    Tables: MergedTables;
    Functions: MergedFunctions;
  };
};
