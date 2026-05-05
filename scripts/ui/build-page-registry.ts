import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Status = 'WIRED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';

interface RegistryPage {
  id: string;
  app: 'web' | 'chef-admin' | 'driver-app' | 'ops-admin';
  name: string;
  route: string;
  screenshot: string;
  publicScreenshot: string;
  designIntent: string;
  components: string[];
  apis: string[];
  dbTables: string[];
  packages: string[];
  docs: string[];
  status: Status;
  missingWiring: string[];
  changeRequests: string[];
  implementationNotes: string[];
}

const root = process.cwd();
const now = new Date().toISOString();

const blueprintPages: Array<Omit<RegistryPage, 'apis' | 'dbTables' | 'packages' | 'status' | 'missingWiring' | 'changeRequests' | 'implementationNotes'>> = [
  { id: 'customer-home', app: 'web', name: 'Customer Home', route: '/ui-blueprint/customer-home', screenshot: 'docs/ui/screenshots/customer-home.png', publicScreenshot: '/screenshots/customer-home.png', designIntent: 'Marketplace discovery and active order awareness', components: ['AppShell', 'PageHeader', 'MetricCard', 'MapPlaceholder', 'LiveFeed'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'customer-menu', app: 'web', name: 'Customer Menu', route: '/ui-blueprint/customer-menu', screenshot: 'docs/ui/screenshots/customer-menu.png', publicScreenshot: '/screenshots/customer-menu.png', designIntent: 'Chef menu with sticky cart', components: ['TabNav', 'OrderCard', 'DrawerPanel'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'customer-checkout', app: 'web', name: 'Customer Checkout', route: '/ui-blueprint/customer-checkout', screenshot: 'docs/ui/screenshots/customer-checkout.png', publicScreenshot: '/screenshots/customer-checkout.png', designIntent: 'Cart, address, fees, and payment state', components: ['OrderCard', 'PayoutCard', 'ActionButton'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'customer-order-tracking', app: 'web', name: 'Customer Order Tracking', route: '/ui-blueprint/customer-order-tracking', screenshot: 'docs/ui/screenshots/customer-order-tracking.png', publicScreenshot: '/screenshots/customer-order-tracking.png', designIntent: 'ETA, map, and timeline', components: ['MapPlaceholder', 'OrderTimeline'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'chef-dashboard', app: 'chef-admin', name: 'Chef Dashboard', route: '/ui-blueprint/chef-dashboard', screenshot: 'docs/ui/screenshots/chef-dashboard.png', publicScreenshot: '/screenshots/chef-dashboard.png', designIntent: 'Live kitchen operating view', components: ['MetricCard', 'DataTable', 'LiveFeed'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'chef-orders', app: 'chef-admin', name: 'Chef Orders', route: '/ui-blueprint/chef-orders', screenshot: 'docs/ui/screenshots/chef-orders.png', publicScreenshot: '/screenshots/chef-orders.png', designIntent: 'Kanban-style queue and detail drawer', components: ['OrderCard', 'DrawerPanel', 'OrderTimeline'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'chef-menu-manager', app: 'chef-admin', name: 'Chef Menu Manager', route: '/ui-blueprint/chef-menu-manager', screenshot: 'docs/ui/screenshots/chef-menu-manager.png', publicScreenshot: '/screenshots/chef-menu-manager.png', designIntent: 'Menu sections and item availability', components: ['TabNav', 'OrderCard'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'chef-analytics', app: 'chef-admin', name: 'Chef Analytics', route: '/ui-blueprint/chef-analytics', screenshot: 'docs/ui/screenshots/chef-analytics.png', publicScreenshot: '/screenshots/chef-analytics.png', designIntent: 'Sales, order volume, popular items, and operating rhythm', components: ['MetricCard', 'DataTable', 'LiveFeed'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'chef-settings', app: 'chef-admin', name: 'Chef Settings', route: '/ui-blueprint/chef-settings', screenshot: 'docs/ui/screenshots/chef-settings.png', publicScreenshot: '/screenshots/chef-settings.png', designIntent: 'Profile, payout status, hours, and service area', components: ['UserAvatar', 'OrderCard', 'DrawerPanel'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'driver-home', app: 'driver-app', name: 'Driver Home', route: '/ui-blueprint/driver-home', screenshot: 'docs/ui/screenshots/driver-home.png', publicScreenshot: '/screenshots/driver-home.png', designIntent: 'Online state and offers', components: ['MetricCard', 'MapPlaceholder'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'driver-offer', app: 'driver-app', name: 'Driver Offer', route: '/ui-blueprint/driver-offer', screenshot: 'docs/ui/screenshots/driver-offer.png', publicScreenshot: '/screenshots/driver-offer.png', designIntent: 'Fast accept/reject offer screen', components: ['MapPlaceholder', 'OrderCard'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'driver-active-delivery', app: 'driver-app', name: 'Driver Active Delivery', route: '/ui-blueprint/driver-active-delivery', screenshot: 'docs/ui/screenshots/driver-active-delivery.png', publicScreenshot: '/screenshots/driver-active-delivery.png', designIntent: 'Route and status progression', components: ['MapPlaceholder', 'OrderTimeline'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'driver-earnings', app: 'driver-app', name: 'Driver Earnings', route: '/ui-blueprint/driver-earnings', screenshot: 'docs/ui/screenshots/driver-earnings.png', publicScreenshot: '/screenshots/driver-earnings.png', designIntent: 'Daily and weekly payout summary', components: ['MoneyCard', 'PayoutCard', 'DataTable'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'driver-settings', app: 'driver-app', name: 'Driver Settings', route: '/ui-blueprint/driver-settings', screenshot: 'docs/ui/screenshots/driver-settings.png', publicScreenshot: '/screenshots/driver-settings.png', designIntent: 'Vehicle, profile, and notification preferences', components: ['UserAvatar', 'OrderCard', 'StatusBadge'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'ops-dashboard', app: 'ops-admin', name: 'Ops Dashboard', route: '/ui-blueprint/ops-dashboard', screenshot: 'docs/ui/screenshots/ops-dashboard.png', publicScreenshot: '/screenshots/ops-dashboard.png', designIntent: 'Command center overview', components: ['MetricCard', 'DataTable', 'LiveFeed'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md', 'docs/wiring/RIDENDINE_MASTER_WIRING_DIAGRAM.md'] },
  { id: 'ops-dispatch', app: 'ops-admin', name: 'Ops Dispatch', route: '/ui-blueprint/ops-dispatch', screenshot: 'docs/ui/screenshots/ops-dispatch.png', publicScreenshot: '/screenshots/ops-dispatch.png', designIntent: 'Assignment and map workflow', components: ['MapPlaceholder', 'FilterBar', 'DrawerPanel'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
  { id: 'ops-finance', app: 'ops-admin', name: 'Ops Finance', route: '/ui-blueprint/ops-finance', screenshot: 'docs/ui/screenshots/ops-finance.png', publicScreenshot: '/screenshots/ops-finance.png', designIntent: 'Revenue and reconciliation health', components: ['MoneyCard', 'PayoutCard', 'DataTable'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md', 'docs/wiring/API_INVENTORY.md'] },
  { id: 'ops-payouts', app: 'ops-admin', name: 'Ops Payouts', route: '/ui-blueprint/ops-payouts', screenshot: 'docs/ui/screenshots/ops-payouts.png', publicScreenshot: '/screenshots/ops-payouts.png', designIntent: 'Payout review and approvals', components: ['PayoutCard', 'DataTable'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md', 'docs/wiring/MISSING_WIRING_REPORT.md'] },
  { id: 'ops-reconciliation', app: 'ops-admin', name: 'Ops Reconciliation', route: '/ui-blueprint/ops-reconciliation', screenshot: 'docs/ui/screenshots/ops-reconciliation.png', publicScreenshot: '/screenshots/ops-reconciliation.png', designIntent: 'Stripe and ledger matching', components: ['DataTable', 'StatusBadge'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md', 'docs/wiring/API_INVENTORY.md'] },
  { id: 'ops-system-health', app: 'ops-admin', name: 'Ops System Health', route: '/ui-blueprint/ops-system-health', screenshot: 'docs/ui/screenshots/ops-system-health.png', publicScreenshot: '/screenshots/ops-system-health.png', designIntent: 'API, DB, webhook, cron, and queue status', components: ['MetricCard', 'HealthDot'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/API_INVENTORY.md'] },
  { id: 'ops-users', app: 'ops-admin', name: 'Ops Users', route: '/ui-blueprint/ops-users', screenshot: 'docs/ui/screenshots/ops-users.png', publicScreenshot: '/screenshots/ops-users.png', designIntent: 'Customers, chefs, drivers, risk, and account status', components: ['UserAvatar', 'OrderCard', 'StatusBadge'], docs: ['docs/ui/PAGE_BLUEPRINTS.md', 'docs/wiring/PAGE_WIRING_MATRIX.md'] },
];

function readIfExists(file: string) {
  const absolute = path.join(root, file);
  return existsSync(absolute) ? readFileSync(absolute, 'utf8') : '';
}

function parseWiringMatrix() {
  const matrix = readIfExists('docs/wiring/PAGE_WIRING_MATRIX.md');
  const rows = new Map<string, { apis: string[]; dbTables: string[]; packages: string[]; status: Status; missingWiring: string[] }>();
  for (const line of matrix.split('\n')) {
    if (!line.startsWith('|') || line.includes('---') || line.includes('| App |')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 10) continue;
    const route = cells[2]?.replace(/`/g, '') ?? '';
    const reads = cells[3] ?? '';
    const calls = cells[5] ?? '';
    const status = (cells[8] as Status) || 'UNKNOWN';
    rows.set(route, {
      apis: [...calls.matchAll(/`([^`]+)`/g)].map((m) => m[1]!).filter((v) => !v.includes('None detected')),
      dbTables: [...reads.matchAll(/`([^`]+)`/g)].map((m) => m[1]!),
      packages: [...reads.matchAll(/@ridendine\/[a-z-]+/g)].map((m) => m[0]),
      status: ['WIRED', 'PARTIAL', 'MISSING', 'UNKNOWN'].includes(status) ? status : 'UNKNOWN',
      missingWiring: cells[9] ? [cells[9]] : [],
    });
  }
  return rows;
}

function statusFor(page: Omit<RegistryPage, 'apis' | 'dbTables' | 'packages' | 'status' | 'missingWiring' | 'changeRequests' | 'implementationNotes'>, wiringStatus?: Status): Status {
  const screenshotExists = existsSync(path.join(root, page.screenshot));
  const docsExist = page.docs.every((doc) => existsSync(path.join(root, doc)));
  const routeExists = existsSync(path.join(root, 'apps/web/src/app/ui-blueprint/[screen]/page.tsx'));
  if (!routeExists || !screenshotExists) return 'MISSING';
  if (!docsExist) return 'PARTIAL';
  return wiringStatus === 'MISSING' ? 'PARTIAL' : wiringStatus ?? 'UNKNOWN';
}

const wiring = parseWiringMatrix();
const pages: RegistryPage[] = blueprintPages.map((page) => {
  const routeKey = page.route.replace(/\/ui-blueprint\/[^/]+$/, '/ui-blueprint/:screen');
  const wiringInfo = wiring.get(routeKey);
  return {
    ...page,
    apis: wiringInfo?.apis ?? [],
    dbTables: wiringInfo?.dbTables ?? [],
    packages: Array.from(new Set([...(wiringInfo?.packages ?? []), '@ridendine/ui'])),
    status: statusFor(page, wiringInfo?.status),
    missingWiring: wiringInfo?.missingWiring ?? [],
    changeRequests: [],
    implementationNotes: [
      'Blueprint route uses isolated visual data only.',
      'Production wiring must be verified against real app route/API files before status is upgraded.',
    ],
  };
});

const registry = {
  generatedAt: now,
  source: {
    screenshots: 'docs/ui/screenshots',
    wiringMatrix: existsSync(path.join(root, 'docs/wiring/PAGE_WIRING_MATRIX.md')) ? 'docs/wiring/PAGE_WIRING_MATRIX.md' : null,
  },
  pages,
};

writeFileSync(path.join(root, 'docs/ui/page-registry.json'), `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Wrote docs/ui/page-registry.json with ${pages.length} pages.`);
