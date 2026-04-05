import { describe, expect, it } from 'vitest';
import { calculateDriverAssignmentScore } from './dispatch.engine';

describe('calculateDriverAssignmentScore', () => {
  it('prefers the closer and less loaded driver', () => {
    const closer = calculateDriverAssignmentScore({
      id: '1',
      user_id: 'u1',
      first_name: 'Closer',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 2,
      estimated_minutes: 8,
      rating: 4.8,
      total_deliveries: 120,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    const fartherBusy = calculateDriverAssignmentScore({
      id: '2',
      user_id: 'u2',
      first_name: 'Busy',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 7,
      estimated_minutes: 18,
      rating: 4.9,
      total_deliveries: 400,
      active_workload: 2,
      recent_declines: 1,
      recent_expiries: 1,
      fairness_score: 0.33,
    });

    expect(closer).toBeGreaterThan(fartherBusy);
  });

  it('penalizes decline and expiry history', () => {
    const cleanDriver = calculateDriverAssignmentScore({
      id: '1',
      user_id: 'u1',
      first_name: 'Clean',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 4,
      estimated_minutes: 12,
      rating: 4.7,
      total_deliveries: 200,
      active_workload: 0,
      recent_declines: 0,
      recent_expiries: 0,
      fairness_score: 1,
    });

    const unreliableDriver = calculateDriverAssignmentScore({
      id: '2',
      user_id: 'u2',
      first_name: 'Unreliable',
      last_name: 'Driver',
      approval_state: 'approved',
      presence_status: 'online',
      distance_km: 4,
      estimated_minutes: 12,
      rating: 4.7,
      total_deliveries: 200,
      active_workload: 0,
      recent_declines: 3,
      recent_expiries: 2,
      fairness_score: 1,
    });

    expect(cleanDriver).toBeGreaterThan(unreliableDriver);
  });
});
