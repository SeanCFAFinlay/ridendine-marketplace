-- ============================================================================
-- 00064_data_retention.sql
--
-- NOTE ON COLUMN NAMES: these tables do not share a timestamp column.
--   driver_locations, delivery_tracking_events -> recorded_at
--   ops_processor_runs                          -> started_at
--   analytics_events, domain_events             -> created_at
-- Verified against the DDL in 00001/00007/00013/00023 before writing this.
--
-- There was no retention policy, TTL, partitioning or archival anywhere in the
-- previous 63 migrations. Every row ever written is kept forever. The
-- high-volume offenders:
--
--   driver_locations          ~4 rows/min per ONLINE driver, indefinitely
--   delivery_tracking_events  one row per driver ping on an active delivery
--   analytics_events          one row per tracked product event
--   domain_events             one row per emitted engine event
--   ops_processor_runs        one row per processor invocation — now ~63k/month
--                             after the cron cadences were corrected
--
-- This adds a single SECURITY DEFINER function that prunes them to explicit
-- windows, plus the indexes that make the prune (and the queries that read
-- these tables) cheap.
--
-- DELIBERATELY NOT PRUNED:
--   audit_logs, ops_override_logs, ledger_entries, order_status_history,
--   stripe_events_processed  — financial and audit trails. Deleting these is a
--   compliance decision, not a housekeeping one. If a retention obligation is
--   ever established, do it in its own migration with that decision recorded.
--
-- Retention windows are conservative. Shorten them once you know the real
-- reporting needs; lengthening later is free, un-deleting is not.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Indexes supporting the prune. Without these each run is a full scan.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded_at
  ON driver_locations (recorded_at);

CREATE INDEX IF NOT EXISTS idx_delivery_tracking_events_recorded_at
  ON delivery_tracking_events (recorded_at);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON analytics_events (created_at);

CREATE INDEX IF NOT EXISTS idx_domain_events_created_at
  ON domain_events (created_at);

CREATE INDEX IF NOT EXISTS idx_ops_processor_runs_started_at
  ON ops_processor_runs (started_at);

-- ---------------------------------------------------------------------------
-- prune_expired_data(dry_run)
--
-- Returns one row per table with the number of rows deleted (or, when
-- dry_run = true, the number that WOULD be deleted). Always run it dry first
-- against production.
--
-- Batched with a per-table LIMIT so a first run against years of accumulated
-- rows cannot hold a long transaction or blow up WAL. Re-run until the counts
-- come back zero.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prune_expired_data(dry_run BOOLEAN DEFAULT FALSE)
RETURNS TABLE (table_name TEXT, rows_affected BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Max rows removed per table per invocation.
  batch_limit CONSTANT INTEGER := 50000;
  n BIGINT;
BEGIN
  -- Raw GPS breadcrumbs. 30 days is well beyond any dispute window; the
  -- delivery itself retains its own timestamps and proof.
  IF dry_run THEN
    SELECT count(*) INTO n FROM driver_locations
      WHERE recorded_at < now() - INTERVAL '30 days';
  ELSE
    WITH doomed AS (
      SELECT id FROM driver_locations
      WHERE recorded_at < now() - INTERVAL '30 days'
      LIMIT batch_limit
    )
    DELETE FROM driver_locations d USING doomed WHERE d.id = doomed.id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  table_name := 'driver_locations'; rows_affected := n; RETURN NEXT;

  -- Per-ping delivery tracking. 90 days covers customer disputes.
  IF dry_run THEN
    SELECT count(*) INTO n FROM delivery_tracking_events
      WHERE recorded_at < now() - INTERVAL '90 days';
  ELSE
    WITH doomed AS (
      SELECT id FROM delivery_tracking_events
      WHERE recorded_at < now() - INTERVAL '90 days'
      LIMIT batch_limit
    )
    DELETE FROM delivery_tracking_events d USING doomed WHERE d.id = doomed.id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  table_name := 'delivery_tracking_events'; rows_affected := n; RETURN NEXT;

  -- Product analytics. 365 days preserves year-over-year comparisons.
  IF dry_run THEN
    SELECT count(*) INTO n FROM analytics_events
      WHERE created_at < now() - INTERVAL '365 days';
  ELSE
    WITH doomed AS (
      SELECT id FROM analytics_events
      WHERE created_at < now() - INTERVAL '365 days'
      LIMIT batch_limit
    )
    DELETE FROM analytics_events a USING doomed WHERE a.id = doomed.id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  table_name := 'analytics_events'; rows_affected := n; RETURN NEXT;

  -- Engine domain events. These are a transport/debug record, not the audit
  -- trail — audit_logs is, and it is not pruned.
  IF dry_run THEN
    SELECT count(*) INTO n FROM domain_events
      WHERE created_at < now() - INTERVAL '180 days';
  ELSE
    WITH doomed AS (
      SELECT id FROM domain_events
      WHERE created_at < now() - INTERVAL '180 days'
      LIMIT batch_limit
    )
    DELETE FROM domain_events e USING doomed WHERE e.id = doomed.id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  table_name := 'domain_events'; rows_affected := n; RETURN NEXT;

  -- Processor bookkeeping. 90 days is far more than the health endpoint reads
  -- (it looks at the most recent run only) and leaves plenty for incident
  -- forensics.
  IF dry_run THEN
    SELECT count(*) INTO n FROM ops_processor_runs
      WHERE started_at < now() - INTERVAL '90 days';
  ELSE
    WITH doomed AS (
      SELECT id FROM ops_processor_runs
      WHERE started_at < now() - INTERVAL '90 days'
      LIMIT batch_limit
    )
    DELETE FROM ops_processor_runs r USING doomed WHERE r.id = doomed.id;
    GET DIAGNOSTICS n = ROW_COUNT;
  END IF;
  table_name := 'ops_processor_runs'; rows_affected := n; RETURN NEXT;

  RETURN;
END;
$$;

COMMENT ON FUNCTION prune_expired_data(BOOLEAN) IS
  'Deletes rows past their retention window from high-volume operational '
  'tables. Financial and audit tables are deliberately excluded. Batched at '
  '50k rows per table per call — re-run until all counts are zero. '
  'Called by /api/engine/processors/retention.';

-- Engine/cron only. No app role may prune data.
REVOKE ALL ON FUNCTION prune_expired_data(BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION prune_expired_data(BOOLEAN) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_expired_data(BOOLEAN) TO service_role;
