/**
 * @jest-environment node
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { KITCHEN_NEXT_TRANSITION, KITCHEN_REJECT_TRANSITION } from '@ridendine/utils';
import {
  futureNavSection,
  isFutureRoute,
  navSectionsFor,
  isNavItemActive,
  primaryNavSections,
} from '../components/layout/nav-config';

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
    expect(src).toContain('/auth/login');
    expect(src).toContain('/auth/signup');
    expect(src).toContain('/auth/forgot-password');
    expect(src).toContain('/privacy');
    expect(src).toContain('/terms');
    expect(src).toContain('/api/health');
    expect(src).toContain("loginRoute: '/auth/login'");
  });

  it('login form posts to the chef auth API instead of browser-only auth', () => {
    const src = read('app/auth/login/page.tsx');
    expect(src).toContain("fetch('/api/auth/login'");
    expect(src).not.toContain('useAuth');
  });

  it('critical dashboard pages exist', () => {
    const dashboardOrders = read('app/dashboard/orders/page.tsx');
    const dashboardMenu = read('app/dashboard/menu/page.tsx');
    const dashboardAvailability = read('app/dashboard/availability/page.tsx');
    expect(dashboardOrders.length).toBeGreaterThan(100);
    expect(dashboardMenu.length).toBeGreaterThan(100);
    expect(dashboardAvailability.length).toBeGreaterThan(100);
  });

  it('dashboard exposes chef command center and readiness wiring', () => {
    const src = read('app/dashboard/page.tsx');
    expect(src).toContain('Chef operating dashboard');
    expect(src).toContain('Today&apos;s Action Queue');
    expect(src).toContain('Prep Timeline');
    expect(src).toContain('Menu Health');
    expect(src).toContain('Storefront Readiness');
    expect(src).toContain('Quick Tools');
    expect(src).toContain('Business Snapshot');
    expect(src).toContain('getMenuItemsByStorefront');
    expect(src).toContain('chef_availability');
    // Business Snapshot: week-over-week and net earnings
    expect(src).toContain('weekRevenue');
    expect(src).toContain('prevWeekRevenue');
    expect(src).toContain('Est. net earnings');
  });

  it('kitchen queue uses protected action payloads (live workflow surface)', () => {
    // Stage 1: the live accept/prep/ready workflow lives in Kitchen Command,
    // not the Orders ledger. Assert the protected action wiring on the kitchen
    // queue plus the shared module's action vocabulary.
    const src = read('components/kitchen/kitchen-order-queue.tsx');
    expect(src).toContain('KITCHEN_NEXT_TRANSITION');
    expect(src).toContain('KITCHEN_REJECT_TRANSITION');
    expect(KITCHEN_NEXT_TRANSITION.pending.action).toBe('accept');
    expect(KITCHEN_NEXT_TRANSITION.accepted.action).toBe('start_preparing');
    expect(KITCHEN_NEXT_TRANSITION.preparing.action).toBe('mark_ready');
    expect(KITCHEN_REJECT_TRANSITION.action).toBe('reject');
  });

  it('orders page is a read-only ledger with filters and detail links', () => {
    const ledger = read('components/orders/orders-ledger.tsx');
    // Ledger = history/search/trace, not a live workflow board.
    expect(ledger).toContain('Kitchen status');
    expect(ledger).toContain('Payment status');
    expect(ledger).toContain('Delivery status');
    expect(ledger).toContain('Export CSV');
    expect(ledger).toContain('/dashboard/orders/');
    // The ledger must NOT carry the live kitchen workflow.
    expect(ledger).not.toContain('Kitchen workflow');
    expect(ledger).not.toContain('KITCHEN_NEXT_TRANSITION');

    const page = read('app/dashboard/orders/page.tsx');
    expect(page).toContain('OrdersLedger');
    expect(page).toContain('Order History');
    expect(page).toContain('Live Orders');
  });

  it('chef nav keeps the core order-management surfaces up front', () => {
    const sidebar = read('components/layout/sidebar.tsx');
    const header = read('components/layout/header.tsx');
    for (const src of [sidebar, header]) {
      expect(src).toContain('navSectionsFor');
      expect(src).toContain('FutureNavGroup');
    }
    const hrefs = primaryNavSections.flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs).toEqual([
      '/dashboard',
      '/dashboard/kitchen',
      '/dashboard/orders',
      '/dashboard/menu',
      '/dashboard/storefront',
      '/dashboard/availability',
      '/dashboard/reviews',
      '/dashboard/analytics',
      '/dashboard/payouts',
      '/dashboard/settings',
    ]);
  });

  it('kitchen-os tools are parked in the "Add-ons" group, not the primary nav', () => {
    const primary = new Set(primaryNavSections.flatMap((s) => s.items.map((i) => i.href)));
    const parked = futureNavSection.items.map((i) => i.href);
    for (const href of [
      '/dashboard/inventory',
      '/dashboard/suppliers',
      '/dashboard/production',
      '/dashboard/labor',
      '/dashboard/recipes',
      '/dashboard/costs',
      '/dashboard/kitchen/pnl',
    ]) {
      expect(parked).toContain(href);
      expect(primary.has(href)).toBe(false);
    }
    expect(isFutureRoute('/dashboard/recipes/abc')).toBe(true);
    expect(isFutureRoute('/dashboard/kitchen')).toBe(false);
    // Live Orders must not light up on the KDS board sub-route.
    expect(isNavItemActive('/dashboard/kitchen/board', '/dashboard/kitchen')).toBe(false);
    expect(isNavItemActive('/dashboard/kitchen/board', '/dashboard/kitchen/board')).toBe(true);
    expect(isNavItemActive('/dashboard/orders/123', '/dashboard/orders')).toBe(true);
  });

  it('sidebar includes business engine nav items', () => {
    const src = read('components/layout/nav-config.ts');
    expect(src).toContain("href: '/dashboard/customers'");
    expect(src).toContain("label: 'Customers'");
    expect(src).toContain("href: '/dashboard/growth'");
    expect(src).toContain("label: 'Growth'");
  });

  it('business engine pages exist', () => {
    const customers = read('app/dashboard/customers/page.tsx');
    const growth = read('app/dashboard/growth/page.tsx');
    expect(customers).toContain('Customer List');
    expect(customers).toContain('Understanding Your Customer Tiers');
    expect(growth).toContain('Business Growth');
    expect(growth).toContain('Revenue Trend');
  });

  it('sidebar includes kitchen command nav item (as Live Orders)', () => {
    const src = read('components/layout/nav-config.ts');
    expect(src).toContain("href: '/dashboard/kitchen'");
    expect(src).toContain("label: 'Live Orders'");
  });

  it('inventory page is wired to the inventory APIs with a nav item', () => {
    const sidebar = read('components/layout/nav-config.ts');
    expect(sidebar).toContain("href: '/dashboard/inventory'");
    expect(sidebar).toContain("label: 'Inventory'");

    const page = read('app/dashboard/inventory/page.tsx');
    expect(page).toContain('/api/inventory');
    expect(page).toContain('/api/inventory/alerts');
    // Real data only: an empty state, not fabricated rows.
    expect(page).toContain('EmptyState');

    const movement = read('components/inventory/stock-movement-modal.tsx');
    expect(movement).toContain('/api/inventory/waste');
    expect(movement).toContain('/movement');
  });

  it('costs page is wired to the costs overview API with a nav item', () => {
    const sidebar = read('components/layout/nav-config.ts');
    expect(sidebar).toContain("href: '/dashboard/costs'");
    expect(sidebar).toContain("label: 'Food Costs'");

    const page = read('app/dashboard/costs/page.tsx');
    expect(page).toContain('/api/costs/overview');
    expect(page).toContain('Prime cost');
    // No fabricated numbers: food cost shows a needs-setup card.
    expect(page).toContain('foodCostAvailable');
  });

  it('kitchen-os UIs (recipes, labour, production, suppliers) are wired with nav items', () => {
    const sidebar = read('components/layout/nav-config.ts');
    for (const [href, label] of [
      ['/dashboard/recipes', 'Recipes'],
      ['/dashboard/labor', 'Labour'],
      ['/dashboard/production', 'Production'],
      ['/dashboard/suppliers', 'Suppliers'],
    ] as const) {
      expect(sidebar).toContain(`href: '${href}'`);
      expect(sidebar).toContain(`label: '${label}'`);
    }

    expect(read('app/dashboard/recipes/page.tsx')).toContain('/api/recipes');
    // Recipe builder shows a live cost preview from the pure engine.
    expect(read('components/recipes/recipe-builder-modal.tsx')).toContain('computeMenuItemCosting');
    expect(read('app/dashboard/labor/page.tsx')).toContain('/api/labor/clock-');
    expect(read('app/dashboard/production/page.tsx')).toContain('/api/production/prep-tasks');
    expect(read('app/dashboard/suppliers/page.tsx')).toContain('/api/purchase-orders');
    expect(read('components/kitchen/service-controls.tsx')).toContain('/api/kitchen/service-mode');
  });

  it('recipe versioning + packaging management are wired', () => {
    // Recipe detail page opens a version editor that posts to the version API.
    expect(read('app/dashboard/recipes/[id]/page.tsx')).toContain('RecipeVersionModal');
    expect(read('components/recipes/recipe-version-modal.tsx')).toContain('/version');
    // Recipe list links into the detail/version screen.
    expect(read('app/dashboard/recipes/page.tsx')).toContain('/dashboard/recipes/${r.id}');
    // Packaging catalogue management.
    expect(read('components/recipes/packaging-manager.tsx')).toContain('/api/packaging');
    expect(read('app/dashboard/recipes/page.tsx')).toContain('PackagingManager');
  });

  it('kitchen command page exists with all three sections and pause wiring', () => {
    const page = read('app/dashboard/kitchen/page.tsx');
    expect(page).toContain('Kitchen Command');
    expect(page).toContain("Today's Prep Plan");
    expect(page).toContain('Live Prep Board');
    expect(page).toContain('/api/kitchen/overview');
    expect(page).toContain('/api/kitchen/pause');
  });

  it('menu editor exposes inventory controls through the API', () => {
    const modal = read('components/menu/item-modal.tsx');
    const list = read('components/menu/menu-list.tsx');
    const createRoute = read('app/api/menu/route.ts');
    const updateRoute = read('app/api/menu/[id]/route.ts');

    expect(modal).toContain('Daily Limit');
    expect(modal).toContain('Sold Today');
    expect(modal).toContain('Restock At');
    expect(list).toContain('Sold Out');
    expect(createRoute).toContain('daily_limit');
    expect(updateRoute).toContain('sold_out_at');
  });

  it('hides Payouts from kitchen staff but shows it to the owner', () => {
    const hrefs = (owner: boolean) => navSectionsFor(owner).flatMap((s) => s.items.map((i) => i.href));
    expect(hrefs(true)).toContain('/dashboard/payouts');
    expect(hrefs(false)).not.toContain('/dashboard/payouts');
    expect(hrefs(false)).toEqual(expect.arrayContaining(['/dashboard/kitchen', '/dashboard/orders', '/dashboard/menu']));
  });
});
