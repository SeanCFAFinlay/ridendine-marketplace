/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';

function read(relativePath: string): string {
  return readFileSync(join(__dirname, '..', relativePath), 'utf8');
}

describe('chef-admin smoke wiring', () => {
  it('home page redirects to dashboard', () => {
    const src = read('app/page.tsx');
    expect(src).toContain("redirect('/dashboard')");
  });

  it('middleware preserves auth route/public-route protections', () => {
    const src = read('middleware.ts');
    expect(src).toContain("publicRoutes: ['/auth/login', '/auth/signup']");
    expect(src).toContain("loginRoute: '/auth/login'");
  });

  it('critical dashboard pages exist', () => {
    const dashboardOrders = read('app/dashboard/orders/page.tsx');
    const dashboardMenu = read('app/dashboard/menu/page.tsx');
    const dashboardAvailability = read('app/dashboard/availability/page.tsx');
    expect(dashboardOrders.length).toBeGreaterThan(100);
    expect(dashboardMenu.length).toBeGreaterThan(100);
    expect(dashboardAvailability.length).toBeGreaterThan(100);
  });
});
