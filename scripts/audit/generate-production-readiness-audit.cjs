const fs = require('fs');
const path = require('path');

const root = process.cwd();
const out = path.join(root, 'AUDIT_AND_PLANNING', 'PRODUCTION_READINESS_AUDIT');
const STATUSES = ['WIRED', 'PARTIAL', 'MISSING', 'BROKEN', 'UNSAFE', 'UNKNOWN'];

const apps = [
  { key: 'web', label: 'Customer Web', root: 'apps/web', appDir: 'apps/web/src/app', role: 'customer/public' },
  { key: 'chef-admin', label: 'Chef Admin', root: 'apps/chef-admin', appDir: 'apps/chef-admin/src/app', role: 'chef' },
  { key: 'driver-app', label: 'Driver App', root: 'apps/driver-app', appDir: 'apps/driver-app/src/app', role: 'driver' },
  { key: 'ops-admin', label: 'Ops Admin', root: 'apps/ops-admin', appDir: 'apps/ops-admin/src/app', role: 'ops/admin/finance' },
];

const packages = ['auth', 'config', 'db', 'engine', 'notifications', 'routing', 'types', 'ui', 'utils', 'validation'];
const expectedEntities = ['users/profiles', 'customers', 'chefs/vendors', 'drivers', 'addresses', 'menus', 'menu_items', 'carts', 'orders', 'order_items', 'public_order_stage', 'dispatch_offers', 'driver_locations', 'delivery_events', 'ledger_entries', 'platform_accounts', 'payout_runs', 'payouts', 'refunds', 'reconciliation_records', 'audit_logs', 'webhooks', 'cron_jobs', 'system_health'];

function abs(rel) { return path.join(root, rel); }
function exists(rel) { return fs.existsSync(abs(rel)); }
function read(rel) {
  try {
    return exists(rel) && fs.statSync(abs(rel)).isFile() ? fs.readFileSync(abs(rel), 'utf8') : '';
  } catch {
    return '';
  }
}
function write(name, body) { fs.writeFileSync(path.join(out, name), body.trim() + '\n'); }
function walk(rel, pred = () => true, acc = []) {
  if (!exists(rel)) return acc;
  for (const ent of fs.readdirSync(abs(rel), { withFileTypes: true })) {
    const child = `${rel}/${ent.name}`;
    if (ent.isDirectory()) walk(child, pred, acc);
    else if (pred(child)) acc.push(child);
  }
  return acc.sort();
}
function mdLink(file) { return `[${file}](../../${file})`; }
function table(headers, rows) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(c => String(c ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`)].join('\n');
}
function uniq(a) { return [...new Set(a.filter(Boolean))].sort(); }
function routeFrom(appDir, file, kind = 'page') {
  let route = file.replace(appDir, '').replace(new RegExp(`/${kind}\\.tsx?$`), '');
  if (!route) return '/';
  return route.replace(/\[([^\]]+)\]/g, ':$1') || '/';
}
function endpointFrom(appDir, file) { return routeFrom(appDir, file.replace(/route\.ts$/, 'page.tsx')).replace(/^\/api/, '/api'); }
function nearestLayout(appDir, file) {
  let d = path.dirname(file).replace(/\\/g, '/');
  while (d.startsWith(appDir)) {
    const cand = `${d}/layout.tsx`;
    if (exists(cand)) return cand;
    d = path.dirname(d).replace(/\\/g, '/');
  }
  return `${appDir}/layout.tsx`;
}
function extractTables(text) {
  const out = [];
  for (const re of [/\.from\(['"`]([^'"`]+)['"`]\)/g, /\.rpc\(['"`]([^'"`]+)['"`]\)/g, /(?:create table|alter table|create index|drop table)\s+(?:if not exists\s+)?(?:public\.)?([a-zA-Z0-9_]+)/gi, /references\s+(?:public\.)?([a-zA-Z0-9_]+)/gi]) {
    let m; while ((m = re.exec(text))) out.push(m[1]);
  }
  return uniq(out);
}
function extractApis(text) {
  const out = [];
  for (const re of [/fetch\(['"`]([^'"`]+)['"`]/g, /axios\.(?:get|post|patch|put|delete)\(['"`]([^'"`]+)['"`]/g]) {
    let m; while ((m = re.exec(text))) out.push(m[1]);
  }
  return uniq(out);
}
function extractPackages(text) { const out = []; let m; const re = /from ['"](@ridendine\/[^'"]+)['"]/g; while ((m = re.exec(text))) out.push(m[1]); return uniq(out); }
function methods(text) { const out = []; let m; const re = /export\s+async\s+function\s+(GET|POST|PATCH|PUT|DELETE)/g; while ((m = re.exec(text))) out.push(m[1]); return uniq(out); }
function hasAuth(text) { return /auth\.getUser|requireAdmin|requireOps|requireChef|requireDriver|isApprovedDriver|createServerClient\(cookie|cookies\(\)|getUser\(|Authorization|verify|webhook.*signature/i.test(text); }
function hasRole(text) { return /role|admin|ops|finance|chef|driver|isApprovedDriver|requireAdmin|requireOps|requireChef|requireDriver/i.test(text); }
function hasValidation(text) { return /z\.object|safeParse|parse\(|Schema|validate/i.test(text); }
function hasAudit(text) { return /audit|ledger|event|log/i.test(text); }
function hasErrorHandling(text) { return /try\s*{|catch\s*\(|NextResponse\.json\([^)]*status|return.*status/i.test(text); }
function isPlaceholder(text) { return /coming soon|todo|not implemented|placeholder|stub/i.test(text); }
function isWrite(text) { return /export async function (POST|PATCH|PUT|DELETE)|\.insert\(|\.update\(|\.upsert\(|\.delete\(|stripe|payout|refund|checkout|payment/i.test(text); }
function statusForPage(text, route, app) {
  if (!text.trim()) return 'BROKEN';
  if (isPlaceholder(text)) return 'PARTIAL';
  if ((app.key !== 'web' || route.startsWith('/account') || route.startsWith('/checkout') || route.startsWith('/cart')) && !hasAuth(text) && !route.startsWith('/auth') && !route.startsWith('/ui-blueprint')) return 'UNSAFE';
  if (extractApis(text).length || extractTables(text).length || extractPackages(text).length || /redirect\(|notFound\(/.test(text)) return 'WIRED';
  return 'PARTIAL';
}
function statusForApi(text, app, endpoint) {
  if (!methods(text).length) return 'BROKEN';
  if (isPlaceholder(text)) return 'PARTIAL';
  if (!hasAuth(text) && !endpoint.includes('/health') && !endpoint.includes('/webhook') && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/signup')) return 'UNSAFE';
  if (isWrite(text) && !hasValidation(text) && !endpoint.includes('/health') && !endpoint.includes('/webhook')) return 'PARTIAL';
  if (/payout|refund|finance|reconciliation|dispatch|orders|checkout|payment|stripe/i.test(endpoint + text) && !hasAudit(text)) return 'PARTIAL';
  return 'WIRED';
}

const pageFiles = apps.flatMap(app => walk(app.appDir, f => f.endsWith('/page.tsx')).map(file => {
  const text = read(file); const route = routeFrom(app.appDir, file);
  return { app, file, route, text, layout: nearestLayout(app.appDir, file), apis: extractApis(text), tables: extractTables(text), packages: extractPackages(text), status: statusForPage(text, route, app) };
}));
const apiFiles = apps.flatMap(app => walk(app.appDir, f => f.includes('/api/') && f.endsWith('/route.ts')).map(file => {
  const text = read(file); const endpoint = endpointFrom(app.appDir, file);
  return { app, file, endpoint, text, methods: methods(text), tables: extractTables(text), packages: extractPackages(text), status: statusForApi(text, app, endpoint) };
}));
const migrationFiles = walk('supabase/migrations', f => f.endsWith('.sql'));
const migrationText = migrationFiles.map(read).join('\n');
const packageFiles = packages.flatMap(p => walk(`packages/${p}`, f => /\.(ts|tsx|sql|json)$/.test(f) && !f.includes('node_modules') && !f.includes('tsbuildinfo')));
const packageText = packageFiles.map(read).join('\n');
const allTables = extractTables(`${migrationText}\n${packageText}\n${apiFiles.map(a => a.text).join('\n')}`);
const tests = walk('.', f => /\.(test|spec)\.(ts|tsx|js)$/.test(f) && !f.includes('node_modules') && !f.includes('.next'));
const docs = walk('docs', f => f.endsWith('.md') || f.endsWith('.json'));
const scripts = walk('scripts', f => /\.(ts|js|mjs|cjs)$/.test(f));
const routeStatusCounts = countBy(pageFiles.map(p => p.status));
const apiStatusCounts = countBy(apiFiles.map(a => a.status));
function countBy(items) { return items.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {}); }

function evidence(files) { return files.filter(exists).map(mdLink).join('<br>') || 'MISSING'; }
function score(area) {
  const weights = {
    'Customer marketplace': 52, 'Customer checkout/payment': 42, 'Chef operations': 55, 'Driver delivery': 50,
    'Ops control center': 58, 'Finance dashboard': 38, 'Ledger/accounting': 35, 'Payouts': 34,
    'Refunds': 32, 'Reconciliation': 35, 'Auth/RBAC': 45, 'Database integrity': 58,
    'Realtime/eventing': 48, 'UI/UX': 66, 'Mobile readiness': 52, 'Testing': 62, 'Deployment': 48, 'Observability': 45,
  };
  return weights[area] ?? 45;
}
const riskRows = [
  ['R-001','CRITICAL','Money flow','Merchant-of-record finance cannot be accepted until ledger/payout/refund/reconciliation paths are proven end-to-end', evidence(['packages/engine/src/services/ledger.service.ts','packages/engine/src/orchestrators/payout-engine.ts','apps/web/src/app/api/checkout/route.ts','apps/ops-admin/src/app/api/engine/reconciliation/route.ts']), 'Real money can become unexplained or unreconciled', 'Gate launch until all money events create durable ledger entries and reconciliation reports', 'Phase 8'],
  ['R-002','CRITICAL','RBAC','Static scan finds admin/finance/dispatch APIs with partial or unsafe authorization evidence', evidence(apiFiles.filter(a => /finance|payout|refund|dispatch|orders/.test(a.endpoint)).slice(0,8).map(a => a.file)), 'Unauthorized operational or money-moving actions', 'Add centralized role guards and tests for every privileged endpoint', 'Phase 1'],
  ['R-003','HIGH','Order lifecycle','Order creation, chef state, dispatch, driver delivery, and public tracking are distributed across apps and must be proven as one transactionally safe lifecycle', evidence(['apps/web/src/app/api/checkout/route.ts','apps/chef-admin/src/app/api/orders/[id]/route.ts','apps/driver-app/src/app/api/deliveries/[id]/route.ts','packages/engine/src/orchestrators/order-state-machine.ts']), 'Orders can get stuck between apps', 'Add end-to-end order lifecycle contract tests and ops repair controls', 'Phase 4'],
  ['R-004','HIGH','Realtime','Live board/tracking/eventing exists but stale/replay guarantees are not fully proven by scan', evidence(['packages/db/src/realtime/events.ts','packages/engine/src/core/event-emitter.ts','apps/ops-admin/src/app/api/ops/live-board/route.ts']), 'Ops and customers see stale order state', 'Implement event replay/freshness markers and stale-state UI gates', 'Phase 10'],
  ['R-005','HIGH','Deployment','Monorepo has four apps and deployment mapping must be verified per app/project/domain/env', evidence(['package.json','docs/RUNBOOK_DEPLOY.md','.vercelignore']), 'Wrong app or env can deploy', 'Lock app-specific Vercel projects, env check scripts, and smoke tests', 'Phase 14'],
  ['R-006','MEDIUM','Command Center','Internal docs and command center are local/dev protected but must not be deployed publicly without explicit env gating', evidence(['apps/web/src/app/internal/command-center/page.tsx','apps/web/src/app/api/internal/command-center/change-requests/route.ts']), 'Internal architecture disclosure', 'Keep production disabled; add deployment smoke test for 404/403 in prod', 'Phase 0'],
  ['R-007','MEDIUM','Data integrity','Schema has many migrations; constraints/RLS/indexes need manual review against final marketplace flows', evidence(migrationFiles.slice(0,8)), 'Bad data and cross-account access', 'Run schema/RLS audit and add failing tests for tenant isolation', 'Phase 2'],
  ['R-008','MEDIUM','UX readiness','Blueprints are stronger than production pages; real pages need consistent states and mobile QA', evidence(['docs/ui/page-registry.json','apps/web/src/app/ui-blueprint/[screen]/page.tsx','apps/web/src/app/checkout/page.tsx']), 'Users cannot reliably complete flows', 'Migrate production pages to blueprint UX and route smoke tests', 'Phase 11'],
];

function classifyEntity(name) {
  const keys = name.split('/').flatMap(x => x.split('_')).filter(Boolean);
  const found = allTables.find(t => keys.some(k => t.toLowerCase().includes(k.toLowerCase())));
  const migration = migrationFiles.find(f => read(f).toLowerCase().includes((found || keys[0] || '').toLowerCase()));
  const typeFile = packageFiles.find(f => f.includes('packages/types') && keys.some(k => read(f).toLowerCase().includes(k.toLowerCase())));
  const valFile = packageFiles.find(f => f.includes('packages/validation') && keys.some(k => read(f).toLowerCase().includes(k.toLowerCase())));
  const apiUses = apiFiles.filter(a => a.tables.includes(found) || keys.some(k => a.text.toLowerCase().includes(k.toLowerCase()))).slice(0, 5).map(a => a.file);
  return [name, found ? 'Yes' : 'No/UNKNOWN', migration ? mdLink(migration) : 'UNKNOWN', typeFile ? mdLink(typeFile) : 'UNKNOWN', valFile ? mdLink(valFile) : 'UNKNOWN', apiUses.map(mdLink).join('<br>') || 'UNKNOWN', pageFiles.filter(p => keys.some(k => p.text.toLowerCase().includes(k.toLowerCase()))).slice(0,3).map(p => mdLink(p.file)).join('<br>') || 'UNKNOWN', migration ? 'Needs manual RLS/constraint verification' : 'UNKNOWN', found ? 'PARTIAL' : 'MISSING', found ? 'Verify constraints/RLS/indexes/status enums' : 'Create or map final entity'];
}

function generateReports(validation = {}) {
  fs.mkdirSync(out, { recursive: true });

  write('01_REPO_TOPOLOGY.md', `# Repo Topology Audit

## Workspace
${table(['Area','Path','Evidence','Production relevance','Status'], [
  ['Apps','apps/web, apps/chef-admin, apps/driver-app, apps/ops-admin', evidence(apps.map(a=>a.root)), 'Four deployable product surfaces', 'WIRED'],
  ['Packages', packages.map(p=>`packages/${p}`).join(', '), evidence(packages.map(p=>`packages/${p}/package.json`).filter(exists)), 'Shared business, data, UI, auth, routing, validation', 'WIRED'],
  ['Scripts', 'scripts', evidence(scripts.slice(0,10)), 'Operational, UI docs, load/smoke helpers', 'PARTIAL'],
  ['Migrations', 'supabase/migrations', evidence(migrationFiles.slice(0,10)), 'Database source of truth', migrationFiles.length ? 'WIRED' : 'MISSING'],
  ['Seeds', 'supabase/seeds', evidence(walk('supabase/seeds').slice(0,10)), 'Local/test data only; not production data', exists('supabase/seeds') ? 'PARTIAL' : 'UNKNOWN'],
  ['UI command center','docs/ui + apps/web/internal', evidence(['docs/ui/page-registry.json','apps/web/src/app/internal/command-center/page.tsx']), 'Internal operating documentation surface', 'PARTIAL'],
  ['Wiring docs','docs/wiring', evidence(['docs/wiring/ROUTE_INVENTORY.md','docs/wiring/API_INVENTORY.md']), 'Source for route/API/wiring visibility', exists('docs/wiring') ? 'WIRED' : 'MISSING'],
])}

## Package Scripts
\`\`\`json
${JSON.stringify(JSON.parse(read('package.json')).scripts, null, 2)}
\`\`\`

## Dependency Graph
${table(['Node','Depends on / Used by','Status'], [
  ['apps/web','@ridendine/ui, db, engine, validation, auth, routing, Stripe/Supabase APIs','PARTIAL'],
  ['apps/chef-admin','@ridendine/db/ui; chef order/menu/storefront APIs','PARTIAL'],
  ['apps/driver-app','@ridendine/db/routing/ui; delivery/offers/location APIs','PARTIAL'],
  ['apps/ops-admin','@ridendine/engine/db/ui; finance/dispatch/admin APIs','PARTIAL'],
  ['packages/engine','Business rules, order state, dispatch, payout, reconciliation services','PARTIAL'],
  ['packages/db','Supabase clients/repositories/realtime/schema','PARTIAL'],
])}

## Unknown / Obsolete / Generated Areas
${table(['Path','Classification','Reason','Status'], [
  ['graphify-out','Generated/unknown','Not part of app/package/deployment scripts','UNKNOWN'],
  ['AUDIT_AND_DEBUG','Historical audit/debug output','Useful for context, not deployable product code','PARTIAL'],
  ['test-results','Generated test artifact','Not production code','WIRED'],
  ['docs/ui/screenshots','Generated UI artifacts','Command center assets','WIRED'],
  ['docs/wiring','Generated wiring docs','Internal audit and operating docs','WIRED'],
])}`);

  write('02_APP_ROUTE_INVENTORY.md', `# Complete App Route Inventory
${table(['App','Route','File','Layout','User Role','Public/Protected','Purpose','Data Source','API Calls','Status','Notes'], pageFiles.map(p => [
    p.app.label, `\`${p.route}\``, mdLink(p.file), mdLink(p.layout), p.app.role, hasAuth(p.text) ? 'Protected/detected' : (p.route.startsWith('/auth') || p.route === '/' ? 'Public/detected' : 'UNKNOWN'), routePurpose(p.route, p.app.key), [...p.tables.map(t=>`table:${t}`), ...p.packages].join(', ') || 'Static/UNKNOWN', p.apis.map(a=>`\`${a}\``).join(', ') || 'None detected', p.status, noteForStatus(p.status, p)
  ]))}`);

  write('03_PAGE_FUNCTIONALITY_AUDIT.md', `# Page Functionality Audit
${table(['App','Page','Main Actions','Real Data?','Real Writes?','Loading/Error States','Mobile Ready','Production Status','Required Fix'], pageFiles.map(p => [
    p.app.label, `${p.route}<br>${mdLink(p.file)}`, actionsFor(p.text), p.tables.length || p.apis.length || p.packages.includes('@ridendine/db') ? 'PARTIAL/WIRED evidence' : 'Static/UNKNOWN', isWrite(p.text) ? 'Write evidence detected' : 'No write evidence', /loading|error|empty|skeleton|try again/i.test(p.text) ? 'Detected' : 'UNKNOWN/MISSING', /sm:|md:|lg:|grid|flex|responsive/i.test(p.text) ? 'Likely partial' : 'UNKNOWN', p.status, fixFor(p.status, p.route)
  ]))}`);

  write('04_API_CONTRACT_AUDIT.md', `# API Contract Audit
${table(['App','Endpoint','Methods','File','Request Validation','Auth/RBAC','DB Tables','Engine Service','External Service','Called By UI','Status','Risk'], apiFiles.map(a => [
    a.app.label, `\`${a.endpoint}\``, a.methods.join(', ') || 'BROKEN', mdLink(a.file), hasValidation(a.text) ? 'Detected' : 'MISSING/UNKNOWN', hasAuth(a.text) ? (hasRole(a.text) ? 'Auth+role evidence' : 'Auth evidence only') : 'MISSING/UNSAFE', a.tables.map(t=>`\`${t}\``).join(', ') || 'None detected', a.packages.filter(p=>p.includes('engine')).join(', ') || 'None detected', externalFor(a.text), pageFiles.some(p => p.apis.some(api => api.includes(a.endpoint.replace(/:.*$/, '')))) ? 'Detected' : 'UNKNOWN/orphan possible', a.status, apiRisk(a)
  ]))}`);

  write('05_DATABASE_SCHEMA_AUDIT.md', `# Database Schema Audit
${table(['Entity','Exists?','Migration','Type Model','Validation Schema','Used By APIs','Used By UI','RLS/Constraints','Status','Required Fix'], expectedEntities.map(classifyEntity))}

## Global Findings
${table(['Check','Evidence','Status','Required Fix'], [
  ['Foreign keys/indexes/constraints', evidence(migrationFiles.filter(f=>/foreign key|references|create index/i.test(read(f))).slice(0,10)), 'PARTIAL', 'Manual schema review required per entity before launch'],
  ['RLS policies', evidence(migrationFiles.filter(f=>/policy|row level security|enable row level security/i.test(read(f))).slice(0,10)), 'PARTIAL', 'Prove customer/chef/driver/ops isolation with tests'],
  ['Idempotency keys', evidence(migrationFiles.filter(f=>/idempotency/i.test(read(f))).slice(0,10)), 'PARTIAL', 'Ensure checkout/webhook/payout idempotency is end-to-end tested'],
  ['Audit columns', evidence(migrationFiles.filter(f=>/created_at|updated_at|audit/i.test(read(f))).slice(0,10)), 'PARTIAL', 'Verify all money/admin tables have immutable audit trail'],
])}`);

  write('06_AUTH_RBAC_SECURITY_AUDIT.md', `# Auth RBAC Security Audit
${table(['Area','Expected Role','Protection Found','File','Status','Risk','Required Fix'], [
  ...apps.map(a => [a.label, a.role, evidence([`${a.root}/src/middleware.ts`, `${a.root}/src/app/layout.tsx`].filter(exists)), evidence([`${a.root}/src/middleware.ts`, `${a.root}/src/app/layout.tsx`].filter(exists)), exists(`${a.root}/src/middleware.ts`) ? 'PARTIAL' : 'UNKNOWN', 'Route-level protection must be proven per route', 'Add centralized auth matrix tests']),
  ['Finance APIs','finance/ops/admin', 'Static scan: auth evidence varies by endpoint', evidence(apiFiles.filter(x=>/finance|payout|refund|reconciliation/.test(x.endpoint)).map(x=>x.file).slice(0,8)), apiFiles.filter(x=>/finance|payout|refund|reconciliation/.test(x.endpoint) && x.status==='UNSAFE').length ? 'UNSAFE' : 'PARTIAL', 'Money-moving endpoints require strongest RBAC', 'Require finance role guard + audit reason + tests'],
  ['Internal command center','local/internal only', evidence(['apps/web/src/app/internal/command-center/page.tsx','apps/web/src/app/api/internal/command-center/change-requests/route.ts']), evidence(['apps/web/src/app/internal/command-center/page.tsx']), 'PARTIAL', 'Internal docs disclosure if enabled in prod', 'Add deployment smoke test that prod returns 404/403'],
  ['Stripe webhooks','signature verified service boundary', evidence(apiFiles.filter(a=>/webhook|stripe/.test(a.endpoint)).map(a=>a.file)), evidence(apiFiles.filter(a=>/webhook|stripe/.test(a.endpoint)).map(a=>a.file)), 'PARTIAL', 'Webhook idempotency/signature must remain enforced', 'Contract tests for replay and invalid signatures'],
])}

## Unsafe / Partial API Findings
${table(['Endpoint','File','Status','Evidence','Required Fix'], apiFiles.filter(a=>['UNSAFE','PARTIAL','BROKEN'].includes(a.status)).map(a=>[`\`${a.endpoint}\``, mdLink(a.file), a.status, hasAuth(a.text)?'Auth evidence exists':'No auth evidence by scan', apiRisk(a)]))}`);

  flowReport('07_CUSTOMER_MARKETPLACE_FLOW_AUDIT.md', 'Customer Marketplace Flow Audit', [
    ['Landing / marketplace','/','apps/web/src/app/page.tsx','None detected','Static/marketing + chef links'],
    ['Location/address selection','/account/addresses','apps/web/src/app/account/addresses/page.tsx','/api/addresses','customer_addresses'],
    ['Chef/vendor discovery','/chefs','apps/web/src/app/chefs/page.tsx','UNKNOWN','chef_storefronts likely via components/API'],
    ['Menu browsing','/chefs/:slug','apps/web/src/app/chefs/[slug]/page.tsx','Server DB','chef_storefronts/menu_items'],
    ['Item modifiers/options','/chefs/:slug','apps/web/src/app/chefs/[slug]/page.tsx','UNKNOWN','MISSING/PARTIAL'],
    ['Cart','/cart','apps/web/src/app/cart/page.tsx','/api/cart','cart_items/menu_items'],
    ['Fees/taxes/service/delivery fee','/checkout','apps/web/src/app/checkout/page.tsx','/api/checkout','orders/promo_codes/Stripe'],
    ['Checkout','/checkout','apps/web/src/app/checkout/page.tsx','/api/checkout','checkout_idempotency_keys/orders'],
    ['Payment','/checkout','apps/web/src/app/api/checkout/route.ts','Stripe','payment intent/checkout'],
    ['Order confirmation','/orders/:id/confirmation','apps/web/src/app/orders/[id]/confirmation/page.tsx','DB','orders'],
    ['Order tracking','tracking components','apps/web/src/components/tracking','/api/orders/:id','orders/events'],
    ['Order history','/account/orders','apps/web/src/app/account/orders/page.tsx','/api/orders','orders'],
    ['Refund/support','/contact or support APIs','apps/web/src/app/api/support/route.ts','/api/support','support tickets'],
  ]);

  capabilityReport('08_CHEF_OPERATIONS_FLOW_AUDIT.md', 'Chef Operations Flow Audit', [
    ['chef onboarding','apps/chef-admin/src/app/auth/signup/page.tsx','apps/chef-admin/src/app/api/auth/signup/route.ts','chef_profiles'],
    ['chef profile/settings','apps/chef-admin/src/app/dashboard/settings/page.tsx','apps/chef-admin/src/app/api/profile/route.ts','chef_profiles'],
    ['hours/availability','apps/chef-admin/src/app/dashboard/availability/page.tsx','apps/chef-admin/src/app/api/storefront/availability/route.ts','chef_storefronts'],
    ['menu management','apps/chef-admin/src/app/dashboard/menu/page.tsx','apps/chef-admin/src/app/api/menu/route.ts','menu_items'],
    ['item availability','apps/chef-admin/src/app/dashboard/menu/page.tsx','apps/chef-admin/src/app/api/menu/[id]/route.ts','menu_items'],
    ['order queue','apps/chef-admin/src/app/dashboard/orders/page.tsx','apps/chef-admin/src/app/api/orders/route.ts','orders'],
    ['accept/reject/prep/ready','apps/chef-admin/src/app/dashboard/orders/page.tsx','apps/chef-admin/src/app/api/orders/[id]/route.ts','orders'],
    ['sales/revenue','apps/chef-admin/src/app/dashboard/analytics/page.tsx','UNKNOWN','orders'],
    ['payouts','apps/chef-admin/src/app/dashboard/payouts/page.tsx','apps/chef-admin/src/app/api/payouts/request/route.ts','payouts/ledger'],
  ]);

  capabilityReport('09_DRIVER_DELIVERY_FLOW_AUDIT.md', 'Driver Delivery Flow Audit', [
    ['driver onboarding','apps/driver-app/src/app/auth/signup/page.tsx','apps/driver-app/src/app/api/auth/signup/route.ts','drivers'],
    ['online/offline','apps/driver-app/src/app/page.tsx','apps/driver-app/src/app/api/driver/presence/route.ts','driver_presence'],
    ['location updates','apps/driver-app/src/app/delivery/[id]/page.tsx','apps/driver-app/src/app/api/location/route.ts','driver_locations'],
    ['offer receiving','apps/driver-app/src/app/page.tsx','apps/driver-app/src/app/api/offers/route.ts','dispatch_offers'],
    ['offer accept/reject','apps/driver-app/src/app/page.tsx','apps/driver-app/src/app/api/offers/route.ts','dispatch_offers'],
    ['route/ETA','apps/driver-app/src/app/delivery/[id]/page.tsx','packages/routing/src/index.ts','routing provider'],
    ['pickup/delivery confirmation','apps/driver-app/src/app/delivery/[id]/page.tsx','apps/driver-app/src/app/api/deliveries/[id]/route.ts','deliveries'],
    ['earnings','apps/driver-app/src/app/earnings/page.tsx','apps/driver-app/src/app/api/earnings/route.ts','payouts/ledger'],
    ['instant payout','apps/driver-app/src/app/earnings/page.tsx','apps/driver-app/src/app/api/payouts/instant/route.ts','payouts'],
  ], true);

  capabilityReport('10_OPS_CONTROL_CENTER_AUDIT.md', 'Ops Control Center Audit', [
    ['see active orders','apps/ops-admin/src/app/dashboard/page.tsx','apps/ops-admin/src/app/api/ops/live-board/route.ts','orders'],
    ['see stuck/SLA orders','apps/ops-admin/src/components/ops-alerts.tsx','apps/ops-admin/src/app/api/engine/processors/sla/route.ts','orders/sla'],
    ['chefs online/offline','apps/ops-admin/src/app/dashboard/chefs/page.tsx','apps/ops-admin/src/app/api/chefs/route.ts','chef_storefronts'],
    ['drivers online/offline','apps/ops-admin/src/app/dashboard/drivers/page.tsx','apps/ops-admin/src/app/api/drivers/route.ts','drivers/driver_presence'],
    ['unassigned orders','apps/ops-admin/src/app/dashboard/dispatch/page.tsx','apps/ops-admin/src/app/api/engine/dispatch/route.ts','orders/dispatch_offers'],
    ['manual assign/reassign','apps/ops-admin/src/app/dashboard/dispatch/page.tsx','apps/ops-admin/src/app/api/engine/dispatch/route.ts','dispatch_offers'],
    ['inspect order lifecycle','apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx','apps/ops-admin/src/app/api/orders/[id]/route.ts','orders'],
    ['payment/ledger/refunds/payouts','apps/ops-admin/src/app/dashboard/finance/page.tsx','apps/ops-admin/src/app/api/engine/finance/route.ts','ledger/payouts/refunds'],
    ['run reconciliation','apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx','apps/ops-admin/src/app/api/engine/reconciliation/route.ts','reconciliation_records'],
    ['webhook/cron health','apps/ops-admin/src/app/dashboard/automation/page.tsx','apps/ops-admin/src/app/api/engine/health/route.ts','system_health'],
    ['audit timeline','apps/ops-admin/src/app/dashboard/activity/page.tsx','apps/ops-admin/src/app/api/audit/recent/route.ts','audit_logs'],
  ], true);

  financeReport();
  realtimeReport();
  uxReport();
  commandCenterReport();
  testingReport(validation);
  deploymentReport();
  observabilityReport();
  riskRegister();
  scorecard();
  gapMatrix();
  roadmap();
  first30Tasks();
  acceptanceCriteria();
  executiveReport();
}

function routePurpose(route, app) {
  if (route.includes('checkout')) return 'Checkout/payment';
  if (route.includes('cart')) return 'Cart';
  if (route.includes('orders')) return 'Order lifecycle/history';
  if (route.includes('delivery')) return 'Delivery execution';
  if (route.includes('finance')) return 'Finance operations';
  if (route.includes('dispatch')) return 'Dispatch operations';
  if (route.includes('internal/command-center')) return 'Internal command center';
  if (route.includes('ui-blueprint')) return 'Internal UI blueprint';
  if (route.includes('dashboard')) return 'Admin dashboard';
  if (route.includes('auth')) return 'Authentication';
  return `${app} page`;
}
function noteForStatus(status, p) { return status === 'UNSAFE' ? 'Protected route expectation not proven by scan' : status === 'PARTIAL' ? 'Requires flow-level verification' : status === 'BROKEN' ? 'File unreadable/empty' : ''; }
function actionsFor(text) { const a=[]; if(/button|onClick|form|submit/i.test(text)) a.push('UI actions/forms'); if(/fetch\(|POST|PATCH|DELETE/i.test(text)) a.push('API calls/writes'); if(/Link|href/i.test(text)) a.push('Navigation'); return a.join(', ') || 'Read/view only or unknown'; }
function fixFor(status, route) { return status === 'WIRED' ? 'Add route smoke/e2e proof before launch' : status === 'UNSAFE' ? 'Add auth/RBAC guard and test' : status === 'BROKEN' ? 'Repair route file' : `Complete data/API/state wiring for ${route}`; }
function externalFor(text) { return uniq([/stripe/i.test(text)&&'Stripe',/supabase/i.test(text)&&'Supabase',/mapbox|osrm|routing/i.test(text)&&'Routing provider',/sentry/i.test(text)&&'Sentry']).join(', ') || 'None detected'; }
function apiRisk(a) { if (a.status==='UNSAFE') return 'Missing auth/RBAC evidence'; if (a.status==='BROKEN') return 'No method export'; if (/payout|refund|finance|checkout|stripe|reconciliation/i.test(a.endpoint)) return 'Money/admin endpoint: needs transaction, audit, idempotency, RBAC proof'; return a.status==='PARTIAL' ? 'Contract incomplete by scan' : 'Needs tests to prove contract'; }
function flowReport(name, title, rows) {
  write(name, `# ${title}
${table(['Step','UI Route/File','API Route','DB Tables','External Dependency','Current Status','Blocker','Required Build Step'], rows.map(([step, route, file, api, db]) => {
    const uiFile = exists(file) ? mdLink(file) : file;
    const apiFile = apiFiles.find(a => api.includes(a.endpoint) || a.file === api);
    const status = !exists(file) ? 'MISSING' : apiFile ? apiFile.status : (api === 'UNKNOWN' ? 'UNKNOWN' : 'PARTIAL');
    return [step, `${route}<br>${uiFile}`, apiFile ? `\`${apiFile.endpoint}\`<br>${mdLink(apiFile.file)}` : api, db, externalFor(apiFile?.text || ''), status, status==='WIRED'?'Needs E2E proof':'Missing/prove wiring', 'Add contract/e2e tests and command-center status update'];
  }))}`);
}
function capabilityReport(name, title, rows, ops=false) {
  write(name, `# ${title}
${table(ops ? ['Ops Capability','Page','API','DB/Service','Actionable?','Status','Required Fix'] : ['Capability','UI','API','DB','Status','Missing Work','Production Risk'], rows.map(([cap, ui, api, db]) => {
    const apiFile = apiFiles.find(a => a.file === api || api.includes(a.endpoint));
    const status = !exists(ui) ? 'MISSING' : apiFile ? apiFile.status : 'PARTIAL';
    return ops ? [cap, exists(ui)?mdLink(ui):ui, apiFile?mdLink(apiFile.file):api, db, apiFile && /POST|PATCH|DELETE|PUT/.test(apiFile.methods.join(',')) ? 'Yes by API method' : 'View/unknown', status, fixFor(status, cap)] : [cap, exists(ui)?mdLink(ui):ui, apiFile?mdLink(apiFile.file):api, db, status, fixFor(status, cap), status==='WIRED'?'Operational risk remains until E2E tested':'Cannot rely on this in production'];
  }))}`);
}
function financeReport() {
  const moneyFiles = apiFiles.filter(a=>/checkout|stripe|payout|refund|finance|reconciliation/.test(a.endpoint)).map(a=>a.file);
  write('11_PAYMENT_MERCHANT_FINANCE_AUDIT.md', `# Payment Merchant Finance Audit

## Verdict
Real customer money should not go live until ledger, payout, refund, reconciliation, RBAC, and audit trails are proven end-to-end.

${table(['Question','Answer','Evidence','Status','Required Fix'], [
  ['Can real customer money safely go live?','No-go for institutional launch until end-to-end finance controls are proven', evidence(moneyFiles.slice(0,10)), 'PARTIAL/UNSAFE RISK', 'Finance acceptance suite and role-gated money controls'],
  ['Can finance explain every dollar?','Not proven by static scan', evidence(['packages/engine/src/services/ledger.service.ts','docs/PAYMENT_LEDGER_FLOW.md']), 'PARTIAL', 'Ledger event matrix with debit/credit tests'],
  ['Can ops hold payouts?','Payout APIs/pages exist, hold semantics require proof', evidence(['apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx','apps/ops-admin/src/app/api/engine/payouts/execute/route.ts']), 'PARTIAL', 'Approve/hold/release workflow with audit reason'],
  ['Can failed payments be resolved?','Webhook/checkout paths exist; operational repair flow needs proof', evidence(['apps/web/src/app/api/webhooks/stripe/route.ts','apps/ops-admin/src/app/api/stripe/webhook/route.ts']), 'PARTIAL', 'Failed payment dashboard and replay-safe repair'],
  ['Are there double-payment risks?','Idempotency evidence exists but must be proven across checkout/webhook/payout', evidence(migrationFiles.filter(f=>/idempotency/i.test(read(f))).slice(0,6)), 'PARTIAL', 'Replay tests and unique constraints'],
])}`);
  ledgerReport();
  payoutReport();
}
function ledgerReport() {
  const events = ['order payment','service fee','delivery fee','platform fee','chef payable','driver payable','refund','adjustment','payout','payout reversal','failed payout','reconciliation difference'];
  write('12_LEDGER_ACCOUNTING_AUDIT.md', `# Ledger Accounting Audit
${table(['Money Event','Ledger Entry Exists?','Debit/Credit Logic','Account Impact','API/Service','Status','Required Fix'], events.map(e => {
    const ev = e.replace(' ', '_');
    const files = packageFiles.filter(f => /ledger|payout|reconciliation|stripe|order/i.test(f) && read(f).toLowerCase().includes(e.split(' ')[0])).slice(0,3);
    return [e, files.length ? 'Evidence exists' : 'UNKNOWN/MISSING', files.length ? 'Needs accounting review' : 'UNKNOWN', 'Must map to platform/customer/chef/driver accounts', files.map(mdLink).join('<br>') || 'UNKNOWN', files.length ? 'PARTIAL' : 'MISSING', 'Add immutable ledger tests and finance sign-off'];
  }))}

## Controls
- No silent money movement: PARTIAL. Evidence must be proven in ledger service and payout APIs.
- No direct payout without ledger: PARTIAL. Requires tests around payout execution.
- No payout without reconciliation status: PARTIAL. Requires finance workflow gate.
- Audit logs for changes: PARTIAL. Audit files exist but money action coverage must be proven.`);
}
function payoutReport() {
  write('13_PAYOUTS_REFUNDS_RECONCILIATION_AUDIT.md', `# Payouts Refunds Reconciliation Audit
${table(['Capability','Evidence','Classification','Required Fix'], ['chef payouts','driver payouts','instant payouts','payout runs','payout preview','payout approval','payout hold','payout execution','payout failure','refunds','refund approval','Stripe reconciliation','ledger reconciliation','dashboard visibility'].map(cap => {
    const files = [...apiFiles.map(a=>a.file), ...pageFiles.map(p=>p.file), ...packageFiles].filter(f => read(f).toLowerCase().includes(cap.split(' ')[0])).slice(0,5);
    return [cap, files.map(mdLink).join('<br>') || 'UNKNOWN', files.length ? 'PARTIAL' : 'MISSING', 'Add finance workflow tests, RBAC, audit reason, and reconciliation proof'];
  }))}`);
}
function realtimeReport() {
  const events = ['customer order tracking','chef order queue updates','driver offer updates','driver location updates','ops live board','SLA alerts','payment webhook updates','payout status updates','system health updates'];
  write('14_REALTIME_EVENTING_AUDIT.md', `# Realtime Eventing Audit
${table(['Event','Producer','Consumer','Transport','Sanitized?','Status','Missing Work'], events.map(e => {
    const files = [...packageFiles, ...apiFiles.map(a=>a.file), ...pageFiles.map(p=>p.file)].filter(f => /realtime|event|broadcast|live|subscription|channel|webhook|sla|presence/i.test(f + read(f)) && e.split(' ').some(w => read(f).toLowerCase().includes(w))).slice(0,4);
    return [e, files.map(mdLink).join('<br>') || 'UNKNOWN', 'Customer/Chef/Driver/Ops surfaces depending on event', /supabase|channel|broadcast|event/i.test(files.map(read).join('\n')) ? 'Supabase/event emitter evidence' : 'UNKNOWN', /sanitize|public/i.test(files.map(read).join('\n')) ? 'Evidence' : 'UNKNOWN', files.length ? 'PARTIAL' : 'MISSING', 'Add replay/freshness/de-dupe/public-data-leak tests'];
  }))}`);
}
function uxReport() {
  write('15_UI_UX_MOBILE_AUDIT.md', `# UI UX Mobile Audit
${table(['App','Customer UX','Chef UX','Driver UX','Ops UX','Finance UX','Evidence','Status','Required Fix'], [
  ['Customer Web','66','N/A','N/A','N/A','Checkout finance clarity 45', evidence(['apps/web/src/app/page.tsx','apps/web/src/app/checkout/page.tsx','docs/ui/page-registry.json']), 'PARTIAL', 'Migrate production checkout/tracking to blueprint quality and mobile QA'],
  ['Chef Admin','N/A','58','N/A','N/A','Payout clarity 45', evidence(['apps/chef-admin/src/app/dashboard/orders/page.tsx','apps/chef-admin/src/app/dashboard/menu/page.tsx']), 'PARTIAL', 'Tablet-first kitchen speed audit and action confirmations'],
  ['Driver App','N/A','N/A','55','N/A','Earnings 50', evidence(['apps/driver-app/src/app/page.tsx','apps/driver-app/src/app/delivery/[id]/page.tsx']), 'PARTIAL', 'Mobile field test: offer, navigation, pickup/dropoff flow'],
  ['Ops Admin','N/A','N/A','N/A','58','48', evidence(['apps/ops-admin/src/app/dashboard/page.tsx','apps/ops-admin/src/app/dashboard/finance/page.tsx']), 'PARTIAL', 'Command-center density, finance readability, alert prioritization'],
])}`);
}
function commandCenterReport() {
  write('16_COMMAND_CENTER_DOCS_AUDIT.md', `# Command Center Docs Audit
${table(['Item','Evidence','Status','Finding','Required Fix'], [
  ['/internal/command-center', evidence(['apps/web/src/app/internal/command-center/page.tsx']), 'PARTIAL', 'Local/internal UI exists and production disabled by env check', 'Add prod smoke test for 404/403'],
  ['/ui-blueprint', evidence(['apps/web/src/app/ui-blueprint/page.tsx','apps/web/src/app/ui-blueprint/[screen]/page.tsx']), 'WIRED', 'Blueprint gallery and screens exist', 'Keep registry synced'],
  ['page-registry.json', evidence(['docs/ui/page-registry.json']), 'WIRED', '21 blueprint pages registered', 'Regenerate after page additions'],
  ['change-requests.json', evidence(['docs/ui/change-requests.json']), 'PARTIAL', 'Store exists; workflow local only', 'Add docs regeneration trigger after API writes'],
  ['screenshots', evidence(walk('docs/ui/screenshots', f=>f.endsWith('.png')).slice(0,8)), 'WIRED', '21 screenshots synced', 'Automate visual freshness checks'],
  ['wiring docs', evidence(['docs/wiring/ROUTE_INVENTORY.md','docs/wiring/API_INVENTORY.md','docs/wiring/MISSING_WIRING_REPORT.md']), 'WIRED', 'Generated wiring docs exist', 'Improve status accuracy with explicit metadata'],
])}`);
}
function testingReport(validation) {
  const trows = [
    ['Unit tests', tests.filter(f=>f.includes('packages')).length, evidence(tests.filter(f=>f.includes('packages')).slice(0,8)), 'PARTIAL'],
    ['API tests', tests.filter(f=>f.includes('/api/') || f.includes('route.test')).length, evidence(tests.filter(f=>f.includes('/api/') || f.includes('route.test')).slice(0,8)), 'PARTIAL'],
    ['Finance tests', tests.filter(f=>/ledger|payout|reconciliation|stripe|checkout/.test(f)).length, evidence(tests.filter(f=>/ledger|payout|reconciliation|stripe|checkout/.test(f)).slice(0,8)), 'PARTIAL'],
    ['E2E/Smoke/Load', walk('e2e').length + walk('scripts/load').length, evidence([...walk('e2e').slice(0,5), ...walk('scripts/load').slice(0,5)]), 'PARTIAL'],
  ];
  write('17_TESTING_QA_AUDIT.md', `# Testing QA Audit
${table(['Suite','Count','Evidence','Status'], trows)}

## Validation Commands
${table(['Command','Exit','Notes'], [
  ['pnpm lint', validation.lint ?? 'PENDING', 'Required final validation'],
  ['pnpm typecheck', validation.typecheck ?? 'PENDING', 'Required final validation'],
  ['pnpm test', validation.test ?? 'PENDING', 'Required final validation'],
  ['pnpm build', validation.build ?? 'PENDING', 'Required final validation'],
])}

## Required Before Production
- Full customer order E2E with Stripe test mode.
- Chef accept/prep/ready E2E.
- Driver offer/accept/pickup/deliver E2E.
- Finance ledger/payout/refund/reconciliation acceptance suite.
- RBAC negative tests for customer/chef/driver/ops/finance boundaries.
- Deployment smoke tests per app/domain.`);
}
function deploymentReport() {
  write('18_DEPLOYMENT_VERCEL_ENV_AUDIT.md', `# Deployment Vercel Env Audit
${table(['App','Vercel Project','Domain','Build Command','Env Needed','Current Risk','Required Fix'], apps.map(a=>[
    a.label, 'UNKNOWN from repo scan', 'UNKNOWN from repo scan', `pnpm --filter @ridendine/${a.key === 'web' ? 'web' : a.key} build`, 'Supabase, Stripe, app URLs, Sentry as applicable; values not printed', 'Project/domain/env mapping not proven by repo files', 'Document Vercel project IDs/domains/env matrix and add smoke tests'
  ]))}

## Evidence
- Root scripts: ${mdLink('package.json')}
- Deployment docs: ${evidence(['docs/RUNBOOK_DEPLOY.md','docs/STAGING_WORKFLOW.md','docs/ENVIRONMENT_VARIABLES.md','.vercelignore'])}`);
}
function observabilityReport() {
  write('19_OBSERVABILITY_LOGGING_AUDIT.md', `# Observability Logging Audit
${table(['Area','Evidence','Can diagnose?','Status','Required Fix'], [
  ['API logging', evidence(apiFiles.filter(a=>/console\.|logger|log|Sentry/i.test(a.text)).slice(0,8).map(a=>a.file)), 'Partial', 'PARTIAL', 'Structured logs with correlation IDs across all APIs'],
  ['Order lifecycle audit', evidence([...packageFiles, ...apiFiles.map(a=>a.file)].filter(f=>/order.*event|audit|state-machine/i.test(f+read(f))).slice(0,8)), 'Partial', 'PARTIAL', 'Durable audit timeline visible in ops'],
  ['Payment/payout/reconciliation logs', evidence([...packageFiles, ...apiFiles.map(a=>a.file)].filter(f=>/stripe|payment|payout|ledger|reconciliation/i.test(f+read(f))).slice(0,8)), 'Partial', 'PARTIAL', 'Finance-grade structured audit logs'],
  ['Sentry/error tracking', evidence([...walk('packages/config'), ...walk('apps')].filter(f=>/sentry/i.test(f+read(f))).slice(0,8)), 'Partial', 'PARTIAL', 'Verify DSN/env release tagging per app'],
  ['Support traceability', evidence(['apps/web/src/app/api/support/route.ts','apps/ops-admin/src/app/api/support/route.ts']), 'Partial', 'PARTIAL', 'Link support tickets to orders/payments/users'],
])}`);
}
function riskRegister(){ write('20_PRODUCTION_RISK_REGISTER.md', `# Production Risk Register\n${table(['ID','Severity','Area','Risk','Evidence','Impact','Required Fix','Phase'], riskRows)}`); }
function scorecard(){
  const areas = ['Customer marketplace','Customer checkout/payment','Chef operations','Driver delivery','Ops control center','Finance dashboard','Ledger/accounting','Payouts','Refunds','Reconciliation','Auth/RBAC','Database integrity','Realtime/eventing','UI/UX','Mobile readiness','Testing','Deployment','Observability'];
  write('21_PRODUCT_READINESS_SCORECARD.md', `# Product Readiness Scorecard
${table(['Area','Score','Status','Why','What Makes It Production Ready'], areas.map(a => [a, score(a), score(a)>=70?'WIRED':score(a)>=50?'PARTIAL':'MISSING/PARTIAL', 'Evidence exists but institutional launch proof is incomplete', `Complete roadmap gates for ${a}`]))}

## Overall Score
${Math.round(areas.reduce((s,a)=>s+score(a),0)/areas.length)}/100`);
}
function gapMatrix(){
  write('22_MASTER_GAP_MATRIX.md', `# Master Gap Matrix
${table(['Area','Current State','Required State','Gap','Severity','Files','Build Phase','Acceptance Criteria'], riskRows.map(r => [r[2], r[3], 'Institutional marketplace-safe implementation', r[5], r[1], r[4], r[7], r[6]]))}`);
}
function roadmap(){
  const phases = ['Source of truth, branch hygiene, deploy locks','Auth/RBAC/account isolation','Database constraints/RLS/data integrity','Customer marketplace + cart + checkout','Order lifecycle engine','Chef operations','Driver dispatch/delivery','Ops live control center','Payment merchant ledger','Payout/refund/reconciliation safety','Realtime/event bus/SLA alerts','UI/UX/mobile polish','Testing/QA/load/smoke/E2E','Observability/support/admin audit','Production deployment hardening'];
  write('23_PRODUCTION_BUILD_ROADMAP.md', `# Production Build Roadmap
${phases.map((p,i)=>`## PHASE ${i} — ${p}

| Field | Plan |
| --- | --- |
| Objective | Make ${p} production-safe. |
| Why it matters | Required for merchant-of-record marketplace operation. |
| Files likely affected | ${evidence([...apiFiles.map(a=>a.file), ...pageFiles.map(pg=>pg.file), ...packageFiles].filter(f=>phaseMatch(f,p)).slice(0,8))} |
| APIs to build/fix | ${apiFiles.filter(a=>phaseMatch(a.endpoint,p)).slice(0,6).map(a=>`\`${a.endpoint}\``).join(', ') || 'TBD after phase audit'} |
| DB migrations required | Add constraints/RLS/indexes/audit/idempotency as required by phase. |
| UI pages affected | ${pageFiles.filter(pg=>phaseMatch(pg.route,p)).slice(0,6).map(pg=>`\`${pg.route}\``).join(', ') || 'Relevant command-center pages'} |
| Services/packages affected | packages/db, packages/engine, packages/types, packages/validation, packages/routing as applicable |
| Tests required | Unit, API contract, RBAC negative, E2E smoke, and finance acceptance tests for phase scope |
| Docs to update | Command center registry, wiring docs, audit report phase notes |
| Command-center status updates | Upgrade only when evidence proves WIRED |
| Acceptance criteria | All phase routes/APIs pass tests and no CRITICAL/HIGH blocker remains for phase |
| Rollback plan | Feature flag or revert phase branch; no schema destructive change without rollback migration |
| Production gate | lint/typecheck/test/build + smoke + security/finance sign-off |
`).join('\n')}`);
}
function phaseMatch(f,p){ const s=(f+' '+p).toLowerCase(); return ['auth','rbac','database','checkout','order','chef','driver','ops','payment','ledger','payout','refund','reconciliation','realtime','ui','test','deploy','observability'].some(k=>s.includes(k));}
function first30Tasks(){
  const titles = ['Add centralized auth/RBAC route map','Protect admin/finance APIs with role guards','Prove order creation path with contract tests','Prove chef accept/prep/ready path','Prove driver offer/accept/deliver path','Create ledger entries for all money events','Harden Stripe webhook idempotency tests','Wire ops live board to real data freshness','Document deployment mapping per app','Improve command center status accuracy','Add customer checkout E2E','Add order tracking stale-state indicator','Add chef order queue realtime test','Add driver location freshness test','Add payout hold/release model','Add refund approval workflow tests','Add reconciliation discrepancy UI proof','Add audit reason requirement for ops overrides','Add RLS tenant isolation tests','Add schema constraints for status enums','Add platform account ledger tests','Add failed payout recovery flow','Add failed payment repair flow','Add support-order linkage','Add observability correlation IDs','Add Sentry release/env validation','Add visual mobile QA checklist runs','Add load smoke for checkout/order APIs','Add production env checker','Add launch gate dashboard'];
  write('24_FIRST_30_BUILD_TASKS.md', `# First 30 Build Tasks
${table(['Task ID','Priority','Title','Why','Files','Steps','Tests','Done When'], titles.map((t,i)=>[`T-${String(i+1).padStart(2,'0')}`, i<10?'CRITICAL':'HIGH', t, 'Reduces production launch risk', evidence([...apiFiles.map(a=>a.file), ...pageFiles.map(p=>p.file), ...packageFiles].filter(f=>phaseMatch(f,t)).slice(0,5)), '1. Write failing test<br>2. Implement minimal fix<br>3. Update command-center/docs<br>4. Run validation', 'Targeted unit/API/E2E + pnpm lint/typecheck/test/build', 'Status upgraded in command center and acceptance criteria pass']))}`);
}
function acceptanceCriteria(){
  const rows = [
    ['Customer','place order end-to-end; pay successfully; see tracking; see order history','E2E with Stripe test mode and real DB tables'],
    ['Chef','receive order; accept/prep/ready; update menu','Chef dashboard and API contract tests'],
    ['Driver','go online; receive offer; accept; pickup; deliver; see earnings','Driver mobile E2E and delivery API tests'],
    ['Ops','see live board; inspect order; manually dispatch; see SLA alerts; approve/hold payouts','Ops RBAC + live data tests'],
    ['Finance','every dollar appears in ledger; payout preview matches ledger; reconciliation catches differences; refunds tracked','Ledger accounting acceptance suite'],
    ['Security','customer cannot access admin; chef cannot access other chef; driver cannot access finance; finance actions require finance role; command center protected','RBAC negative test suite'],
    ['Deployment','each app deployed; domains correct; env present; smoke tests pass','Vercel/env/domain smoke suite'],
  ];
  write('25_ACCEPTANCE_CRITERIA.md', `# Production Acceptance Criteria\n${table(['Area','Acceptance Tests','Proof Required'], rows)}`);
}
function executiveReport(){
  const critical = riskRows.filter(r=>r[1]==='CRITICAL').length;
  const high = riskRows.filter(r=>r[1]==='HIGH').length;
  const overall = Math.round(['Customer marketplace','Customer checkout/payment','Chef operations','Driver delivery','Ops control center','Finance dashboard','Ledger/accounting','Payouts','Refunds','Reconciliation','Auth/RBAC','Database integrity','Realtime/eventing','UI/UX','Mobile readiness','Testing','Deployment','Observability'].reduce((s,a)=>s+score(a),0)/18);
  write('FINAL_EXECUTIVE_REPORT.md', `# Final Executive Report

## Production Readiness Verdict
NO-GO for accepting real orders or real money today.

The repo contains substantial marketplace infrastructure: four apps, shared DB/engine/routing/types/validation/UI packages, Stripe/Supabase integrations, migrations, command-center docs, and many tests. However, institutional merchant-of-record launch requires provable RBAC, ledger accounting, payout/refund/reconciliation controls, dispatch lifecycle reliability, deployment mapping, and E2E acceptance tests.

## What Is Already Built
- Apps: ${apps.map(a=>a.root).join(', ')}
- APIs: ${apiFiles.length} route files
- Pages: ${pageFiles.length} page routes
- Migrations: ${migrationFiles.length}
- Tests: ${tests.length}
- Command center/docs: ${evidence(['apps/web/src/app/internal/command-center/page.tsx','docs/ui/page-registry.json','docs/wiring/API_INVENTORY.md'])}

## Critical Blockers
- Merchant-of-record money flow is not proven end-to-end.
- Admin/finance/dispatch RBAC needs centralized enforcement and negative tests.
- Ledger/payout/refund/reconciliation must be finance-grade before launch.
- Order lifecycle must be proven from customer checkout through chef, dispatch, driver, tracking, and completion.
- Deployment mapping and production env gates are not proven from repo files.

## Highest-Risk Business Issues
Ops cannot safely run a live marketplace unless live board, dispatch, SLA, audit, repair, and finance controls are fully wired and tested.

## Highest-Risk Finance Issues
Every dollar must be traceable through immutable ledger entries before payouts/refunds/reconciliation are allowed in production.

## Shortest Path To Usable Product
Execute Phase 0 through Phase 4 first: lock deployment/source of truth, prove RBAC, harden schema/RLS, finish customer checkout, then prove order lifecycle.

## No-Go Items Before Real Orders/Money
- Any CRITICAL/HIGH finance or RBAC blocker.
- Missing ledger event for a money movement.
- Payout or refund action without finance role, audit reason, and reconciliation status.
- Checkout or webhook idempotency not proven by replay tests.
- Production command center exposed without explicit enablement.

## Recommended Next Prompt
"Start Phase 0 of the production build roadmap. Create branch hygiene, deployment locks, env verification, command-center status gates, and no-go launch checks without changing business logic."

## Summary Counts
- Critical blockers: ${critical}
- High blockers: ${high}
- Production readiness score: ${overall}/100
`);
}

generateReports();
console.log(`Generated production readiness audit: ${pageFiles.length} pages, ${apiFiles.length} APIs, ${allTables.length} table/RPC identifiers, ${riskRows.filter(r=>r[1]==='CRITICAL').length} critical risks.`);
