import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.UI_BLUEPRINT_BASE_URL ?? 'http://127.0.0.1:3000';
const outputDir = path.resolve(process.cwd(), 'docs/ui/screenshots');

const screens = [
  ['customer-home', 'customer-home.png'],
  ['customer-menu', 'customer-menu.png'],
  ['customer-checkout', 'customer-checkout.png'],
  ['customer-order-tracking', 'customer-order-tracking.png'],
  ['chef-dashboard', 'chef-dashboard.png'],
  ['chef-orders', 'chef-orders.png'],
  ['chef-menu-manager', 'chef-menu-manager.png'],
  ['chef-analytics', 'chef-analytics.png'],
  ['chef-settings', 'chef-settings.png'],
  ['driver-home', 'driver-home.png'],
  ['driver-offer', 'driver-offer.png'],
  ['driver-active-delivery', 'driver-active-delivery.png'],
  ['driver-earnings', 'driver-earnings.png'],
  ['driver-settings', 'driver-settings.png'],
  ['ops-dashboard', 'ops-dashboard.png'],
  ['ops-dispatch', 'ops-dispatch.png'],
  ['ops-finance', 'ops-finance.png'],
  ['ops-payouts', 'ops-payouts.png'],
  ['ops-reconciliation', 'ops-reconciliation.png'],
  ['ops-users', 'ops-users.png'],
  ['ops-system-health', 'ops-system-health.png'],
] as const;

async function main() {
  await mkdir(outputDir, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });

  for (const [route, filename] of screens) {
    const url = `${baseUrl}/ui-blueprint/${route}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('text=Ridéndine UI Blueprint').first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outputDir, filename), fullPage: true });
    console.log(`captured ${filename} from ${url}`);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
