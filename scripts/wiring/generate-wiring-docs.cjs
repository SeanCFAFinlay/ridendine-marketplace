const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'docs', 'wiring');
const diagramsDir = path.join(outDir, 'diagrams');

const apps = [
  { name: 'Customer Web', slug: 'web', root: 'apps/web', appDir: 'apps/web/src/app' },
  { name: 'Ops Admin', slug: 'ops-admin', root: 'apps/ops-admin', appDir: 'apps/ops-admin/src/app' },
  { name: 'Chef Admin', slug: 'chef-admin', root: 'apps/chef-admin', appDir: 'apps/chef-admin/src/app' },
  { name: 'Driver App', slug: 'driver-app', root: 'apps/driver-app', appDir: 'apps/driver-app/src/app' },
];

const scanPackages = ['packages/db', 'packages/engine', 'packages/types', 'packages/validation', 'packages/routing'];
const actionExpectations = {
  'Customer browse chefs/restaurants': ['apps/web/src/app/chefs/page.tsx', 'apps/web/src/app/api'],
  'Customer add item to cart': ['apps/web/src/app/cart/page.tsx', 'apps/web/src/contexts/cart-context.tsx', 'apps/web/src/app/api/cart/route.ts'],
  'Customer checkout': ['apps/web/src/app/checkout/page.tsx', 'apps/web/src/app/api/checkout/route.ts'],
  'Customer track order': ['apps/web/src/components/tracking', 'apps/web/src/app/api/orders/[id]/route.ts'],
  'Customer update address': ['apps/web/src/app/account/addresses/page.tsx', 'apps/web/src/app/api/addresses/route.ts'],
  'Chef accept order': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef mark preparing': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef mark ready': ['apps/chef-admin/src/app/dashboard/orders/page.tsx', 'apps/chef-admin/src/app/api/orders/[id]/route.ts'],
  'Chef update menu item': ['apps/chef-admin/src/app/dashboard/menu/page.tsx', 'apps/chef-admin/src/app/api/menu/[id]/route.ts'],
  'Chef toggle availability': ['apps/chef-admin/src/app/dashboard/availability/page.tsx', 'apps/chef-admin/src/app/api/storefront/availability/route.ts'],
  'Driver go online/offline': ['apps/driver-app/src/app/api/driver/presence/route.ts', 'apps/driver-app/src/app/page.tsx'],
  'Driver accept offer': ['apps/driver-app/src/app/api/offers/route.ts'],
  'Driver update location': ['apps/driver-app/src/app/api/location/route.ts'],
  'Driver mark picked up': ['apps/driver-app/src/app/api/deliveries/[id]/route.ts'],
  'Driver mark delivered': ['apps/driver-app/src/app/api/deliveries/[id]/route.ts'],
  'Driver request instant payout': ['apps/driver-app/src/app/api/payouts/instant/route.ts', 'apps/driver-app/src/app/earnings/page.tsx'],
  'Ops view live board': ['apps/ops-admin/src/app/dashboard/page.tsx', 'apps/ops-admin/src/app/api/ops/live-board/route.ts'],
  'Ops assign driver': ['apps/ops-admin/src/app/dashboard/dispatch/page.tsx', 'apps/ops-admin/src/app/api/engine/dispatch/route.ts'],
  'Ops review SLA alerts': ['apps/ops-admin/src/app/api/engine/processors/sla/route.ts', 'apps/ops-admin/src/components/ops-alerts.tsx'],
  'Ops inspect order': ['apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx', 'apps/ops-admin/src/app/api/orders/[id]/route.ts'],
  'Ops approve/hold payout': ['apps/ops-admin/src/app/dashboard/finance/payouts/page.tsx', 'apps/ops-admin/src/app/api/engine/payouts/execute/route.ts'],
  'Ops run reconciliation': ['apps/ops-admin/src/app/dashboard/finance/reconciliation/page.tsx', 'apps/ops-admin/src/app/api/engine/reconciliation/route.ts'],
};

function rel(p) {
  return path.relative(root, p).replace(/\\/g, '/');
}

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  const abs = path.join(root, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(path.join(root, dir))) return acc;
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const child = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) walk(child, predicate, acc);
    else if (!predicate || predicate(child)) acc.push(child);
  }
  return acc.sort();
}

function mdLink(file) {
  return `[${file}](../../${file})`;
}

function routeFromFile(appDir, file) {
  let route = file.replace(appDir, '').replace(/\/(page|route)\.tsx?$/, '');
  route = route.replace(/\/page$/, '');
  if (!route || route === '') return '/';
  route = route.replace(/\/\(.*?\)/g, '');
  return route.replace(/\[([^\]]+)\]/g, ':$1');
}

function endpointFromRouteFile(appDir, file) {
  return routeFromFile(appDir, file.replace(/route\.ts$/, 'page.tsx')).replace(/^\/api/, '/api');
}

function nearestLayout(appDir, file) {
  let dir = path.dirname(file);
  while (dir.startsWith(appDir)) {
    const candidate = path.join(dir, 'layout.tsx').replace(/\\/g, '/');
    if (exists(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  return `${appDir}/layout.tsx`;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))].sort();
}

function extractTables(text) {
  const tables = [];
  const patterns = [
    /\.from\(['"`]([^'"`]+)['"`]\)/g,
    /\.rpc\(['"`]([^'"`]+)['"`]\)/g,
    /from\s+public\.([a-zA-Z0-9_]+)/g,
    /(?:create table|alter table|drop table|create index).*?(?:public\.)?([a-zA-Z0-9_]+)/gi,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) tables.push(match[1]);
  }
  return unique(tables);
}

function extractApis(text) {
  const apis = [];
  const patterns = [/fetch\(['"`]([^'"`]+)['"`]/g, /axios\.(?:get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) apis.push(match[1]);
  }
  return unique(apis);
}

function extractPackages(text) {
  const packages = [];
  const pattern = /from ['"](@ridendine\/[^'"]+)['"]/g;
  let match;
  while ((match = pattern.exec(text))) packages.push(match[1]);
  return unique(packages);
}

function extractMethods(text) {
  const methods = [];
  const pattern = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g;
  let match;
  while ((match = pattern.exec(text))) methods.push(match[1]);
  return unique(methods);
}

function detectAuth(text, route) {
  if (/auth\.getUser|requireAdmin|requireOps|requireChef|requireDriver|createServerClient\(cookie|cookies\(\)|isApprovedDriver|redirect\('\/auth\/login/.test(text)) return 'Detected';
  if (route.startsWith('/auth') || route === '/' || route.startsWith('/about') || route.startsWith('/terms') || route.startsWith('/privacy')) return 'Public';
  return 'Undetected';
}

function statusFor({ auth, tables, apis, text }) {
  if (/redirect\(|notFound\(|permanentRedirect\(/.test(text)) return 'WIRED';
  if (/TODO|Coming Soon|not implemented|placeholder/i.test(text)) return 'PARTIAL';
  if (auth === 'Undetected' && tables.length === 0 && apis.length === 0 && !/static|metadata|return\s*\(/.test(text)) return 'MISSING';
  if (auth === 'Undetected' && (tables.length || apis.length)) return 'PARTIAL';
  return 'WIRED';
}

function collectRoutes() {
  const routes = [];
  for (const app of apps) {
    const pages = walk(app.appDir, (f) => f.endsWith('/page.tsx'));
    for (const file of pages) {
      const text = read(file);
      const route = routeFromFile(app.appDir, file);
      const tables = extractTables(text);
      const apis = extractApis(text);
      const packages = extractPackages(text);
      const auth = detectAuth(text, route);
      routes.push({
        app: app.name,
        slug: app.slug,
        route,
        file,
        layout: nearestLayout(app.appDir, file),
        auth,
        dataSource: [...tables.map((t) => `table:${t}`), ...packages].join(', ') || 'Static/client component/undetected',
        apis,
        tables,
        packages,
        status: statusFor({ auth, tables, apis, text }),
      });
    }
  }
  return routes;
}

function collectApis() {
  const apis = [];
  for (const app of apps) {
    const files = walk(app.appDir, (f) => f.endsWith('/route.ts') && f.includes('/api/'));
    for (const file of files) {
      const text = read(file);
      const methods = extractMethods(text);
      const tables = extractTables(text);
      const packages = extractPackages(text);
      const auth = detectAuth(text, '/api');
      const endpoint = endpointFromRouteFile(app.appDir, file);
      const external = unique([
        /stripe/i.test(text) ? 'Stripe' : '',
        /mapbox|osrm|routing/i.test(text) ? 'Routing provider' : '',
        /supabase/i.test(text) ? 'Supabase' : '',
        /sentry/i.test(text) ? 'Sentry' : '',
      ]);
      apis.push({
        app: app.name,
        endpoint,
        file,
        methods: methods.length ? methods : ['UNDETECTED'],
        request: /z\.object|Schema|parse\(|safeParse\(/.test(text) ? 'Validation/schema detectable' : 'Undetected',
        response: /NextResponse\.json|Response\.json/.test(text) ? 'JSON response' : 'Undetected',
        auth,
        packages,
        tables,
        external,
        status: methods.length ? statusFor({ auth, tables, apis: packages, text }) : 'PARTIAL',
      });
    }
  }
  return apis;
}

function collectDbEngine() {
  const migrationFiles = walk('supabase/migrations', (f) => f.endsWith('.sql'));
  const packageFiles = scanPackages.flatMap((dir) => walk(dir, (f) => /\.(ts|tsx|sql)$/.test(f) && !f.includes('node_modules')));
  const migrationText = migrationFiles.map(read).join('\n');
  const packageText = packageFiles.map(read).join('\n');
  const tables = extractTables(`${migrationText}\n${packageText}`);
  const services = packageFiles.filter((f) => /service|engine|orchestrator|repository|provider|schema|validation|route|eta|ledger|payout|dispatch|reconciliation/i.test(f));
  return { migrationFiles, packageFiles, tables, services };
}

function write(file, body) {
  fs.mkdirSync(path.dirname(path.join(outDir, file)), { recursive: true });
  fs.writeFileSync(path.join(outDir, file), body);
}

function table(headers, rows) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? '').replace(/\n/g, '<br>').replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

function generateRouteInventory(routes) {
  return `# Route Inventory

Generated from actual \`page.tsx\` files in \`apps/*/src/app\`.

${table(['App', 'Route URL', 'Page/component file', 'Layout file', 'Auth', 'Data source', 'API calls', 'DB tables', 'Status'], routes.map((r) => [
    r.app,
    `\`${r.route}\``,
    mdLink(r.file),
    mdLink(r.layout),
    r.auth,
    r.dataSource,
    r.apis.map((a) => `\`${a}\``).join(', ') || 'None detected',
    r.tables.map((t) => `\`${t}\``).join(', ') || 'None detected',
    r.status,
  ]))}
`;
}

function generateApiInventory(apis) {
  const rows = apis.flatMap((api) => api.methods.map((method) => [
    method,
    `\`${api.endpoint}\``,
    mdLink(api.file),
    api.request,
    api.response,
    api.auth,
    api.packages.join(', ') || 'None detected',
    api.tables.map((t) => `\`${t}\``).join(', ') || 'None detected',
    api.external.join(', ') || 'None detected',
    api.status,
  ]));
  return `# API Inventory

Generated from actual \`apps/*/src/app/api/**/route.ts\` files.

${table(['Method', 'Endpoint', 'File path', 'Request body/schema', 'Response shape', 'Auth check', 'Engine/package used', 'DB tables touched', 'External service', 'Status'], rows)}
`;
}

function generateDataEngineMap(map) {
  const serviceRows = map.services.map((file) => {
    const text = read(file);
    return [mdLink(file), extractTables(text).map((t) => `\`${t}\``).join(', ') || 'None detected', extractPackages(text).join(', ') || 'None detected'];
  });
  return `# Data And Engine Map

## Tables And RPCs Detected

${map.tables.map((t) => `- \`${t}\``).join('\n') || '- None detected'}

## Migration Sources

${map.migrationFiles.map((f) => `- ${mdLink(f)}`).join('\n') || '- No migration files found'}

## Core Services And Packages

${table(['Source file', 'Tables/RPCs touched', 'Ridéndine packages imported'], serviceRows)}

## Public Order Stage Flow

\`\`\`mermaid
flowchart LR
  Orders["orders table"] --> Engine["packages/engine order orchestration"]
  Engine --> PublicStage["packages/types public order stage"]
  PublicStage --> CustomerTracking["Customer tracking surfaces"]
  PublicStage --> OpsLive["Ops live board"]
\`\`\`

## Ledger Flow

\`\`\`mermaid
flowchart LR
  Payment["Stripe/order payment"] --> Ledger["ledger-related engine services"]
  Ledger --> ChefPayable["Chef payable records"]
  Ledger --> DriverPayable["Driver payable records"]
  Ledger --> Reconciliation["Reconciliation APIs/pages"]
\`\`\`

## Payout Flow

\`\`\`mermaid
flowchart LR
  ChefDashboard["Chef payout pages/APIs"] --> PayoutEngine["packages/engine payout services"]
  DriverEarnings["Driver earnings/instant payout APIs"] --> PayoutEngine
  OpsPayouts["Ops payout controls"] --> PayoutEngine
  PayoutEngine --> Supabase["Supabase payout/ledger tables detected above"]
\`\`\`

## Dispatch Flow

\`\`\`mermaid
flowchart LR
  OpsDispatch["Ops dispatch page/API"] --> DispatchEngine["packages/engine dispatch orchestration"]
  DispatchEngine --> DriverOffers["Driver offers API"]
  DriverOffers --> DeliveryUpdates["Driver delivery APIs"]
  DeliveryUpdates --> OrderState["Order/delivery state"]
\`\`\`

## Reconciliation Flow

\`\`\`mermaid
flowchart LR
  StripeWebhook["Stripe webhook APIs"] --> Engine["Engine finance/reconciliation services"]
  Engine --> OpsRecon["Ops reconciliation page/API"]
  OpsRecon --> Audit["Audit/recent APIs where detected"]
\`\`\`

## ETA / Routing Flow

\`\`\`mermaid
flowchart LR
  Address["Customer/driver location data"] --> RoutingPackage["packages/routing"]
  RoutingPackage --> Provider["Mapbox/OSRM provider when configured"]
  Provider --> ETA["ETA/progress services"]
  ETA --> Tracking["Customer tracking and ops map surfaces"]
\`\`\`

## Stripe Webhook Flow

\`\`\`mermaid
flowchart LR
  Stripe["Stripe"] --> WebWebhook["apps/web API webhook"]
  Stripe --> OpsWebhook["apps/ops-admin API webhook"]
  WebWebhook --> Orders["Orders/payment status"]
  OpsWebhook --> Finance["Finance/reconciliation controls"]
\`\`\`
`;
}

const diagrams = {
  'FULL_SYSTEM_CONTEXT.md': `# Full System Context

\`\`\`mermaid
flowchart TB
  Customer["Customer app apps/web"] --> Supabase["Supabase Auth + DB"]
  Chef["Chef admin apps/chef-admin"] --> Supabase
  Driver["Driver app apps/driver-app"] --> Supabase
  Ops["Ops admin apps/ops-admin"] --> Supabase
  Customer --> Stripe["Stripe"]
  Ops --> Stripe
  Driver --> Routing["Routing provider via packages/routing"]
  Ops --> Routing
  Vercel["Vercel hosting"] --> Customer
  Vercel --> Chef
  Vercel --> Driver
  Vercel --> Ops
  Shared["Shared packages: ui, db, engine, types, validation, routing, auth, utils"] --> Customer
  Shared --> Chef
  Shared --> Driver
  Shared --> Ops
\`\`\`
`,
  'CUSTOMER_ORDER_FLOW.md': `# Customer Order Flow

\`\`\`mermaid
flowchart LR
  Browse["Browse chefs/restaurants"] --> Menu["Chef menu"]
  Menu --> Cart["Cart"]
  Cart --> Checkout["Checkout API"]
  Checkout --> OrderCreated["Order created"]
  OrderCreated --> ChefQueue["Chef receives order"]
  ChefQueue --> Dispatch["Driver dispatch"]
  Dispatch --> Tracking["Customer tracking"]
  Tracking --> Completed["Completed order"]
\`\`\`
`,
  'CHEF_ORDER_FLOW.md': `# Chef Order Flow

\`\`\`mermaid
flowchart LR
  Login["Chef login"] --> Queue["Order queue"]
  Queue --> Accept["Accept order"]
  Accept --> Prep["Mark preparing"]
  Prep --> Ready["Mark ready"]
  Ready --> PublicStage["Public order stage update"]
  PublicStage --> Ops["Ops visibility"]
\`\`\`
`,
  'DRIVER_DELIVERY_FLOW.md': `# Driver Delivery Flow

\`\`\`mermaid
flowchart LR
  Online["Driver online"] --> Offer["Offer API/screen"]
  Offer --> Accept["Accept offer"]
  Accept --> Pickup["Pickup progression"]
  Pickup --> Dropoff["Delivery progression"]
  Dropoff --> Complete["Completion"]
  Complete --> Ledger["Payout ledger/earnings"]
\`\`\`
`,
  'OPS_CONTROL_FLOW.md': `# Ops Control Flow

\`\`\`mermaid
flowchart LR
  Dashboard["Ops dashboard"] --> Dispatch["Dispatch"]
  Dashboard --> Finance["Finance"]
  Finance --> Recon["Reconciliation"]
  Finance --> Payouts["Payout controls"]
  Dispatch --> Audit["Audit timeline/activity"]
  Recon --> Audit
  Payouts --> Audit
\`\`\`
`,
  'FINANCE_LEDGER_FLOW.md': `# Finance Ledger Flow

\`\`\`mermaid
flowchart LR
  Payment["Order payment"] --> Fee["Platform fee"]
  Payment --> Chef["Chef payable"]
  Payment --> Driver["Driver payable"]
  Chef --> Run["Payout run"]
  Driver --> Run
  Run --> Reconciliation["Reconciliation"]
\`\`\`
`,
  'AUTH_RBAC_FLOW.md': `# Auth RBAC Flow

\`\`\`mermaid
flowchart TB
  SupabaseAuth["Supabase auth"] --> Customer["Customer role -> apps/web account/cart/checkout"]
  SupabaseAuth --> Chef["Chef role -> apps/chef-admin dashboard"]
  SupabaseAuth --> Driver["Driver role -> apps/driver-app delivery/earnings"]
  SupabaseAuth --> Ops["Ops/admin role -> apps/ops-admin dashboard"]
  Middleware["App middleware and server auth checks"] --> Customer
  Middleware --> Chef
  Middleware --> Driver
  Middleware --> Ops
\`\`\`
`,
  'REALTIME_EVENT_FLOW.md': `# Realtime Event Flow

\`\`\`mermaid
flowchart LR
  API["API routes"] --> Engine["Engine events"]
  Engine --> Sanitizer["Public broadcast sanitizer"]
  Sanitizer --> Customer["Customer tracking"]
  Sanitizer --> Ops["Ops live board"]
  Engine --> Chef["Chef queue state"]
  Engine --> Driver["Driver state"]
\`\`\`
`,
};

function generatePageMatrix(routes) {
  return `# Page Wiring Matrix

${table(['App', 'Page', 'Route', 'Reads From', 'Writes To', 'Calls API', 'Shared Components', 'Auth Role', 'Status', 'Missing Wiring'], routes.map((r) => [
    r.app,
    mdLink(r.file),
    `\`${r.route}\``,
    r.tables.map((t) => `\`${t}\``).join(', ') || r.packages.join(', ') || 'Static/undetected',
    /POST|PATCH|PUT|DELETE|insert|update|delete|upsert/.test(read(r.file)) ? 'Detected write path in page/client flow' : 'None detected in page',
    r.apis.map((a) => `\`${a}\``).join(', ') || 'None detected',
    /@ridendine\/ui/.test(read(r.file)) ? '@ridendine/ui' : 'Undetected',
    r.auth,
    r.status,
    r.status === 'WIRED' ? '' : 'Review auth/data/API wiring',
  ]))}
`;
}

function generateActionMap(apis) {
  const rows = Object.entries(actionExpectations).map(([action, files]) => {
    const present = files.filter((f) => exists(f) || fs.existsSync(path.join(root, f)));
    const missing = files.filter((f) => !exists(f) && !fs.existsSync(path.join(root, f)));
    const relatedApi = apis.find((api) => files.some((f) => api.file.startsWith(f.replace('/route.ts', '')) || f.includes(api.file)));
    return [
      action,
      present.map(mdLink).join('<br>') || 'MISSING',
      relatedApi ? `\`${relatedApi.endpoint}\`` : 'MISSING/PARTIAL',
      relatedApi?.request || 'Undetected',
      relatedApi?.packages.join(', ') || 'Undetected',
      relatedApi?.tables.map((t) => `\`${t}\``).join(', ') || 'Undetected',
      relatedApi?.status || 'PARTIAL',
      missing.length ? `Missing expected source: ${missing.join(', ')}` : 'No missing source file from expected path list',
    ];
  });
  return `# Action Map

${table(['User action', 'Component/source file', 'API route', 'Validation schema', 'Engine/package', 'DB table/event target', 'Status', 'Notes'], rows)}
`;
}

function generateMissing(routes, apis) {
  const critical = [
    ...routes.filter((r) => r.status === 'MISSING').map((r) => [r.app, r.file, `Route ${r.route} has MISSING status`, 'Add/restore page implementation or remove route if obsolete', 'Phase 1']),
    ...apis.filter((a) => a.methods.includes('UNDETECTED')).map((a) => [a.app, a.file, `API ${a.endpoint} has no detectable HTTP method export`, 'Add explicit GET/POST/PATCH/PUT/DELETE export or remove dead route file', 'Phase 1']),
  ];
  const high = [
    ...routes.filter((r) => r.status === 'PARTIAL').map((r) => [r.app, r.file, `Route ${r.route} is partially wired`, 'Review auth/data/API path and complete missing state surfaces', 'Phase 2']),
    ...apis.filter((a) => a.status === 'PARTIAL').map((a) => [a.app, a.file, `API ${a.endpoint} is partially detectable`, 'Document or strengthen auth/schema/service wiring', 'Phase 2']),
  ];
  const medium = routes.filter((r) => r.auth === 'Undetected').slice(0, 40).map((r) => [r.app, r.file, `Auth requirement not detectable for ${r.route}`, 'Confirm public/protected intent and document explicitly in code or route docs', 'Phase 3']);
  const low = [['All apps', 'packages/ui and app component files', 'Visual/status conventions still vary on older real pages', 'Gradually migrate pages to shared status/loading/error components', 'Phase 4']];
  const section = (title, rows) => `## ${title}\n\n${rows.length ? table(['App', 'File', 'Problem', 'Required fix', 'Suggested phase'], rows.map((r) => [r[0], mdLink(r[1]), r[2], r[3], r[4]])) : 'No issues detected by scanner.'}\n`;
  return `# Missing Wiring Report

Scanner statuses are conservative. Undetectable wiring is marked for review rather than guessed.

${section('CRITICAL', critical)}
${section('HIGH', high)}
${section('MEDIUM', medium)}
${section('LOW', low)}
`;
}

function generateMaster(routes, apis) {
  const appRouteCounts = apps.map((app) => `${app.name}: ${routes.filter((r) => r.slug === app.slug).length}`).join(', ');
  const appApiCounts = apps.map((app) => `${app.name}: ${apis.filter((a) => a.app === app.name).length}`).join(', ');
  return `# Ridéndine Master Wiring Diagram

## System Diagram

\`\`\`mermaid
flowchart TB
  Web["apps/web customer"] --> WebApi["Customer APIs"]
  Chef["apps/chef-admin"] --> ChefApi["Chef APIs"]
  Driver["apps/driver-app"] --> DriverApi["Driver APIs"]
  Ops["apps/ops-admin"] --> OpsApi["Ops APIs"]
  WebApi --> DB["Supabase DB/Auth"]
  ChefApi --> DB
  DriverApi --> DB
  OpsApi --> DB
  WebApi --> Stripe["Stripe"]
  OpsApi --> Stripe
  DriverApi --> Routing["packages/routing / provider"]
  OpsApi --> Engine["packages/engine"]
  ChefApi --> Engine
  WebApi --> Engine
  DriverApi --> Engine
  Engine --> Types["packages/types"]
  Engine --> Validation["packages/validation"]
\`\`\`

## Route Map

Detected page routes: ${routes.length}. ${appRouteCounts}.

\`\`\`mermaid
flowchart LR
  WebRoutes["apps/web routes"] --> CustomerApis["Customer APIs"]
  ChefRoutes["chef-admin routes"] --> ChefApis["Chef APIs"]
  DriverRoutes["driver-app routes"] --> DriverApis["Driver APIs"]
  OpsRoutes["ops-admin routes"] --> OpsApis["Ops APIs"]
\`\`\`

## API Map

Detected API route files: ${apis.length}. ${appApiCounts}.

\`\`\`mermaid
flowchart TB
  APIs["apps/*/src/app/api"] --> Auth["Auth checks where detected"]
  APIs --> Validation["Schemas / safeParse where detected"]
  APIs --> Engine["Engine/services/packages"]
  APIs --> Tables["Supabase tables/RPCs"]
  APIs --> External["Stripe/routing/Supabase external clients"]
\`\`\`

## Order Lifecycle Map

\`\`\`mermaid
flowchart LR
  Browse --> Cart --> Checkout --> OrdersTable["orders"]
  OrdersTable --> ChefQueue --> Dispatch --> DriverDelivery --> Tracking --> Completed
\`\`\`

## Finance Lifecycle Map

\`\`\`mermaid
flowchart LR
  StripePayment --> OrderPaymentStatus --> Ledger --> ChefPayout --> DriverPayout --> Reconciliation --> Audit
\`\`\`

## Realtime State Map

\`\`\`mermaid
flowchart LR
  EngineEvents --> Sanitizer["public broadcast sanitizer"]
  Sanitizer --> CustomerTracking
  Sanitizer --> OpsLiveBoard
  EngineEvents --> ChefQueue
  EngineEvents --> DriverOfferDeliveryState
\`\`\`

## App Dependency Map

\`\`\`mermaid
flowchart TB
  UI["@ridendine/ui"] --> Web
  UI --> Chef
  UI --> Driver
  UI --> Ops
  DB["@ridendine/db"] --> Web
  DB --> Chef
  DB --> Driver
  DB --> Ops
  Engine["@ridendine/engine"] --> Ops
  Engine --> Web
  Routing["@ridendine/routing"] --> Driver
  Routing --> Ops
\`\`\`
`;
}

function generateHtml(routes, apis) {
  const cards = apps.map((app) => {
    const appRoutes = routes.filter((r) => r.slug === app.slug);
    const appApis = apis.filter((a) => a.app === app.name);
    return `<section class="card"><h2>${app.name}</h2><p>${appRoutes.length} pages · ${appApis.length} APIs</p><ul>${appRoutes.slice(0, 12).map((r) => `<li><span class="${r.status.toLowerCase()}">${r.status}</span> ${r.route}</li>`).join('')}</ul></section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Ridéndine Wiring Viewer</title>
  <style>
    body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #080b10; color: #e5edf7; }
    main { max-width: 1200px; margin: 0 auto; padding: 32px; }
    h1 { font-size: 40px; margin: 0 0 8px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; }
    .card { border: 1px solid rgba(255,255,255,.12); background: #111827; border-radius: 18px; padding: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.25); }
    .wired { color: #22c55e; font-weight: 700; }
    .partial { color: #f59e0b; font-weight: 700; }
    .missing { color: #ef4444; font-weight: 700; }
    a { color: #fbbf24; }
    li { margin: 8px 0; }
    pre { overflow: auto; background: #020617; border: 1px solid rgba(255,255,255,.1); border-radius: 14px; padding: 16px; }
  </style>
</head>
<body>
  <main>
    <h1>Ridéndine Wiring Viewer</h1>
    <p>Static index for generated wiring docs. Status colors: <span class="wired">WIRED</span>, <span class="partial">PARTIAL</span>, <span class="missing">MISSING</span>.</p>
    <div class="grid">${cards}</div>
    <section class="card">
      <h2>Documents</h2>
      <p><a href="./ROUTE_INVENTORY.md">Route inventory</a> · <a href="./API_INVENTORY.md">API inventory</a> · <a href="./PAGE_WIRING_MATRIX.md">Page matrix</a> · <a href="./RIDENDINE_MASTER_WIRING_DIAGRAM.md">Master diagram</a></p>
    </section>
    <section class="card">
      <h2>Mermaid Overview</h2>
      <pre>flowchart TB
  Customer --> APIs
  Chef --> APIs
  Driver --> APIs
  Ops --> APIs
  APIs --> Supabase
  APIs --> Engine
  APIs --> Stripe
  Engine --> Realtime</pre>
    </section>
  </main>
</body>
</html>`;
}

function generateCompletion(routes, apis, map) {
  return `# Wiring Completion Report

## Files Created

- \`docs/wiring/ROUTE_INVENTORY.md\`
- \`docs/wiring/API_INVENTORY.md\`
- \`docs/wiring/DATA_ENGINE_MAP.md\`
- \`docs/wiring/PAGE_WIRING_MATRIX.md\`
- \`docs/wiring/ACTION_MAP.md\`
- \`docs/wiring/MISSING_WIRING_REPORT.md\`
- \`docs/wiring/RIDENDINE_MASTER_WIRING_DIAGRAM.md\`
- \`docs/wiring/index.html\`
- \`docs/wiring/diagrams/*.md\`

## Diagrams Created

${Object.keys(diagrams).map((d) => `- \`docs/wiring/diagrams/${d}\``).join('\n')}

## Pages Discovered

${routes.length} page routes discovered.

${apps.map((app) => `- ${app.name}: ${routes.filter((r) => r.slug === app.slug).length}`).join('\n')}

## APIs Discovered

${apis.length} API route files discovered.

${apps.map((app) => `- ${app.name}: ${apis.filter((a) => a.app === app.name).length}`).join('\n')}

## Packages Discovered

${scanPackages.map((p) => `- \`${p}\``).join('\n')}

## Database / Engine Sources

- Migration files: ${map.migrationFiles.length}
- Data/engine/type/validation/routing source files scanned: ${map.packageFiles.length}
- Tables/RPC identifiers detected: ${map.tables.length}

## Missing Connections

See \`docs/wiring/MISSING_WIRING_REPORT.md\`. Scanner marks undetectable auth/data wiring as review work instead of guessing.

## Critical Risks

- API route files with no detectable method export are critical if present.
- Finance/admin endpoints should be reviewed manually even when marked WIRED because static scanning cannot prove authorization depth.
- UI-only pages with no detectable API/table use may be static by design or may need data wiring review.

## Recommended Next Build Phases

1. Add explicit route metadata comments for auth role, tables, and API dependencies.
2. Upgrade scanner to read those metadata blocks and reduce false PARTIAL findings.
3. Add route smoke tests for every page listed in \`PAGE_WIRING_MATRIX.md\`.
4. Add API contract tests for every route listed in \`API_INVENTORY.md\`.
5. Review all finance and dispatch actions against RBAC requirements.
`;
}

function main() {
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(diagramsDir, { recursive: true });
  const routes = collectRoutes();
  const apis = collectApis();
  const map = collectDbEngine();

  write('ROUTE_INVENTORY.md', generateRouteInventory(routes));
  write('API_INVENTORY.md', generateApiInventory(apis));
  write('DATA_ENGINE_MAP.md', generateDataEngineMap(map));
  write('PAGE_WIRING_MATRIX.md', generatePageMatrix(routes));
  write('ACTION_MAP.md', generateActionMap(apis));
  write('MISSING_WIRING_REPORT.md', generateMissing(routes, apis));
  write('RIDENDINE_MASTER_WIRING_DIAGRAM.md', generateMaster(routes, apis));
  write('index.html', generateHtml(routes, apis));
  write('WIRING_COMPLETION_REPORT.md', generateCompletion(routes, apis, map));
  for (const [file, body] of Object.entries(diagrams)) write(path.join('diagrams', file), body);

  console.log(`Generated wiring docs: ${routes.length} pages, ${apis.length} API route files, ${map.tables.length} table/RPC identifiers.`);
}

main();
