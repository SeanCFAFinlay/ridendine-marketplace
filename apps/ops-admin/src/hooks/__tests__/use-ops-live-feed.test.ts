import { createEmptyLiveFeedState, liveFeedReducer } from '@/lib/ops-live-feed-reducer';
import type { OpsLiveOrderSnapshot } from '@/lib/ops-live-feed-types';
import { mapEngineStatusToPublicStage, PublicOrderStage } from '@ridendine/types';

const baseOrder = (over: Partial<OpsLiveOrderSnapshot>): OpsLiveOrderSnapshot => ({
  id: 'o1',
  order_number: '100',
  engine_status: 'pending',
  status: 'pending',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  estimated_ready_at: null,
  ready_at: null,
  prep_started_at: null,
  storefront_id: 's1',
  customer_id: 'c1',
  chef_name: 'Chef',
  customer_name: 'Pat',
  delivery: null,
  ...over,
});

describe('liveFeedReducer', () => {
  it('hydrates and deduplicates by order id', () => {
    let s = createEmptyLiveFeedState();
    const o = baseOrder({ id: 'o1' });
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: { orders: [o, { ...o, order_number: 'dup' }], drivers: [], chefs: [] },
    });
    expect(s.ordersById.size).toBe(1);
    expect(s.ordersById.get('o1')?.order_number).toBe('dup');
  });

  it('merges sequential order updates without duplicate rows', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: { orders: [baseOrder({ id: 'o1', updated_at: '2020-01-01T00:00:00Z' })], drivers: [], chefs: [] },
    });
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', updated_at: '2025-01-02T00:00:00Z', engine_status: 'preparing' },
    });
    expect(s.ordersById.size).toBe(1);
    expect(s.ordersById.get('o1')?.engine_status).toBe('preparing');
  });

  it('ignores stale order updates', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [baseOrder({ id: 'o1', engine_status: 'ready', updated_at: '2025-06-01T12:00:00Z' })],
        drivers: [],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', engine_status: 'pending', updated_at: '2025-01-01T00:00:00Z' },
    });
    expect(s.ordersById.get('o1')?.engine_status).toBe('ready');
  });

  it('moves order public stage when engine_status changes', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [baseOrder({ id: 'o1', engine_status: 'pending', updated_at: '2025-01-01T00:00:00Z' })],
        drivers: [],
        chefs: [],
      },
    });
    expect(mapEngineStatusToPublicStage(s.ordersById.get('o1')!.engine_status)).toBe(PublicOrderStage.PLACED);
    s = liveFeedReducer(s, {
      type: 'ORDER_PATCH',
      row: { id: 'o1', engine_status: 'preparing', updated_at: '2025-01-02T00:00:00Z' },
    });
    expect(mapEngineStatusToPublicStage(s.ordersById.get('o1')!.engine_status)).toBe(PublicOrderStage.COOKING);
  });

  it('merges driver presence without duplicating drivers', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [],
        drivers: [
          {
            id: 'd1',
            first_name: 'A',
            last_name: 'B',
            driver_status: 'approved',
            updated_at: '2025-01-01T00:00:00Z',
            presence: {
              status: 'offline',
              updated_at: '2025-01-01T00:00:00Z',
              current_lat: null,
              current_lng: null,
              last_location_lat: null,
              last_location_lng: null,
              last_location_at: null,
              last_location_update: null,
            },
          },
        ],
        chefs: [],
      },
    });
    s = liveFeedReducer(s, {
      type: 'DRIVER_PRESENCE_PATCH',
      row: {
        driver_id: 'd1',
        status: 'online',
        updated_at: '2025-01-02T00:00:00Z',
        current_lat: 1,
        current_lng: 2,
      },
    });
    expect(s.driversById.size).toBe(1);
    expect(s.driversById.get('d1')?.presence?.status).toBe('online');
    expect(s.driversById.get('d1')?.presence?.current_lat).toBe(1);
  });

  it('updates chef queue fields deterministically', () => {
    let s = createEmptyLiveFeedState();
    s = liveFeedReducer(s, {
      type: 'HYDRATE',
      payload: {
        orders: [],
        drivers: [],
        chefs: [
          {
            id: 'sf1',
            name: 'Store',
            chef_display_name: 'Chef',
            storefront_state: 'open',
            is_paused: false,
            current_queue_size: 1,
            max_queue_size: 10,
            is_overloaded: false,
            estimated_prep_time_max: 45,
            updated_at: '2025-01-01T00:00:00Z',
          },
        ],
      },
    });
    s = liveFeedReducer(s, {
      type: 'CHEF_PATCH',
      row: { id: 'sf1', current_queue_size: 5, updated_at: '2025-01-02T00:00:00Z' },
    });
    expect(s.chefsById.get('sf1')?.current_queue_size).toBe(5);
  });
});
