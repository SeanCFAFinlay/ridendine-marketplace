const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '../..');

test('dispositions every remaining page proof gap', () => {
  const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
  const summary = collectProofDisposition({ root: repoRoot });

  assert.equal(summary.pageTotals.total, 101);
  assert.equal(summary.pageTotals.proofCovered, 100);
  assert.equal(summary.pageTotals.dispositionedGaps, 1);
  assert.equal(summary.pageTotals.unresolved, 0);

  const chefLogin = summary.pages.find((page) => page.app === 'chef' && page.route === '/auth/login');
  assert.equal(chefLogin.proofCovered, true);
  assert.equal(chefLogin.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(chefLogin.proofDisposition.recommendedProofAction, 'public-page-smoke');

  const opsDashboard = summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard');
  assert.equal(opsDashboard.proofCovered, true);
  assert.equal(opsDashboard.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(opsDashboard.proofDisposition.recommendedProofAction, 'login-guard-page-smoke');

  const opsCustomerDetail = summary.pages.find((page) => page.app === 'ops' && page.route === '/dashboard/customers/[id]');
  assert.equal(opsCustomerDetail.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(opsCustomerDetail.proofDisposition.recommendedProofAction, 'sampled-login-guard-page-smoke');

  const checkout = summary.pages.find((page) => page.app === 'customer' && page.route === '/checkout');
  assert.equal(checkout.proofCovered, false);
  assert.equal(checkout.proofDisposition.nextProofAction, 'public-shell-and-auth-action-smoke');
});

test('dispositions every remaining API proof gap', () => {
  const { collectProofDisposition } = require('./runtime-proof-disposition.cjs');
  const summary = collectProofDisposition({ root: repoRoot });

  assert.equal(summary.apiTotals.total, 172);
  assert.equal(summary.apiTotals.proofCovered, 172);
  assert.equal(summary.apiTotals.dispositionedGaps, 0);
  assert.equal(summary.apiTotals.unresolved, 0);

  const customerLogin = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/auth/login');
  assert.equal(customerLogin.proofCovered, true);
  assert.equal(customerLogin.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(customerLogin.proofDisposition.recommendedProofAction, 'auth-entry-contract');

  const stripeWebhook = summary.apis.find((api) => api.app === 'ops' && api.endpoint === '/api/stripe/webhook');
  assert.equal(stripeWebhook.proofCovered, true);
  assert.equal(stripeWebhook.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(stripeWebhook.proofDisposition.recommendedProofAction, 'signature-contract');

  const checkout = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/checkout');
  assert.equal(checkout.proofCovered, true);
  assert.equal(checkout.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(checkout.proofDisposition.recommendedProofAction, 'negative-authz-contract');

  const ticketDetail = summary.apis.find((api) => api.app === 'customer' && api.endpoint === '/api/support/tickets/[id]');
  assert.equal(ticketDetail.proofCovered, true);
  assert.equal(ticketDetail.proofDisposition.nextProofAction, 'already-covered');
  assert.equal(ticketDetail.proofDisposition.recommendedProofAction, 'sampled-authenticated-json-smoke');
});

test('generates markdown proof disposition docs with zero unresolved gaps', () => {
  const {
    collectProofDisposition,
    generateMarkdown,
  } = require('./runtime-proof-disposition.cjs');
  const markdown = generateMarkdown(collectProofDisposition({ root: repoRoot }));

  assert.ok(markdown.includes('# Runtime Proof Disposition'));
  assert.ok(markdown.includes('| Pages | 101 | 100 | 1 | 1 | 0 |'));
  assert.ok(markdown.includes('| API route handlers | 172 | 172 | 0 | 0 | 0 |'));
  assert.ok(markdown.includes('## Page Proof Gap Disposition'));
  assert.ok(markdown.includes('## API Proof Gap Disposition'));
});
