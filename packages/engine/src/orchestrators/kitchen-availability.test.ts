import { describe, it, expect } from 'vitest';
import {
  evaluateWeeklyAvailability,
  timeStringToMinutes,
} from './kitchen-availability';

describe('kitchen-availability', () => {
  it('timeStringToMinutes parses HH:MM:SS', () => {
    expect(timeStringToMinutes('09:30:00')).toBe(9 * 60 + 30);
    expect(timeStringToMinutes('00:00')).toBe(0);
  });

  it('allows when no schedule rows (backward compatible)', () => {
    const r = evaluateWeeklyAvailability(new Date('2026-06-01T12:00:00'), []);
    expect(r.allowed).toBe(true);
  });

  it('blocks when today row missing but other days configured', () => {
    const rows = [{ day_of_week: 1, start_time: '09:00', end_time: '17:00', is_available: true }];
    // 2026-06-07 is Sunday = 0
    const r = evaluateWeeklyAvailability(new Date('2026-06-07T12:00:00'), rows);
    expect(r.allowed).toBe(false);
    expect(r.code).toBe('OUTSIDE_AVAILABILITY_HOURS');
  });

  it('allows inside window for configured day', () => {
    // 2026-06-01 is Monday = 1
    const rows = [
      { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: true },
    ];
    const r = evaluateWeeklyAvailability(new Date('2026-06-01T12:00:00'), rows);
    expect(r.allowed).toBe(true);
  });

  it('blocks outside window same day', () => {
    const rows = [
      { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: true },
    ];
    const r = evaluateWeeklyAvailability(new Date('2026-06-01T08:30:00'), rows);
    expect(r.allowed).toBe(false);
  });

  it('blocks when is_available false', () => {
    const rows = [
      { day_of_week: 1, start_time: '09:00:00', end_time: '17:00:00', is_available: false },
    ];
    const r = evaluateWeeklyAvailability(new Date('2026-06-01T12:00:00'), rows);
    expect(r.allowed).toBe(false);
  });
});
