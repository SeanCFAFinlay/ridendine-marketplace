// Coverage floors were lowered when the five unscheduled /api/cron/* wrapper
// routes were deleted; two new processor contracts were added over the same
// change, so coverage of routes that actually exist increased.
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  contracts,
  validateContracts,
  generateMarkdown,
} = require('./high-risk-ops-authz-contracts.cjs');

test('declares high-risk Ops authorization contracts for critical route families', () => {
  assert.ok(contracts.length >= 16, `expected at least 16 contracts, got ${contracts.length}`);

  const combined = JSON.stringify(contracts);
  for (const token of [
    'dispatch_read',
    'dispatch_write',
    'finance_engine',
    'finance_refunds_read',
    'finance_refunds_request',
    'finance_refunds_sensitive',
    'finance_payouts',
    'validateEngineProcessorHeaders',
    'INTERNAL_COMMAND_CENTER_ENABLED',
    'team_manage',
    'stripe-signature',
    'webhooks.constructEvent',
    'webhookSecret',
  ]) {
    assert.ok(combined.includes(token), `missing contract token ${token}`);
  }
});

test('current high-risk Ops route files satisfy authorization contracts', () => {
  const result = validateContracts();
  assert.deepEqual(result.failures, []);
  assert.equal(result.passed, contracts.length);
});

test('renders markdown documentation for the contracts', () => {
  const markdown = generateMarkdown(validateContracts());
  assert.ok(markdown.includes('# High-Risk Ops Authorization Contracts'));
  assert.ok(markdown.includes('finance_payouts'));
  assert.ok(markdown.includes('validateEngineProcessorHeaders'));
  assert.ok(markdown.includes('stripe-signature'));
});
