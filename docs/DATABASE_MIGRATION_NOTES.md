# Database migration notes — Ridendine

Operational context for **append-only** SQL under `supabase/migrations/`. Pair with `docs/DATABASE_SCHEMA.md` and regenerated `packages/db/src/generated/database.types.ts`.

### Type generation (`pnpm --filter @ridendine/db run db:generate`)

- Implemented by `packages/db/scripts/generate-types.mjs` (safe: does not empty `database.types.ts` on CLI failure).
- **Local:** requires Docker + `supabase start` in the repo root.
- **Remote:** set **`DATABASE_URL`** in `.env` or `.env.local` to the **Database** connection string from the Supabase dashboard. Your machine must be able to **resolve and reach** `db.<project-ref>.supabase.co` (VPN/firewall/DNS can block CLI introspection).
- **`SUPABASE_SERVICE_ROLE_KEY`** alone does not drive `gen types`; use **`DATABASE_URL`** or local Docker.

### Local `supabase start` repair (fresh DB)

Two historical migration issues blocked a clean apply; fixed so **`supabase start`** can run from empty Postgres:

| Migration | Change |
|-----------|--------|
| `00004_additions.sql` | `DROP POLICY IF EXISTS` before creating notification policies that duplicated `00002`. |
| `00010_contract_drift_repair.sql` | `ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS …` for `setting_key` / `setting_value` (and related) **before** insert, because `00004` already created `platform_settings` without those columns. |

**Hosted vs local URL:** your cloud **`NEXT_PUBLIC_SUPABASE_URL`** is for apps hitting **hosted** Supabase. After **`supabase start`**, local API is **`http://127.0.0.1:54321`** with keys from `supabase status` — use that pair when you want the apps to talk to **local** Docker, not production.

---

## Phase 3 — `00016_phase3_stripe_idempotency_order_events_promo.sql`

| Field | Detail |
|-------|--------|
| **When** | Phase 3 production upgrade (IRR-008, IRR-009, IRR-029) |
| **Depends on** | `00001`–`00015` applied in order (`00015` = Phase 2 platform roles). |
| **Why** | Durable idempotency store for Stripe webhooks; safe naming alias for order status audit; explicit DB comments for promo canonical vs alias columns. |

### Tables added

| Object | Purpose |
|--------|---------|
| `stripe_events_processed` | One row per Stripe `event.id` (unique). Tracks `event_type`, `livemode`, `processed_at`, optional `related_order_id`, optional `related_payment_id` (no FK — no `payments` table), optional `payload_hash` (e.g. SHA-256 of raw body for forensic dedup without storing payload), `error_message`, `processing_status`. |

### Views added

| Object | Purpose |
|--------|---------|
| `order_status_events` | `SELECT * FROM order_status_history` — **read alias only**; physical table remains **`order_status_history`**. |

### Columns / triggers

- **No new promo columns** — `00010_contract_drift_repair.sql` already added alias columns and `sync_promo_code_fields` trigger. Phase 3 adds **COMMENT ON COLUMN** only.

### Backfill

- None. Table starts empty.

### RLS / security

- `stripe_events_processed`: **RLS enabled**, **no** policies for `anon` / `authenticated`. Supabase **service role** (admin client used by server webhooks) **bypasses RLS** and may insert/select for idempotency logic (to be wired in Phase **4** / **9** — not in Phase 3 per scope).
- Do **not** store full Stripe payloads or card data in this table.

### Compatibility

- **Old migrations:** unchanged.
- **Existing code:** continues to use `order_status_history`; view is optional for reporting or future ORM naming.
- **Checkout / webhook:** runtime idempotency checks against `stripe_events_processed` are **follow-up** (Phase 4 API / Phase 9 payments); schema is ready.

### Rollback

- Drop in dependency order (dev only): `DROP VIEW IF EXISTS order_status_events;` then `DROP TABLE IF EXISTS stripe_events_processed;`
- Production: prefer forward fix; snapshot before migrate.

### Production safety

- Additive only; no `DROP COLUMN` / destructive DDL.
- Apply via normal Supabase migration pipeline (not `db reset` on production).

### Follow-up (later phases)

| Phase | Task |
|-------|------|
| **4 / 9** | Webhook handler: `INSERT ... ON CONFLICT (stripe_event_id) DO NOTHING`, then skip side effects if duplicate; set `processing_status` / `error_message` as appropriate. |
| **9** | Stripe CLI replay tests proving no double submit to kitchen / ledger. |
| **15** | Log redaction review (IRR-027) if any debug logging touches Stripe metadata. |

---

## Phase 2 — `00015_phase2_platform_roles.sql` (reference)

Expands `platform_users.role` CHECK for `support_agent`, `finance_manager`. No Phase 3 migration changes to that file.

---

*Maintained under Ridendine production upgrade.*
