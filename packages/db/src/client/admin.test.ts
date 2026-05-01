import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('createAdminClient server-only boundary', () => {
  it('guards admin client usage to server runtime', () => {
    const filePath = join(__dirname, 'admin.ts');
    const src = readFileSync(filePath, 'utf8');
    expect(src).toContain("typeof window !== 'undefined'");
    expect(src).toContain('must only run on the server');
  });
});
