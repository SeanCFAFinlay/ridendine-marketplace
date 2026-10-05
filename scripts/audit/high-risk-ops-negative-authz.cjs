const fs = require('fs');
const path = require('path');

const {
  contracts: phase11Contracts,
} = require('./high-risk-ops-authz-contracts.cjs');

const root = process.cwd();

const PLATFORM_CAPABILITIES = new Set([
  'finance_engine',
  'finance_refunds_read',
  'finance_refunds_request',
  'finance_refunds_sensitive',
  'finance_payouts',
  'dispatch_read',
  'dispatch_write',
  'team_manage',
]);

const NON_PLATFORM_DENIED = ['customer', 'chef_user', 'driver'];
const FINANCE_DENIED = [
  'ops_admin',
  'ops_manager',
  'ops_agent',
  'support_agent',
  ...NON_PLATFORM_DENIED,
];
const DISPATCH_DENIED = [
  'finance_admin',
  'finance_manager',
  'support_agent',
  ...NON_PLATFORM_DENIED,
];
const REFUND_REQUEST_DENIED = ['support_agent', ...NON_PLATFORM_DENIED];
const TEAM_MANAGE_DENIED = [
  'ops_admin',
  'ops_manager',
  'ops_agent',
  'finance_admin',
  'finance_manager',
  'support_agent',
  ...NON_PLATFORM_DENIED,
];

const DENIED_ROLES_BY_CAPABILITY = {
  finance_engine: FINANCE_DENIED,
  finance_refunds_read: FINANCE_DENIED,
  finance_refunds_sensitive: FINANCE_DENIED,
  finance_refunds_request: REFUND_REQUEST_DENIED,
  finance_payouts: FINANCE_DENIED,
  dispatch_read: DISPATCH_DENIED,
  dispatch_write: DISPATCH_DENIED,
  team_manage: TEAM_MANAGE_DENIED,
};

const PROCESSOR_DENIED_HEADER_CASES = [
  { name: 'missing processor headers', headers: {}, status: 401 },
  { name: 'wrong bearer token', headers: { authorization: 'Bearer wrong-token' }, status: 401 },
  { name: 'wrong x-processor-token', headers: { 'x-processor-token': 'wrong-token' }, status: 401 },
];

function platform(route, method, capability, area) {
  return {
    area,
    route,
    method,
    guard: 'platform',
    capability,
    unauthenticatedStatus: 401,
    deniedRoles: DENIED_ROLES_BY_CAPABILITY[capability],
  };
}

function processor(route, method, area) {
  return {
    area,
    route,
    method,
    guard: 'processor',
    tokenValidator: 'validateEngineProcessorHeaders',
    deniedHeaderCases: PROCESSOR_DENIED_HEADER_CASES,
  };
}

function commandCenter(route, method) {
  return {
    area: 'Internal command center',
    route,
    method,
    guard: 'command_center',
    capability: 'team_manage',
    envGate: 'INTERNAL_COMMAND_CENTER_ENABLED',
    disabledEnvStatus: 403,
    unauthenticatedStatus: 401,
    deniedRoles: TEAM_MANAGE_DENIED,
  };
}

function stripeSignature(route, method) {
  return {
    area: 'Stripe finance webhook',
    route,
    method,
    guard: 'stripe_signature',
    requiredHeader: 'stripe-signature',
    deniedSignatureCases: [
      { name: 'missing stripe-signature', status: 400 },
      { name: 'invalid stripe-signature', status: 400 },
    ],
  };
}

const endpointNegativeContracts = [
  platform('/api/engine/dispatch', 'GET', 'dispatch_read', 'Dispatch'),
  platform('/api/engine/dispatch', 'POST', 'dispatch_write', 'Dispatch'),
  platform('/api/engine/dispatch/offer-history', 'GET', 'dispatch_read', 'Dispatch'),

  platform('/api/engine/finance', 'GET', 'finance_engine', 'Finance'),
  platform('/api/engine/finance', 'POST', 'finance_engine', 'Finance'),

  platform('/api/engine/refunds', 'GET', 'finance_refunds_read', 'Refunds'),
  platform('/api/engine/refunds', 'POST', 'finance_refunds_request', 'Refunds'),

  platform('/api/engine/payouts', 'GET', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts', 'POST', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts/preview', 'POST', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts/execute', 'POST', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts/instant', 'GET', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts/instant/[id]', 'POST', 'finance_payouts', 'Payouts'),
  platform('/api/engine/payouts/instant/[id]', 'DELETE', 'finance_payouts', 'Payouts'),

  processor('/api/engine/processors/expired-offers', 'GET', 'Processor'),
  processor('/api/engine/processors/expired-offers', 'POST', 'Processor'),
  processor('/api/engine/processors/reconciliation', 'GET', 'Processor'),
  processor('/api/engine/processors/reconciliation', 'POST', 'Processor'),
  processor('/api/engine/processors/retention', 'GET', 'Processor'),
  processor('/api/engine/processors/retention', 'POST', 'Processor'),
  processor('/api/engine/processors/sla', 'GET', 'Processor'),
  processor('/api/engine/processors/sla', 'POST', 'Processor'),


  commandCenter('/api/internal/command-center/change-requests', 'GET'),
  commandCenter('/api/internal/command-center/change-requests', 'POST'),
  commandCenter('/api/internal/command-center/change-requests', 'PATCH'),

  platform('/api/orders/[id]/refund', 'POST', 'finance_refunds_sensitive', 'Order refund'),

  stripeSignature('/api/stripe/webhook', 'POST'),
];

function keyFor(route, method) {
  return `${method.toUpperCase()} ${route}`;
}

function phase11MethodRows() {
  return phase11Contracts.flatMap((contract) =>
    contract.methods.map((methodContract) => ({
      area: contract.area,
      route: contract.route,
      file: contract.file,
      method: methodContract.method,
      tokens: [
        ...(contract.tokens || []),
        ...(methodContract.tokens || []),
      ],
    }))
  );
}

function pushFailure(failures, contract, detail) {
  failures.push({
    route: contract.route,
    method: contract.method,
    guard: contract.guard,
    ...detail,
  });
}

function validateNegativeContracts() {
  const failures = [];
  const rows = phase11MethodRows();
  const phase11Keys = new Set(rows.map((row) => keyFor(row.route, row.method)));
  const seenKeys = new Set();

  for (const contract of endpointNegativeContracts) {
    const key = keyFor(contract.route, contract.method);
    if (seenKeys.has(key)) {
      pushFailure(failures, contract, { reason: 'duplicate_contract' });
    }
    seenKeys.add(key);

    if (!phase11Keys.has(key)) {
      pushFailure(failures, contract, { reason: 'not_in_phase_11_contracts' });
    }

    if (contract.guard === 'platform') {
      if (!contract.capability || !PLATFORM_CAPABILITIES.has(contract.capability)) {
        pushFailure(failures, contract, { reason: 'invalid_platform_capability' });
      }
      if (contract.unauthenticatedStatus !== 401) {
        pushFailure(failures, contract, { reason: 'missing_401_unauthenticated_case' });
      }
      if (!Array.isArray(contract.deniedRoles) || contract.deniedRoles.length < 3) {
        pushFailure(failures, contract, { reason: 'insufficient_denied_role_fixtures' });
      }
      const phase11Row = rows.find((row) => keyFor(row.route, row.method) === key);
      if (phase11Row && !phase11Row.tokens.includes(contract.capability)) {
        pushFailure(failures, contract, { reason: 'capability_not_in_phase_11_method', capability: contract.capability });
      }
    }

    if (contract.guard === 'processor') {
      if (contract.tokenValidator !== 'validateEngineProcessorHeaders') {
        pushFailure(failures, contract, { reason: 'missing_processor_validator' });
      }
      if (!Array.isArray(contract.deniedHeaderCases) || contract.deniedHeaderCases.length < 3) {
        pushFailure(failures, contract, { reason: 'insufficient_processor_denial_cases' });
      }
      for (const deniedCase of contract.deniedHeaderCases || []) {
        if (deniedCase.status !== 401) {
          pushFailure(failures, contract, { reason: 'processor_denial_status_not_401', caseName: deniedCase.name });
        }
      }
    }

    if (contract.guard === 'command_center') {
      if (contract.envGate !== 'INTERNAL_COMMAND_CENTER_ENABLED' || contract.disabledEnvStatus !== 403) {
        pushFailure(failures, contract, { reason: 'missing_command_center_env_gate' });
      }
      if (contract.capability !== 'team_manage') {
        pushFailure(failures, contract, { reason: 'command_center_missing_team_manage' });
      }
      if (!Array.isArray(contract.deniedRoles) || !contract.deniedRoles.includes('ops_admin')) {
        pushFailure(failures, contract, { reason: 'command_center_missing_denied_roles' });
      }
    }

    if (contract.guard === 'stripe_signature') {
      if (contract.requiredHeader !== 'stripe-signature') {
        pushFailure(failures, contract, { reason: 'missing_stripe_signature_header' });
      }
      const cases = contract.deniedSignatureCases || [];
      if (!cases.some((entry) => entry.name === 'missing stripe-signature' && entry.status === 400)) {
        pushFailure(failures, contract, { reason: 'missing_stripe_signature_missing_case' });
      }
      if (!cases.some((entry) => entry.name === 'invalid stripe-signature' && entry.status === 400)) {
        pushFailure(failures, contract, { reason: 'missing_stripe_signature_invalid_case' });
      }
    }
  }

  for (const row of rows) {
    const key = keyFor(row.route, row.method);
    if (!seenKeys.has(key)) {
      failures.push({
        route: row.route,
        method: row.method,
        guard: '-',
        reason: 'phase_11_method_missing_negative_contract',
      });
    }
  }

  return {
    endpointNegativeContracts,
    phase11MethodRows: rows,
    failures,
    passed: endpointNegativeContracts.length - new Set(failures.map((failure) => keyFor(failure.route, failure.method))).size,
    generatedAt: new Date().toISOString(),
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function denialSummary(contract) {
  if (contract.guard === 'platform') {
    return `401 unauthenticated; 403 denied roles: ${contract.deniedRoles.join(', ')}`;
  }
  if (contract.guard === 'processor') {
    return `401 via ${contract.tokenValidator}: ${contract.deniedHeaderCases.map((entry) => entry.name).join(', ')}`;
  }
  if (contract.guard === 'command_center') {
    return `403 when ${contract.envGate} disabled; 401 unauthenticated; 403 denied roles: ${contract.deniedRoles.join(', ')}`;
  }
  if (contract.guard === 'stripe_signature') {
    return contract.deniedSignatureCases.map((entry) => `${entry.status} ${entry.name}`).join(', ');
  }
  return '-';
}

function generateMarkdown(result = validateNegativeContracts()) {
  const rows = endpointNegativeContracts.map((contract) => {
    const failed = result.failures.some((failure) => keyFor(failure.route, failure.method) === keyFor(contract.route, contract.method));
    return `| ${failed ? 'FAIL' : 'PASS'} | ${escapeCell(contract.area)} | \`${escapeCell(contract.method)}\` | \`${escapeCell(contract.route)}\` | ${escapeCell(contract.guard)} | ${escapeCell(contract.capability || contract.tokenValidator || contract.requiredHeader)} | ${escapeCell(denialSummary(contract))} |`;
  });

  const failureRows = result.failures.length
    ? result.failures
        .map((failure) =>
          `| \`${escapeCell(failure.method)}\` | \`${escapeCell(failure.route)}\` | ${escapeCell(failure.guard)} | ${escapeCell(failure.reason)} | ${escapeCell(failure.capability || failure.caseName || '-')} |`
        )
        .join('\n')
    : 'None found.';

  return `# High-Risk Ops Negative Authorization

Generated: ${result.generatedAt}

This generated audit documents endpoint-level denial expectations for the high-risk Ops/control-plane routes covered by Phase 11. It proves every contracted route method has an explicit negative authorization model for unauthenticated access, denied platform roles, invalid processor tokens, disabled command-center access, or invalid Stripe signatures.

## Summary

| Metric | Count |
|---|---:|
| Phase 11 method rows | ${result.phase11MethodRows.length} |
| Negative authorization contracts | ${endpointNegativeContracts.length} |
| Passed contracts | ${result.passed} |
| Failed checks | ${result.failures.length} |

## Denial Matrix

| Status | Area | Method | Route | Guard | Required guard/capability | Denial expectations |
|---|---|---|---|---|---|---|
${rows.join('\n')}

## Failures

${failureRows}
`;
}

function writeFileEnsured(relativePath, content, repoRoot = root) {
  const absolutePath = path.join(repoRoot, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, 'utf8');
}

function writeDocs(result = validateNegativeContracts(), options = {}) {
  const repoRoot = options.root || root;
  const markdown = generateMarkdown(result);
  const outputs = [
    'docs/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md',
    'docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md',
    'docs/obsidian/codebase-map/High Risk Ops Negative Authorization.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

if (require.main === module) {
  const result = validateNegativeContracts();
  if (result.failures.length) {
    console.error('High-risk Ops negative authorization contract failures:');
    for (const failure of result.failures) {
      const detail = failure.capability || failure.caseName || '';
      console.error(`- ${failure.method} ${failure.route}: ${failure.reason}${detail ? ` ${detail}` : ''}`);
    }
    process.exit(1);
  }

  writeDocs(result);
  console.log(`High-risk Ops negative authorization contracts passed: ${result.passed}/${endpointNegativeContracts.length}`);
}

module.exports = {
  endpointNegativeContracts,
  validateNegativeContracts,
  generateMarkdown,
  writeDocs,
};
