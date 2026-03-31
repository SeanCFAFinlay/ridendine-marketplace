-- ==========================================
-- ENGINE RPC FUNCTIONS
-- Migration: 00008_engine_rpc_functions
-- ==========================================

-- Increment queue size for storefront
CREATE OR REPLACE FUNCTION increment_queue_size(storefront_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chef_storefronts
  SET
    current_queue_size = COALESCE(current_queue_size, 0) + 1,
    updated_at = NOW()
  WHERE id = storefront_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement queue size for storefront
CREATE OR REPLACE FUNCTION decrement_queue_size(storefront_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE chef_storefronts
  SET
    current_queue_size = GREATEST(COALESCE(current_queue_size, 0) - 1, 0),
    updated_at = NOW()
  WHERE id = storefront_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment order exception count
CREATE OR REPLACE FUNCTION increment_order_exception_count(order_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET
    exception_count = COALESCE(exception_count, 0) + 1,
    updated_at = NOW()
  WHERE id = order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get orders needing dispatch (ready but no delivery)
CREATE OR REPLACE FUNCTION get_orders_needing_dispatch()
RETURNS TABLE (
  order_id UUID,
  order_number VARCHAR,
  storefront_id UUID,
  total DECIMAL,
  ready_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id as order_id,
    o.order_number,
    o.storefront_id,
    o.total,
    o.ready_at
  FROM orders o
  LEFT JOIN deliveries d ON d.order_id = o.id
  WHERE o.engine_status = 'ready'
    AND d.id IS NULL
  ORDER BY o.ready_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get available drivers within radius
CREATE OR REPLACE FUNCTION get_available_drivers_near(
  pickup_lat DOUBLE PRECISION,
  pickup_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  driver_id UUID,
  user_id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  distance_km DOUBLE PRECISION,
  rating DECIMAL,
  total_deliveries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as driver_id,
    d.user_id,
    d.first_name,
    d.last_name,
    (
      6371 * acos(
        cos(radians(pickup_lat)) * cos(radians(dp.current_lat)) *
        cos(radians(dp.current_lng) - radians(pickup_lng)) +
        sin(radians(pickup_lat)) * sin(radians(dp.current_lat))
      )
    ) as distance_km,
    d.rating,
    d.total_deliveries
  FROM drivers d
  JOIN driver_presence dp ON dp.driver_id = d.id
  WHERE d.status = 'approved'
    AND dp.status = 'online'
    AND dp.current_lat IS NOT NULL
    AND dp.current_lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(pickup_lat)) * cos(radians(dp.current_lat)) *
        cos(radians(dp.current_lng) - radians(pickup_lng)) +
        sin(radians(pickup_lat)) * sin(radians(dp.current_lat))
      )
    ) <= radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get dashboard stats for ops admin
CREATE OR REPLACE FUNCTION get_ops_dashboard_stats()
RETURNS TABLE (
  stat_name VARCHAR,
  stat_value BIGINT
) AS $$
BEGIN
  RETURN QUERY

  -- Active orders
  SELECT 'active_orders'::VARCHAR, COUNT(*)::BIGINT
  FROM orders
  WHERE engine_status NOT IN ('completed', 'cancelled', 'refunded', 'failed')

  UNION ALL

  -- Pending orders (awaiting chef)
  SELECT 'pending_orders'::VARCHAR, COUNT(*)::BIGINT
  FROM orders
  WHERE engine_status = 'pending'

  UNION ALL

  -- Ready orders (awaiting dispatch)
  SELECT 'ready_orders'::VARCHAR, COUNT(*)::BIGINT
  FROM orders
  WHERE engine_status IN ('ready', 'dispatch_pending')

  UNION ALL

  -- Active deliveries
  SELECT 'active_deliveries'::VARCHAR, COUNT(*)::BIGINT
  FROM deliveries
  WHERE status IN ('assigned', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff')

  UNION ALL

  -- Online drivers
  SELECT 'online_drivers'::VARCHAR, COUNT(*)::BIGINT
  FROM driver_presence
  WHERE status = 'online'

  UNION ALL

  -- Busy drivers
  SELECT 'busy_drivers'::VARCHAR, COUNT(*)::BIGINT
  FROM driver_presence
  WHERE status = 'busy'

  UNION ALL

  -- Open exceptions
  SELECT 'open_exceptions'::VARCHAR, COUNT(*)::BIGINT
  FROM order_exceptions
  WHERE status NOT IN ('resolved', 'closed')

  UNION ALL

  -- Critical exceptions
  SELECT 'critical_exceptions'::VARCHAR, COUNT(*)::BIGINT
  FROM order_exceptions
  WHERE status NOT IN ('resolved', 'closed')
    AND severity = 'critical'

  UNION ALL

  -- Pending refunds
  SELECT 'pending_refunds'::VARCHAR, COUNT(*)::BIGINT
  FROM refund_cases
  WHERE status = 'pending'

  UNION ALL

  -- Paused storefronts
  SELECT 'paused_storefronts'::VARCHAR, COUNT(*)::BIGINT
  FROM chef_storefronts
  WHERE is_paused = true

  UNION ALL

  -- SLA breaches today
  SELECT 'sla_breaches_today'::VARCHAR, COUNT(*)::BIGINT
  FROM sla_timers
  WHERE status = 'breached'
    AND breached_at >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get order timeline (all status changes)
CREATE OR REPLACE FUNCTION get_order_timeline(p_order_id UUID)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type VARCHAR,
  event_data JSONB,
  actor_id UUID
) AS $$
BEGIN
  RETURN QUERY

  -- Order status history
  SELECT
    osh.created_at as event_time,
    'status_change'::VARCHAR as event_type,
    jsonb_build_object(
      'previous_status', osh.previous_status,
      'new_status', osh.new_status,
      'notes', osh.notes
    ) as event_data,
    osh.changed_by as actor_id
  FROM order_status_history osh
  WHERE osh.order_id = p_order_id

  UNION ALL

  -- Delivery events
  SELECT
    de.created_at as event_time,
    de.event_type,
    de.data as event_data,
    NULL::UUID as actor_id
  FROM delivery_events de
  JOIN deliveries d ON d.id = de.delivery_id
  WHERE d.order_id = p_order_id

  UNION ALL

  -- Domain events
  SELECT
    dev.created_at as event_time,
    dev.event_type,
    dev.payload as event_data,
    dev.actor_user_id as actor_id
  FROM domain_events dev
  WHERE dev.entity_type = 'order'
    AND dev.entity_id = p_order_id

  ORDER BY event_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Calculate financial summary for date range
CREATE OR REPLACE FUNCTION get_financial_summary(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY

  SELECT 'total_revenue'::VARCHAR, COALESCE(SUM(amount_cents), 0)::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type = 'customer_charge_capture'
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day'

  UNION ALL

  SELECT 'total_refunds'::VARCHAR, ABS(COALESCE(SUM(amount_cents), 0))::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type IN ('customer_refund', 'customer_partial_refund')
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day'

  UNION ALL

  SELECT 'platform_fees'::VARCHAR, COALESCE(SUM(amount_cents), 0)::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type = 'platform_fee'
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day'

  UNION ALL

  SELECT 'chef_payouts'::VARCHAR, COALESCE(SUM(amount_cents), 0)::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type = 'chef_payable'
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day'

  UNION ALL

  SELECT 'driver_payouts'::VARCHAR, COALESCE(SUM(amount_cents), 0)::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type IN ('driver_payable', 'tip_payable')
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day'

  UNION ALL

  SELECT 'tax_collected'::VARCHAR, COALESCE(SUM(amount_cents), 0)::DECIMAL / 100
  FROM ledger_entries
  WHERE entry_type = 'tax_collected'
    AND created_at >= start_date
    AND created_at < end_date + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_queue_size TO authenticated;
GRANT EXECUTE ON FUNCTION decrement_queue_size TO authenticated;
GRANT EXECUTE ON FUNCTION increment_order_exception_count TO authenticated;
GRANT EXECUTE ON FUNCTION get_orders_needing_dispatch TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_drivers_near TO authenticated;
GRANT EXECUTE ON FUNCTION get_ops_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_order_timeline TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_summary TO authenticated;
