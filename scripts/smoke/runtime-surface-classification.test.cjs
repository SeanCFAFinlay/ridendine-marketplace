const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

test('classifies every discovered page surface with auth intent', () => {
  const { collectSurfaceClassifications } = require('./runtime-surface-classification.cjs');
  const summary = collectSurfaceClassifications({ root: repoRoot });

  assert.equal(summary.pages.length, 104);
  assert.equal(summary.pages.every((page) => page.classification.kind === 'page'), true);
  assert.equal(
    summary.pages.find((page) => page.app === 'customer' && page.route === '/account').classification.authIntent,
    'protected'
  );
  assert.equal(
    summary.pages.find((page) => page.app === 'chef' && page.route === '/auth/login').classification.authIntent,
    'public-auth-entry'
  );
  assert.equal(
    summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard').classification.authIntent,
    'protected'
  );
  assert.equal(summary.pageTotals.classified, 104);
  assert.deepEqual(summary.failures, []);
});

test('classifies every discovered API route handler with method and guard intent', () => {
  const { collectSurfaceClassifications } = require('./runtime-surface-classification.cjs');
  const summary = collectSurfaceClassifications({ root: repoRoot });

  assert.equal(summary.apis.length, 180);
  assert.equal(summary.apis.every((api) => api.classification.kind === 'api'), true);

  const health = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/health');
  assert.deepEqual(health.classification.methods, ['GET']);
  assert.equal(health.classification.guardIntent, 'public-read');
  assert.equal(health.classification.mutationClass, 'read-only');

  const stripeWebhook = summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/stripe/webhook');
  assert.equal(stripeWebhook.classification.guardIntent, 'signature-guarded');
  assert.equal(stripeWebhook.classification.liveSmokeBucket, 'signature-contract-only');

  const opsFinance = summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/engine/finance');
  assert.equal(opsFinance.classification.guardIntent, 'protected-session');
  assert.equal(opsFinance.classification.liveSmokeBucket, 'authenticated-read');
  assert.equal(summary.apiTotals.classified, 180);
  assert.deepEqual(summary.failures, []);
});

test('generates markdown docs with page and API classification sections', () => {
  const {
    collectSurfaceClassifications,
    generateMarkdown,
  } = require('./runtime-surface-classification.cjs');
  const markdown = generateMarkdown(collectSurfaceClassifications({ root: repoRoot }));

  assert.ok(markdown.includes('# Runtime Surface Classification'));
  assert.ok(markdown.includes('## Page Surface Classification'));
  assert.ok(markdown.includes('## API Route Handler Classification'));
  assert.ok(markdown.includes('| Pages | 104 | 104 | 0 |'));
  assert.ok(markdown.includes('| API route handlers | 180 | 180 | 0 |'));
});
