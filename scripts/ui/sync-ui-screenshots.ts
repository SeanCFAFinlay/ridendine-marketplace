import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'docs/ui/screenshots');
const targetDir = path.join(root, 'apps/web/public/screenshots');

if (!existsSync(sourceDir)) {
  throw new Error(`Missing screenshot source directory: ${sourceDir}`);
}

mkdirSync(targetDir, { recursive: true });

let count = 0;
for (const file of readdirSync(sourceDir)) {
  if (!file.endsWith('.png')) continue;
  copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
  count += 1;
}

console.log(`Synced ${count} UI screenshots to apps/web/public/screenshots.`);
