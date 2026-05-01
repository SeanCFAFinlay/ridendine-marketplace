/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', '..', relativePath), 'utf8');
}

describe('ops dashboard wiring (Phase F)', () => {
  it('does not hardcode avg delivery time dashboard stat', () => {
    const src = read('app/dashboard/page.tsx');
    expect(src).not.toContain('avgDeliveryTime: 25');
    expect(src).toContain('actual_dropoff_at');
  });

  it('live map includes loading/error/empty states', () => {
    const src = read('components/map/live-map.tsx');
    expect(src).toContain('Loading live map data...');
    expect(src).toContain('Unable to load live map data right now.');
    expect(src).toContain('No live driver or delivery locations are currently available.');
  });
});
