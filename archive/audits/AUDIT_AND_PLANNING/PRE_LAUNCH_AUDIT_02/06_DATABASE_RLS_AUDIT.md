# Phase 5 — Database, RLS, migrations

## Schema source of truth

| Layer | Path | Status |
|-------|------|--------|
| DDL + RLS | `supabase/migrations/*.sql` | Present incl. `00015_phase2_platform_roles.sql`, `00016_phase3_stripe_idempotency_order_events_promo.sql` |
| Human doc | `docs/DATABASE_SCHEMA.md` | Updated in working tree — reconcile on merge |
| Generated types | `packages/db/src/generated/database.types.ts` | Large regeneration in tree — tracker notes `db:generate` env blockers historically |

## Domain table coverage (DoorDash-like checklist)

Core entities present in migrations/docs: users/profiles, customers, chefs/storefronts, menus/menu items, carts, orders, order items, payments path (Stripe + ledger docs), deliveries, drivers, driver_locations, notifications, platform_settings, audit-related tables, support_tickets, promo_codes, stripe_events_processed (Phase 3/9).

**Soft-delete / cancel / refund:** Implemented in engine + ops routes — **PARTIAL** consistency proof (requires order-state doc ↔ migration FK review) — not fully traced in this pass.

## RLS — sensitive / support (IRR-033)

**Finding:** `support_tickets` policy from early migration:

```552:557:supabase/migrations/00003_fix_rls.sql
-- Ops admins can manage support tickets
CREATE POLICY "Ops can manage support tickets"
ON support_tickets FOR ALL
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));
```

- **Effect:** Any user satisfying `is_ops_admin(auth.uid())` has **broad** SQL access via PostgREST if using user JWT — mitigated in practice because **customer web** uses **service role** on selected routes with **app-layer** scoping (`support.repository.ts`, ops queue guards).
- **Risk class:** **Suspected** — if any code path exposes user-scoped Supabase client to `support_tickets` without matching RLS, broader read/write is possible. **Defense in depth** not at DB level for per-ticket agent assignment (tracker acknowledges “deeper RLS migration pass” open).

## Other RLS notes

- `stripe_events_processed` / webhook: migration comment notes service_role bypass for webhook — **intentional** with app-layer idempotency.
- `driver_locations`, `notifications`, `promo_codes` policies exist in `00004_additions.sql` / `00011_rls_role_alignment.sql`.

## Migrations reproducibility

Ordered numeric prefixes — **VERIFIED** pattern. No Prisma/Drizzle secondary schema found.

## Recommendations

1. Product decision: tighten `support_tickets` RLS to **assigned agent** + role claims matching `platform_users` model.  
2. Run `supabase db reset` in CI or staging after merge to validate chain.  
3. Regenerate `database.types.ts` when Docker/Supabase CLI available — avoid manual edits.
