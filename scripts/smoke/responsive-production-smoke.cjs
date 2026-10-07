#!/usr/bin/env node

const { chromium } = require('@playwright/test');

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

const TARGETS = [
  {
    label: 'Customer web',
    url: 'https://ridendine.ca/',
    auth: false,
    requiredHeading: 'Find chef-made meals near you.',
  },
  {
    label: 'Ops admin',
    url: 'https://ops.ridendine.ca/',
    auth: true,
    requiredHeading: 'Live Board',
  },
  {
    label: 'Chef admin',
    url: 'https://chef.ridendine.ca/',
    auth: true,
    requiredHeading: ['Every Bite Yum', 'Chef Dashboard', 'Set up your storefront', 'Welcome back, Chef'],
  },
  {
    label: 'Driver app',
    url: 'https://driver.ridendine.ca/auth/login?redirect=%2F',
    auth: true,
    requiredHeading: ['Work Dashboard', 'Platform admin signed in', 'Driver profile not found', 'Welcome back, Driver', 'RideNDine'],
  },
];

function isDecorativeOverflowElement(element) {
  const text = String(element?.text || '');
  return (
    text.includes('absolute -top-40') ||
    text.includes('absolute -bottom-40') ||
    text.includes('blur-3xl')
  );
}

function isMeaningfulOverflow(result) {
  if (!result || result.overflowPx <= 3) return false;

  const elements = Array.isArray(result.overflowElements) ? result.overflowElements : [];
  if (elements.length === 0) return true;

  return elements.some((element) => !isDecorativeOverflowElement(element));
}

async function waitForSettledPage(page, extraMs = 1000) {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(extraMs);
}

async function loginIfNeeded(page, target, credentials) {
  if (!target.auth) return { attempted: false, url: page.url() };

  const email = page.locator('input[type="email"]');
  const password = page.locator('input[type="password"]');
  const submit = page.locator('button[type="submit"]');

  if ((await email.count()) !== 1 || (await password.count()) !== 1 || (await submit.count()) !== 1) {
    return { attempted: false, url: page.url(), reason: 'login form not visible' };
  }

  await email.fill(credentials.email);
  await password.fill(credentials.password);
  await Promise.all([
    submit.click(),
    page.waitForURL((url) => !url.pathname.includes('/auth/login'), { timeout: 20000 }).catch(() => {}),
  ]);
  await waitForSettledPage(page, 2500);

  return { attempted: true, url: page.url() };
}

async function auditCurrentPage(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const viewportWidth = doc.clientWidth;
    const scrollWidth = Math.max(doc.scrollWidth || 0, body?.scrollWidth || 0);
    const overflowElements = [];

    for (const el of Array.from(document.querySelectorAll('body *')).slice(0, 2500)) {
      const style = getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;

      if (rect.right > viewportWidth + 3 || rect.left < -3) {
        const rawLabel =
          el.getAttribute('aria-label') ||
          el.textContent ||
          el.id ||
          el.className ||
          el.tagName ||
          '';

        overflowElements.push({
          tag: el.tagName.toLowerCase(),
          text: String(rawLabel).replace(/\s+/g, ' ').trim().slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });

        if (overflowElements.length >= 8) break;
      }
    }

    const isVisible = (el) => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' && style.visibility !== 'hidden';
    };

    return {
      url: location.href,
      title: document.title,
      viewportWidth,
      scrollWidth,
      overflowPx: scrollWidth - viewportWidth,
      overflowElements,
      headings: Array.from(document.querySelectorAll('h1,h2,h3'))
        .filter(isVisible)
        .slice(0, 8)
        .map((heading) => heading.textContent.replace(/\s+/g, ' ').trim()),
      visibleButtons: Array.from(document.querySelectorAll('button')).filter(isVisible).length,
      visibleNavLinks: Array.from(document.querySelectorAll('nav a, aside a, header a')).filter(isVisible).length,
    };
  });
}

function evaluateAudit(target, viewportName, login, audit, consoleErrors) {
  const failures = [];

  if (audit.url.startsWith('chrome-error://')) {
    failures.push('browser error page loaded');
  }

  if (audit.title.includes('404')) {
    failures.push('404 page loaded');
  }

  if (target.requiredHeading) {
    const required = Array.isArray(target.requiredHeading) ? target.requiredHeading : [target.requiredHeading];
    if (!required.some((h) => audit.headings.includes(h))) {
      failures.push(`missing heading: ${required.join(' OR ')}`);
    }
  }

  if (isMeaningfulOverflow(audit)) {
    failures.push(`horizontal overflow: ${audit.overflowPx}px`);
  }

  const meaningfulConsoleErrors = consoleErrors.filter((message) => {
    return (
      !message.includes('favicon') &&
      !message.includes('_vercel/insights/script.js') &&
      !message.includes('Failed to load resource: the server responded with a status of 404') &&
      !message.includes('Failed to load resource: the server responded with a status of 403') &&
      !message.includes('GeolocationPositionError')
    );
  });

  if (meaningfulConsoleErrors.length > 0) {
    failures.push(`console errors: ${meaningfulConsoleErrors.length}`);
  }

  return {
    label: target.label,
    viewport: viewportName,
    login,
    audit,
    consoleErrors,
    failures,
  };
}

async function runResponsiveSmoke(options = {}) {
  const credentials = {
    email: options.email || process.env.RIDENDINE_SMOKE_EMAIL || 'sean@ridendine.ca',
    password: options.password || process.env.RIDENDINE_SMOKE_PASSWORD || 'password123',
  };

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({
        viewport,
        serviceWorkers: 'block',
      });

      for (const target of TARGETS) {
        const page = await context.newPage();
        const consoleErrors = [];
        page.on('console', (message) => {
          if (message.type() === 'error') consoleErrors.push(message.text().slice(0, 240));
        });

        try {
          await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await waitForSettledPage(page, 1500);
          const login = await loginIfNeeded(page, target, credentials);
          if (target.requiredHeading) {
            const headings = Array.isArray(target.requiredHeading) ? target.requiredHeading : [target.requiredHeading];
            await Promise.any(
              headings.map((h) =>
                page.getByText(h, { exact: false }).waitFor({ state: 'visible', timeout: 8000 })
              )
            ).catch(() => {});
          }
          const audit = await auditCurrentPage(page);
          results.push(evaluateAudit(target, viewportName, login, audit, consoleErrors));
        } finally {
          await page.close().catch(() => {});
        }
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const results = await runResponsiveSmoke();
  const failures = results.flatMap((result) =>
    result.failures.map((failure) => `${result.label} ${result.viewport}: ${failure}`),
  );

  console.log(JSON.stringify(results, null, 2));

  if (failures.length > 0) {
    console.error(`Responsive smoke failed:\n${failures.join('\n')}`);
    process.exit(1);
  }
}

module.exports = {
  TARGETS,
  VIEWPORTS,
  isMeaningfulOverflow,
  runResponsiveSmoke,
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
