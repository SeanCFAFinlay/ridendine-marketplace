const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function generatedDoc(relativePath) {
  return exists(relativePath) ? read(relativePath) : '';
}

function obsidianVaultRoot() {
  return process.env.RIDENDINE_OBSIDIAN_VAULT ||
    'C:/RIDENDINE/Ridendine_Business_Bible_Obsidian_Vault/Ridendine_Business_Bible_Obsidian_Vault';
}

function obsidianDoc(relativePath) {
  const absolutePath = path.join(obsidianVaultRoot(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
}

function apiGuardSnapshotEvidence() {
  const snapshot = obsidianDoc('06 - Product and Technology/App Architecture/16 - Generated API Guard Snapshot.md');
  if (snapshot) {
    return { mode: 'snapshot', text: snapshot };
  }
  return { mode: 'generator', text: generatedDoc('scripts/docs/generate-api-guard-snapshot.ps1') };
}

function markdownRowsFor(text, token) {
  return text.split('\n').filter((line) => line.startsWith('| ') && line.includes(token));
}

function authIntentReviewFiles() {
  const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
  return missingReport
    .split('\n')
    .filter((line) => line.startsWith('| ') && line.includes('Runtime contract covers auth intent'))
    .map((line) => {
      const match = /\]\(\.\.\/\.\.\/([^)]+)\)/.exec(line);
      return match ? match[1].replace(/\\/g, '/') : null;
    })
    .filter(Boolean)
    .sort();
}

function walk(relativeDir, acc = []) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return acc;
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    if (['node_modules', '.next', 'dist', 'coverage'].includes(entry.name)) continue;
    const child = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, acc);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(child)) acc.push(child);
  }
  return acc;
}

const checks = [
  {
    name: 'runtime Supabase queries use canonical drivers table',
    pass: () => {
      const files = [...walk('apps'), ...walk('packages')];
      return files.every((file) => !read(file).includes(".from('driver_profiles')"));
    },
  },
  {
    name: 'chef legal and password reset routes exist',
    pass: () =>
      exists('apps/chef-admin/src/app/privacy/page.tsx') &&
      exists('apps/chef-admin/src/app/terms/page.tsx') &&
      exists('apps/chef-admin/src/app/auth/forgot-password/page.tsx'),
  },
  {
    name: 'driver legal routes exist',
    pass: () =>
      exists('apps/driver-app/src/app/privacy/page.tsx') &&
      exists('apps/driver-app/src/app/terms/page.tsx'),
  },
  {
    name: 'chef storefront setup route exists',
    pass: () => exists('apps/chef-admin/src/app/dashboard/storefront/setup/page.tsx'),
  },
  {
    name: 'driver upload API route exists',
    pass: () => exists('apps/driver-app/src/app/api/upload/route.ts'),
  },
  {
    name: 'chef public storefront links point at customer web',
    pass: () => {
      const source = read('apps/chef-admin/src/app/dashboard/page.tsx');
      return !source.includes('href={`/chefs/${storefront.slug}`}') &&
        source.includes('${WEB_BASE_URL}/chefs/${storefront.slug}') &&
        source.includes("process.env.NEXT_PUBLIC_APP_URL || 'https://ridendine.ca'");
    },
  },
  {
    name: 'wiring docs classify finance account detail pages as implemented',
    pass: () => {
      const routeInventory = generatedDoc('docs/wiring/ROUTE_INVENTORY.md');
      const chefRows = markdownRowsFor(routeInventory, '`/dashboard/finance/accounts/chefs/:id`');
      const driverRows = markdownRowsFor(routeInventory, '`/dashboard/finance/accounts/drivers/:id`');
      return chefRows.length === 1 &&
        driverRows.length === 1 &&
        chefRows[0].endsWith('| WIRED |') &&
        driverRows[0].endsWith('| WIRED |');
    },
  },
  {
    name: 'wiring docs do not mark known guarded API routes missing',
    pass: () => {
      const apiInventory = generatedDoc('docs/wiring/API_INVENTORY.md');
      const knownGuardedRoutes = [
        '`/api/deliveries/:id`',
        '`/api/engine/payouts/preview`',
        '`/api/internal/command-center/change-requests`',
        '`/api/payouts/request`',
      ];
      return knownGuardedRoutes.every((route) => {
        const routeRows = markdownRowsFor(apiInventory, route);
        return routeRows.length > 0 && routeRows.every((line) => !line.endsWith('| MISSING |'));
      });
    },
  },
  {
    name: 'wiring docs have no unexplained partial page or API statuses',
    pass: () => {
      const routeInventory = generatedDoc('docs/wiring/ROUTE_INVENTORY.md');
      const pageMatrix = generatedDoc('docs/wiring/PAGE_WIRING_MATRIX.md');
      const apiInventory = generatedDoc('docs/wiring/API_INVENTORY.md');
      const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
      return !markdownRowsFor(routeInventory, '| PARTIAL |').length &&
        !markdownRowsFor(pageMatrix, '| PARTIAL |').length &&
        !markdownRowsFor(apiInventory, '| PARTIAL |').length &&
        !missingReport.includes(' is partially wired') &&
        !missingReport.includes(' is partially detectable');
    },
  },
  {
    name: 'phase 9 runtime contracts cover every auth-intent review row',
    pass: () => {
      const { authIntentPages, publicJsonApis, protectedJsonApis } = require(path.join(root, 'scripts/smoke/runtime-contracts.cjs'));
      const reviewFiles = authIntentReviewFiles();
      const contractFiles = authIntentPages.map((contract) => contract.sourcePath).sort();
      const missingReport = generatedDoc('docs/wiring/MISSING_WIRING_REPORT.md');
      return reviewFiles.length === 17 &&
        JSON.stringify(reviewFiles) === JSON.stringify(contractFiles) &&
        !missingReport.includes('Auth requirement not detectable') &&
        publicJsonApis.length >= 7 &&
        protectedJsonApis.length >= 10;
    },
  },
  {
    name: 'phase 9 runtime contract docs are generated in all mirrors',
    pass: () =>
      exists('docs/wiring/RUNTIME_CONTRACT_SMOKE.md') &&
      exists('docs/architecture/codebase-map/wiring/RUNTIME_CONTRACT_SMOKE.md') &&
      exists('docs/obsidian/codebase-map/Runtime Contract Smoke.md'),
  },
  {
    name: 'phase 10 public read APIs are guard-classified as intentional public',
    pass: () => {
      const evidence = apiGuardSnapshotEvidence();
      const publicReadRoutes = [
        '/api/eta',
        '/api/storefronts',
        '/api/storefronts/[id]',
        '/api/storefronts/[id]/menu',
      ];
      if (evidence.mode === 'generator') {
        return publicReadRoutes.every((route) => evidence.text.includes(`'${route}'`)) &&
          evidence.text.includes('$intentionalPublicReadRoutes.Contains($Route)') &&
          evidence.text.includes("return 'Intentional public'") &&
          evidence.text.includes("return 'Review read-only'");
      }
      const snapshot = evidence.text;
      const fullMatrixRows = publicReadRoutes.map((route) => markdownRowsFor(snapshot, `\`${route}\``))
        .flat()
        .filter((line) => line.includes('| Customer marketplace |'));
      const reviewRows = publicReadRoutes.map((route) => markdownRowsFor(snapshot, `\`${route}\``))
        .flat()
        .filter((line) => line.includes('| Review read-only |'));
      return snapshot.includes('Api --> ReadOnly["Review read-only<br/>0"]') &&
        publicReadRoutes.every((route) =>
          fullMatrixRows.some((line) => line.includes(`\`${route}\``) && line.includes('| Intentional public |'))
        ) &&
        reviewRows.length === 0;
    },
  },
  {
    name: 'phase 11 high-risk Ops authorization contracts validate',
    pass: () => {
      const {
        contracts,
        validateContracts,
      } = require(path.join(root, 'scripts/audit/high-risk-ops-authz-contracts.cjs'));
      const result = validateContracts({ root });
      // Floor lowered 19 -> 16 when the five unscheduled /api/cron/* wrapper
      // routes were deleted (they duplicated the canonical processors and were
      // absent from vercel.json). Coverage of LIVE routes went up over the same
      // change: the reconciliation and retention processors were added. The
      // floor tracks contracts, and there are simply fewer routes to contract.
      return contracts.length >= 16 &&
        result.failures.length === 0 &&
        result.passed === contracts.length &&
        exists('docs/wiring/HIGH_RISK_OPS_AUTHZ.md') &&
        exists('docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_AUTHZ.md') &&
        exists('docs/obsidian/codebase-map/High Risk Ops Authorization.md');
    },
  },
  {
    name: 'phase 12 high-risk Ops negative authorization contracts validate',
    pass: () => {
      const {
        endpointNegativeContracts,
        validateNegativeContracts,
      } = require(path.join(root, 'scripts/audit/high-risk-ops-negative-authz.cjs'));
      const result = validateNegativeContracts();
      // Floor lowered 32 -> 27 alongside the phase 11 floor: nine cron-wrapper
      // rows removed with those routes, four added for the two new processors.
      return endpointNegativeContracts.length >= 27 &&
        result.failures.length === 0 &&
        result.passed === endpointNegativeContracts.length &&
        exists('docs/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md') &&
        exists('docs/architecture/codebase-map/wiring/HIGH_RISK_OPS_NEGATIVE_AUTHZ.md') &&
        exists('docs/obsidian/codebase-map/High Risk Ops Negative Authorization.md');
    },
  },
  {
    name: 'phase 13 Sean super-admin fixture contracts validate',
    pass: () => {
      const {
        fixtureContracts,
        validateFixtureContracts,
      } = require(path.join(root, 'scripts/audit/sean-super-admin-fixture.cjs'));
      const result = validateFixtureContracts({ root });
      return fixtureContracts.length >= 10 &&
        result.failures.length === 0 &&
        result.passed === fixtureContracts.length &&
        exists('docs/wiring/SEAN_SUPER_ADMIN_FIXTURE.md') &&
        exists('docs/architecture/codebase-map/wiring/SEAN_SUPER_ADMIN_FIXTURE.md') &&
        exists('docs/obsidian/codebase-map/Sean Super Admin Fixture.md');
    },
  },
  {
    name: 'phase 13 live role fixture smoke contracts are generated',
    pass: () => {
      const {
        liveRoleFixtureContracts,
      } = require(path.join(root, 'scripts/smoke/live-role-fixture-smoke.cjs'));
      return liveRoleFixtureContracts.length >= 23 &&
        liveRoleFixtureContracts.some((contract) => contract.app === 'chef') &&
        liveRoleFixtureContracts.every((contract) => contract.method === 'GET' && contract.liveSafe === true) &&
        exists('docs/wiring/LIVE_ROLE_FIXTURE_SMOKE.md') &&
        exists('docs/architecture/codebase-map/wiring/LIVE_ROLE_FIXTURE_SMOKE.md') &&
        exists('docs/obsidian/codebase-map/Live Role Fixture Smoke.md');
    },
  },
  {
    name: 'phase 15 non-admin role fixture smoke contracts are generated',
    pass: () => {
      const {
        credentialReadiness,
        nonAdminRoleFixtures,
        nonAdminRoleProbeContracts,
        runNonAdminRoleFixturePreflight,
        validateContracts,
      } = require(path.join(root, 'scripts/smoke/non-admin-role-fixture-smoke.cjs'));
      const result = validateContracts();
      const readiness = credentialReadiness({});
      const preflight = runNonAdminRoleFixturePreflight({ env: {}, requireAllRoles: true });
      const readinessDoc = generatedDoc('docs/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md');
      return nonAdminRoleFixtures.length >= 3 &&
        nonAdminRoleProbeContracts.length >= 12 &&
        result.failures.length === 0 &&
        readiness.roles.length === nonAdminRoleFixtures.length &&
        preflight.failures.includes('support_agent credentials are required') &&
        preflight.failures.includes('finance_manager credentials are required') &&
        preflight.failures.includes('ops_agent credentials are required') &&
        readinessDoc.includes('Credential Readiness') &&
        nonAdminRoleProbeContracts.every((contract) => contract.method === 'GET' && contract.liveSafe === true) &&
        nonAdminRoleProbeContracts.some((contract) => contract.expectedStatus === 200) &&
        nonAdminRoleProbeContracts.some((contract) => contract.expectedStatus === 403) &&
        exists('docs/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md') &&
        exists('docs/architecture/codebase-map/wiring/NON_ADMIN_ROLE_FIXTURE_SMOKE.md') &&
        exists('docs/obsidian/codebase-map/Non Admin Role Fixture Smoke.md');
    },
  },
  {
    name: 'phase 17 runtime coverage audit inventories discovered pages and API route files',
    pass: () => {
      const {
        collectRuntimeCoverage,
      } = require(path.join(root, 'scripts/smoke/runtime-coverage-audit.cjs'));
      const summary = collectRuntimeCoverage({ root });
      const doc = generatedDoc('docs/wiring/RUNTIME_COVERAGE_AUDIT.md');
      return summary.ok &&
        summary.totals.pages.total >= 90 &&
        summary.totals.apis.total >= 118 &&
        summary.totals.pages.covered === summary.totals.pages.total &&
        summary.totals.apis.covered === summary.totals.apis.total &&
        summary.totals.pages.proofCovered >= 89 &&
        summary.totals.apis.proofCovered >= 120 &&
        summary.gaps.pages.length === 0 &&
        summary.gaps.apis.length === 0 &&
        summary.proofGaps.pages.length === 1 &&
        summary.proofGaps.pages[0].route === '/checkout' &&
        summary.proofGaps.apis.length === 0 &&
        doc.includes('Phase 17 coverage inventory') &&
        doc.includes('Page Proof Gaps') &&
        doc.includes('API Proof Gaps') &&
        doc.includes('Proof Disposition Summary') &&
        summary.proofDisposition.pages.unresolved === 0 &&
        summary.proofDisposition.apis.unresolved === 0 &&
        doc.includes('Uncovered Pages') &&
        doc.includes('Uncovered API Route Files') &&
        exists('docs/wiring/RUNTIME_COVERAGE_AUDIT.md') &&
        exists('docs/architecture/codebase-map/wiring/RUNTIME_COVERAGE_AUDIT.md') &&
        exists('docs/obsidian/codebase-map/Runtime Coverage Audit.md');
    },
  },
  {
    name: 'phase 18/19 runtime surface classification covers every page and route handler',
    pass: () => {
      const {
        collectSurfaceClassifications,
      } = require(path.join(root, 'scripts/smoke/runtime-surface-classification.cjs'));
      const summary = collectSurfaceClassifications({ root });
      const doc = generatedDoc('docs/wiring/RUNTIME_SURFACE_CLASSIFICATION.md');
      return summary.ok &&
        summary.pageTotals.total >= 90 &&
        summary.apiTotals.total >= 118 &&
        summary.pageTotals.classified === summary.pageTotals.total &&
        summary.apiTotals.classified === summary.apiTotals.total &&
        summary.failures.length === 0 &&
        doc.includes('Runtime Surface Classification') &&
        doc.includes('Page Surface Classification') &&
        doc.includes('API Route Handler Classification') &&
        exists('docs/wiring/RUNTIME_SURFACE_CLASSIFICATION.md') &&
        exists('docs/architecture/codebase-map/wiring/RUNTIME_SURFACE_CLASSIFICATION.md') &&
        exists('docs/obsidian/codebase-map/Runtime Surface Classification.md');
    },
  },
  {
    name: 'phase 20/21 runtime proof disposition resolves every remaining proof gap',
    pass: () => {
      const {
        collectProofDisposition,
      } = require(path.join(root, 'scripts/smoke/runtime-proof-disposition.cjs'));
      const summary = collectProofDisposition({ root });
      const doc = generatedDoc('docs/wiring/RUNTIME_PROOF_DISPOSITION.md');
      return summary.ok &&
        summary.pageTotals.total >= 90 &&
        summary.apiTotals.total >= 118 &&
        summary.pageTotals.proofCovered >= 17 &&
        summary.apiTotals.proofCovered >= 20 &&
        summary.pageTotals.dispositionedGaps === summary.pageTotals.proofGaps &&
        summary.apiTotals.dispositionedGaps === summary.apiTotals.proofGaps &&
        summary.pageTotals.unresolved === 0 &&
        summary.apiTotals.unresolved === 0 &&
        doc.includes('Runtime Proof Disposition') &&
        doc.includes('Page Proof Gap Disposition') &&
        doc.includes('API Proof Gap Disposition') &&
        exists('docs/wiring/RUNTIME_PROOF_DISPOSITION.md') &&
        exists('docs/architecture/codebase-map/wiring/RUNTIME_PROOF_DISPOSITION.md') &&
        exists('docs/obsidian/codebase-map/Runtime Proof Disposition.md');
    },
  },
];

const failures = checks.filter((check) => !check.pass());

if (failures.length) {
  console.error('Known wiring fix checks failed:');
  for (const failure of failures) console.error(`- ${failure.name}`);
  process.exit(1);
}

console.log(`Known wiring fix checks passed: ${checks.length}/${checks.length}`);
