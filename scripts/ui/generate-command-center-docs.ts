import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type Status = 'WIRED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';

interface PageEntry {
  id: string;
  app: string;
  name: string;
  route: string;
  screenshot: string;
  publicScreenshot: string;
  designIntent: string;
  components: string[];
  apis: string[];
  dbTables: string[];
  packages: string[];
  docs: string[];
  status: Status;
  missingWiring: string[];
  changeRequests: string[];
  implementationNotes?: string[];
}

interface ChangeRequest {
  id: string;
  pageId: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  description: string;
  filesLikelyAffected: string[];
  docsToUpdate: string[];
  createdAt: string;
  updatedAt: string;
}

const root = process.cwd();
const registryPath = path.join(root, 'docs/ui/page-registry.json');
const changePath = path.join(root, 'docs/ui/change-requests.json');

function readJson<T>(file: string, fallback: T): T {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) as T : fallback;
}

function writeDoc(file: string, body: string) {
  writeFileSync(path.join(root, file), `${body.trim()}\n`);
}

function list(values: string[]) {
  return values.length ? values.map((value) => `\`${value}\``).join(', ') : 'None';
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map((cell) => cell.replace(/\|/g, '\\|')).join(' | ')} |`),
  ].join('\n');
}

const registry = readJson<{ generatedAt: string; pages: PageEntry[] }>(registryPath, { generatedAt: new Date().toISOString(), pages: [] });
const changes = readJson<{ generatedAt: string; changeRequests: ChangeRequest[] }>(changePath, { generatedAt: new Date().toISOString(), changeRequests: [] });
const wiringMatrixExists = existsSync(path.join(root, 'docs/wiring/PAGE_WIRING_MATRIX.md'));
const apiInventoryExists = existsSync(path.join(root, 'docs/wiring/API_INVENTORY.md'));

const counts = registry.pages.reduce<Record<Status, number>>((acc, page) => {
  acc[page.status] += 1;
  return acc;
}, { WIRED: 0, PARTIAL: 0, MISSING: 0, UNKNOWN: 0 });

writeDoc('docs/ui/COMMAND_CENTER.md', `# Ridéndine Command Center

Generated: ${new Date().toISOString()}

Open locally at \`http://localhost:3000/internal/command-center\`.

## Summary

- Total pages: ${registry.pages.length}
- WIRED: ${counts.WIRED}
- PARTIAL: ${counts.PARTIAL}
- MISSING: ${counts.MISSING}
- UNKNOWN: ${counts.UNKNOWN}
- Open change requests: ${changes.changeRequests.filter((cr) => !['done', 'blocked'].includes(cr.status)).length}

## Pages

${table(['Page', 'App', 'Route', 'Status', 'Screenshot', 'Docs'], registry.pages.map((page) => [
  page.name,
  page.app,
  `\`${page.route}\``,
  page.status,
  `\`${page.screenshot}\``,
  page.docs.map((doc) => `\`${doc}\``).join('<br>'),
]))}

## Wiring Maps

- \`docs/wiring/ROUTE_INVENTORY.md\`
- \`docs/wiring/API_INVENTORY.md\`
- \`docs/wiring/PAGE_WIRING_MATRIX.md\`
- \`docs/wiring/MISSING_WIRING_REPORT.md\`
- \`docs/wiring/RIDENDINE_MASTER_WIRING_DIAGRAM.md\`
`);

writeDoc('docs/ui/PAGE_STATUS_REPORT.md', `# Page Status Report

Generated from \`docs/ui/page-registry.json\`.

${table(['Page', 'App', 'Status', 'Components', 'APIs', 'DB tables', 'Packages', 'Missing wiring'], registry.pages.map((page) => [
  page.name,
  page.app,
  page.status,
  list(page.components),
  list(page.apis),
  list(page.dbTables),
  list(page.packages),
  page.missingWiring.join('<br>') || 'None',
]))}
`);

writeDoc('docs/ui/CHANGE_REQUESTS.md', `# Change Requests

Generated from \`docs/ui/change-requests.json\`.

${changes.changeRequests.length ? table(['ID', 'Page', 'Title', 'Type', 'Priority', 'Status', 'Docs to update'], changes.changeRequests.map((cr) => [
  cr.id,
  cr.pageId,
  cr.title,
  cr.type,
  cr.priority,
  cr.status,
  cr.docsToUpdate.map((doc) => `\`${doc}\``).join('<br>') || 'None',
])) : 'No change requests recorded yet.'}
`);

writeDoc('docs/ui/DOCS_SYNC_REPORT.md', `# Docs Sync Report

Generated: ${new Date().toISOString()}

## Sources

- Registry exists: ${existsSync(registryPath) ? 'yes' : 'no'}
- Change request file exists: ${existsSync(changePath) ? 'yes' : 'no'}
- Wiring matrix exists: ${wiringMatrixExists ? 'yes' : 'no'}
- API inventory exists: ${apiInventoryExists ? 'yes' : 'no'}

## Drift Checks

${table(['Check', 'Result'], [
  ['Every page screenshot exists in docs', registry.pages.every((page) => existsSync(path.join(root, page.screenshot))) ? 'PASS' : 'FAIL'],
  ['Every page public screenshot exists', registry.pages.every((page) => existsSync(path.join(root, `apps/web/public${page.publicScreenshot}`))) ? 'PASS' : 'FAIL'],
  ['Every linked doc exists', registry.pages.every((page) => page.docs.every((doc) => existsSync(path.join(root, doc)))) ? 'PASS' : 'FAIL'],
  ['Change request page IDs exist in registry', changes.changeRequests.every((cr) => registry.pages.some((page) => page.id === cr.pageId)) ? 'PASS' : 'FAIL'],
])}
`);

console.log(`Generated command center docs for ${registry.pages.length} pages and ${changes.changeRequests.length} change requests.`);
