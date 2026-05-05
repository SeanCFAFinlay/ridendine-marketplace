import { NextRequest, NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

function isEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.INTERNAL_COMMAND_CENTER_ENABLED === 'true';
}

function repoPath(relativePath: string) {
  const fromApp = path.join(process.cwd(), '../../', relativePath);
  if (existsSync(fromApp)) return fromApp;
  return path.join(process.cwd(), relativePath);
}

export async function GET(_request: NextRequest, { params }: { params: { docPath: string[] } }) {
  if (!isEnabled()) {
    return NextResponse.json({ error: 'Internal command center docs are disabled.' }, { status: 403 });
  }

  const relativePath = params.docPath.join('/');
  if (!relativePath.startsWith('docs/') || relativePath.includes('..')) {
    return NextResponse.json({ error: 'Invalid docs path.' }, { status: 400 });
  }

  const file = repoPath(relativePath);
  if (!existsSync(file)) {
    return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
  }

  return new NextResponse(readFileSync(file, 'utf8'), {
    headers: { 'content-type': 'text/markdown; charset=utf-8' },
  });
}
