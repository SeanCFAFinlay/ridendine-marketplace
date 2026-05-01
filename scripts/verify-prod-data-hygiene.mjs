/**
 * Phase 13 (IRR-015) — fail if GitHub Actions workflows could run Supabase seed/reset.
 * Local dev still uses `pnpm db:seed` / `db:reset` from the shell; those must never appear in CI/CD YAML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const workflowsDir = path.join(root, '.github', 'workflows');

const patterns = [
  { re: /\bdb:seed\b/, label: 'pnpm/npm script db:seed' },
  { re: /supabase\s+db\s+seed\b/i, label: 'supabase db seed' },
  { re: /supabase\s+db\s+reset\b/i, label: 'supabase db reset' },
];

function main() {
  if (!fs.existsSync(workflowsDir)) {
    console.log('OK: no .github/workflows directory');
    return;
  }

  const files = fs.readdirSync(workflowsDir).filter((n) => n.endsWith('.yml') || n.endsWith('.yaml'));

  const violations = [];
  for (const name of files) {
    const full = path.join(workflowsDir, name);
    const content = fs.readFileSync(full, 'utf8');
    for (const { re, label } of patterns) {
      if (re.test(content)) {
        violations.push({ file: name, label });
      }
    }
  }

  if (violations.length > 0) {
    console.error('IRR-015 / Phase 13: forbidden patterns in workflows:');
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.label}`);
    }
    process.exit(1);
  }

  console.log('OK: workflows contain no db:seed / supabase db seed / supabase db reset');
}

main();
