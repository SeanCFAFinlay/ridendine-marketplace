// Coverage floors were lowered when the five unscheduled /api/cron/* wrapper
// routes were deleted; two new processor contracts were added over the same
// change, so coverage of routes that actually exist increased.
const test = require('node:test');
const assert = require('node:assert/strict');

test('declares negative authorization contracts for every high-risk Phase 11 method', () => {
  const {
    endpointNegativeContracts,
    validateNegativeContracts,
  } = require('./high-risk-ops-negative-authz.cjs');

  const result = validateNegativeContracts();
  assert.equal(result.failures.length, 0);
  assert.ok(endpointNegativeContracts.length >= 27);
});

test('documents platform, processor, command-center, and Stripe denial models', () => {
  const {
    endpointNegativeContracts,
    generateMarkdown,
  } = require('./high-risk-ops-negative-authz.cjs');

  assert.ok(endpointNegativeContracts.some((contract) => contract.guard === 'platform'));
  assert.ok(endpointNegativeContracts.some((contract) => contract.guard === 'processor'));
  assert.ok(endpointNegativeContracts.some((contract) => contract.guard === 'command_center'));
  assert.ok(endpointNegativeContracts.some((contract) => contract.guard === 'stripe_signature'));

  const markdown = generateMarkdown();
  assert.ok(markdown.includes('finance_payouts'));
  assert.ok(markdown.includes('validateEngineProcessorHeaders'));
  assert.ok(markdown.includes('stripe-signature'));
  assert.ok(markdown.includes('INTERNAL_COMMAND_CENTER_ENABLED'));
});
