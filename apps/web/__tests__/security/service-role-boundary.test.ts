/**
 * @jest-environment node
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walkFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('service-role boundaries', () => {
  it('does not import createAdminClient from use-client modules', () => {
    const srcRoot = join(__dirname, '../../src');
    const files = walkFiles(srcRoot);

    const violations = files.filter((filePath) => {
      const content = readFileSync(filePath, 'utf8');
      const isClient = content.includes("'use client'") || content.includes('"use client"');
      const importsAdminClient =
        content.includes("createAdminClient") &&
        (content.includes("from '@ridendine/db'") || content.includes('from "@ridendine/db"'));
      return isClient && importsAdminClient;
    });

    expect(violations).toEqual([]);
  });
});
