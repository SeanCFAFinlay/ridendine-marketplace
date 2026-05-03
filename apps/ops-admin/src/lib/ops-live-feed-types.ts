/** Snapshot shapes for GET /api/ops/live-board and useOpsLiveFeed merges. */

export type OpsLiveDeliverySnapshot = {
  id: string;
  order_id: string;
  status: string;
  driver_id: string | null;
  updated_at: string;
  estimated_dropoff_at: string | null;
  escalated_to_ops: boolean | null;
  assignment_attempts_count: number | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  pickup_address: string;
  dropoff_address: string;
  route_polyline?: string | null;
};

export type OpsLiveOrderSnapshot = {
  id: string;
  order_number: string;
  engine_status: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  estimated_ready_at: string | null;
  ready_at: string | null;
  prep_started_at: string | null;
  storefront_id: string;
  customer_id: string;
  chef_name: string;
  customer_name: string;
  delivery: OpsLiveDeliverySnapshot | null;
};

export type OpsLiveDriverSnapshot = {
  id: string;
  first_name: string;
  last_name: string;
  driver_status: string;
  updated_at: string;
  presence: {
    status: string;
    updated_at: string;
    current_lat: number | null;
    current_lng: number | null;
    last_location_lat: number | null;
    last_location_lng: number | null;
    last_location_at: string | null;
    last_location_update: string | null;
  } | null;
};

export type OpsLiveChefSnapshot = {
  id: string;
  name: string;
  chef_display_name: string;
  storefront_state: string | null;
  is_paused: boolean | null;
  current_queue_size: number | null;
  max_queue_size: number | null;
  is_overloaded: boolean | null;
  estimated_prep_time_max: number;
  updated_at: string;
};

export type OpsLiveBoardPressure = {
  openExceptions: number;
  slaBreaches: number;
  pendingDispatch: number;
  deliveryEscalations: number;
};
