const fs = require('fs');
const path = require('path');

const root = process.cwd();

function method(method, tokens) {
  return { method, tokens };
}

const contracts = [
  {
    area: 'Dispatch',
    route: '/api/engine/dispatch',
    file: 'apps/ops-admin/src/app/api/engine/dispatch/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi'],
    methods: [
      method('GET', ['getOpsActorContext', 'guardPlatformApi', 'dispatch_read']),
      method('POST', ['getOpsActorContext', 'guardPlatformApi', 'dispatch_write']),
    ],
  },
  {
    area: 'Dispatch',
    route: '/api/engine/dispatch/offer-history',
    file: 'apps/ops-admin/src/app/api/engine/dispatch/offer-history/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi'],
    methods: [method('GET', ['getOpsActorContext', 'guardPlatformApi', 'dispatch_read'])],
  },
  {
    area: 'Finance',
    route: '/api/engine/finance',
    file: 'apps/ops-admin/src/app/api/engine/finance/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_engine'],
    methods: [
      method('GET', ['getOpsActorContext', 'guardPlatformApi', 'finance_engine']),
      method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_engine']),
    ],
  },
  {
    area: 'Refunds',
    route: '/api/engine/refunds',
    file: 'apps/ops-admin/src/app/api/engine/refunds/route.ts',
    tokens: [
      'getOpsActorContext',
      'guardPlatformApi',
      'finance_refunds_read',
      'finance_refunds_request',
      'finance_refunds_sensitive',
    ],
    methods: [
      method('GET', ['getOpsActorContext', 'guardPlatformApi', 'finance_refunds_read']),
      method('POST', [
        'getOpsActorContext',
        'guardPlatformApi',
        'finance_refunds_request',
        'finance_refunds_sensitive',
      ]),
    ],
  },
  {
    area: 'Payouts',
    route: '/api/engine/payouts',
    file: 'apps/ops-admin/src/app/api/engine/payouts/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'],
    methods: [
      method('GET', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts']),
      method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts']),
    ],
  },
  {
    area: 'Payouts',
    route: '/api/engine/payouts/preview',
    file: 'apps/ops-admin/src/app/api/engine/payouts/preview/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'],
    methods: [method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'])],
  },
  {
    area: 'Payouts',
    route: '/api/engine/payouts/execute',
    file: 'apps/ops-admin/src/app/api/engine/payouts/execute/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'],
    methods: [method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'])],
  },
  {
    area: 'Payouts',
    route: '/api/engine/payouts/instant',
    file: 'apps/ops-admin/src/app/api/engine/payouts/instant/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'],
    methods: [method('GET', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'])],
  },
  {
    area: 'Payouts',
    route: '/api/engine/payouts/instant/[id]',
    file: 'apps/ops-admin/src/app/api/engine/payouts/instant/[id]/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts'],
    methods: [
      method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts']),
      method('DELETE', ['getOpsActorContext', 'guardPlatformApi', 'finance_payouts']),
    ],
  },
  {
    area: 'Processor',
    route: '/api/engine/processors/expired-offers',
    file: 'apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts',
    tokens: ['validateEngineProcessorHeaders'],
    methods: [
      method('GET', ['validateEngineProcessorHeaders']),
      method('POST', ['validateEngineProcessorHeaders']),
    ],
  },
  {
    area: 'Processor',
    route: '/api/engine/processors/reconciliation',
    file: 'apps/ops-admin/src/app/api/engine/processors/reconciliation/route.ts',
    tokens: ['validateEngineProcessorHeaders'],
    methods: [
      method('GET', ['validateEngineProcessorHeaders']),
      method('POST', ['validateEngineProcessorHeaders']),
    ],
  },
  {
    area: 'Processor',
    route: '/api/engine/processors/retention',
    file: 'apps/ops-admin/src/app/api/engine/processors/retention/route.ts',
    tokens: ['validateEngineProcessorHeaders'],
    methods: [
      method('GET', ['validateEngineProcessorHeaders']),
      method('POST', ['validateEngineProcessorHeaders']),
    ],
  },
  {
    area: 'Processor',
    route: '/api/engine/processors/sla',
    file: 'apps/ops-admin/src/app/api/engine/processors/sla/route.ts',
    tokens: ['validateEngineProcessorHeaders'],
    methods: [
      method('GET', ['validateEngineProcessorHeaders']),
      method('POST', ['validateEngineProcessorHeaders']),
    ],
  },
  {
    area: 'Internal command center',
    route: '/api/internal/command-center/change-requests',
    file: 'apps/ops-admin/src/app/api/internal/command-center/change-requests/route.ts',
    tokens: ['INTERNAL_COMMAND_CENTER_ENABLED', 'getOpsActorContext', 'guardPlatformApi', 'team_manage'],
    methods: [
      method('GET', ['guardCommandCenter()']),
      method('POST', ['guardCommandCenter()']),
      method('PATCH', ['guardCommandCenter()']),
    ],
  },
  {
    area: 'Order refund',
    route: '/api/orders/[id]/refund',
    file: 'apps/ops-admin/src/app/api/orders/[id]/refund/route.ts',
    tokens: ['getOpsActorContext', 'guardPlatformApi', 'finance_refunds_sensitive'],
    methods: [method('POST', ['getOpsActorContext', 'guardPlatformApi', 'finance_refunds_sensitive'])],
  },
  {
    area: 'Stripe finance webhook',
    route: '/api/stripe/webhook',
    file: 'apps/ops-admin/src/app/api/stripe/webhook/route.ts',
    tokens: ['stripe-signature', 'webhooks.constructEvent', 'webhookSecret'],
    methods: [method('POST', ['stripe-signature', 'webhooks.constructEvent', 'webhookSecret'])],
  },
];

function read(relativePath, repoRoot = root) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function methodBody(source, httpMethod) {
  const startPattern = new RegExp(`export\\s+(?:async\\s+)?function\\s+${httpMethod}\\b|export\\s+const\\s+${httpMethod}\\b`);
  const startMatch = startPattern.exec(source);
  if (!startMatch) return null;

  const rest = source.slice(startMatch.index);
  const nextPattern = /\nexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b|\nexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g;
  const nextMatch = nextPattern.exec(rest.slice(1));
  return nextMatch ? rest.slice(0, nextMatch.index + 1) : rest;
}

function pushFailure(failures, contract, detail) {
  failures.push({
    area: contract.area,
    route: contract.route,
    file: contract.file,
    ...detail,
  });
}

function validateContracts(options = {}) {
  const repoRoot = options.root || root;
  const failures = [];

  for (const contract of contracts) {
    const absolutePath = path.join(repoRoot, contract.file);
    if (!fs.existsSync(absolutePath)) {
      pushFailure(failures, contract, { reason: 'file_missing' });
      continue;
    }

    const source = read(contract.file, repoRoot);
    for (const token of contract.tokens || []) {
      if (!source.includes(token)) {
        pushFailure(failures, contract, { reason: 'file_token_missing', token });
      }
    }

    for (const methodContract of contract.methods || []) {
      const body = methodBody(source, methodContract.method);
      if (!body) {
        pushFailure(failures, contract, {
          reason: 'method_missing',
          method: methodContract.method,
        });
        continue;
      }

      for (const token of methodContract.tokens || []) {
        if (!body.includes(token)) {
          pushFailure(failures, contract, {
            reason: 'method_token_missing',
            method: methodContract.method,
            token,
          });
        }
      }
    }
  }

  return {
    contracts,
    failures,
    passed: contracts.length - new Set(failures.map((failure) => failure.file)).size,
    generatedAt: new Date().toISOString(),
  };
}

function escapeCell(value) {
  return String(value ?? '-').replace(/\|/g, '\\|');
}

function generateMarkdown(result = validateContracts()) {
  const rows = contracts.map((contract) => {
    const status = result.failures.some((failure) => failure.file === contract.file) ? 'FAIL' : 'PASS';
    const methods = contract.methods.map((entry) => entry.method).join(', ');
    const tokens = [
      ...(contract.tokens || []),
      ...contract.methods.flatMap((entry) => entry.tokens || []),
    ];
    const uniqueTokens = [...new Set(tokens)].join(', ');
    return `| ${escapeCell(status)} | ${escapeCell(contract.area)} | \`${escapeCell(contract.route)}\` | \`${escapeCell(contract.file)}\` | ${escapeCell(methods)} | ${escapeCell(uniqueTokens)} |`;
  });

  const failureRows = result.failures.length
    ? result.failures
        .map((failure) =>
          `| ${escapeCell(failure.area)} | \`${escapeCell(failure.route)}\` | \`${escapeCell(failure.file)}\` | ${escapeCell(failure.method || '-')} | ${escapeCell(failure.reason)} | ${escapeCell(failure.token || '-')} |`
        )
        .join('\n')
    : 'None found.';

  return `# High-Risk Ops Authorization Contracts

Generated: ${result.generatedAt}

This generated audit documents static authorization contracts for high-risk Ops/control-plane routes. It does not change route behavior; it fails if a route drops its expected actor context, capability guard, processor token validation, Stripe signature validation, or internal command-center gate.

## Summary

| Metric | Count |
|---|---:|
| Contracted route files | ${contracts.length} |
| Passed route files | ${result.passed} |
| Failed checks | ${result.failures.length} |

## Contract Matrix

| Status | Area | Route | File | Methods | Required tokens |
|---|---|---|---|---|---|
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

function writeDocs(result = validateContracts(), options = {}) {
  const repoRoot = options.root || root;
  const markdown = generateMarkdown(result);
  const outputs = [
    'docs/wiring/HIGH_RISK_OPS_AUTHZ.md',
    'docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_AUTHZ.md',
    'docs/obsidian/codebase-map/High Risk Ops Authorization.md',
  ];
  for (const output of outputs) writeFileEnsured(output, markdown, repoRoot);
  return outputs;
}

if (require.main === module) {
  const result = validateContracts();
  if (result.failures.length) {
    console.error('High-risk Ops authorization contract failures:');
    for (const failure of result.failures) {
      const methodText = failure.method ? ` ${failure.method}` : '';
      const tokenText = failure.token ? ` missing ${failure.token}` : '';
      console.error(`- ${failure.file}${methodText}: ${failure.reason}${tokenText}`);
    }
    process.exit(1);
  }

  writeDocs(result);
  console.log(`High-risk Ops authorization contracts passed: ${result.passed}/${contracts.length}`);
}

module.exports = {
  contracts,
  validateContracts,
  generateMarkdown,
  writeDocs,
};
