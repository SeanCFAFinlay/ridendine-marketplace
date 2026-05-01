import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'web-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3000',
      },
    },
    {
      name: 'chef-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3001',
      },
    },
    {
      name: 'ops-admin-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3002',
      },
    },
    {
      name: 'driver-app-smoke',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:3003',
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @ridendine/web dev',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/chef-admin dev',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/ops-admin dev',
      url: 'http://127.0.0.1:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'pnpm --filter @ridendine/driver-app dev',
      url: 'http://127.0.0.1:3003',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
