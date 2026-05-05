import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

type ChangeRequestStatus = 'requested' | 'planned' | 'in_progress' | 'done' | 'blocked';

interface ChangeRequest {
  id: string;
  pageId: string;
  title: string;
  type: 'feature' | 'bug' | 'design' | 'wiring' | 'docs';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: ChangeRequestStatus;
  description: string;
  filesLikelyAffected: string[];
  docsToUpdate: string[];
  createdAt: string;
  updatedAt: string;
}

const filePath = path.join(process.cwd(), '../../docs/ui/change-requests.json');

function isEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.INTERNAL_COMMAND_CENTER_ENABLED === 'true';
}

function forbidden() {
  return NextResponse.json({ error: 'Internal command center API is disabled.' }, { status: 403 });
}

function readStore(): { generatedAt: string; changeRequests: ChangeRequest[] } {
  if (!existsSync(filePath)) {
    return { generatedAt: new Date().toISOString(), changeRequests: [] };
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as { generatedAt: string; changeRequests: ChangeRequest[] };
}

function writeStore(store: { generatedAt: string; changeRequests: ChangeRequest[] }) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify({ ...store, generatedAt: new Date().toISOString() }, null, 2)}\n`);
}

function nextId(changeRequests: ChangeRequest[]) {
  const last = changeRequests
    .map((request) => Number(request.id.replace('CR-', '')))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a)[0] ?? 0;
  return `CR-${String(last + 1).padStart(4, '0')}`;
}

export async function GET() {
  if (!isEnabled()) return forbidden();
  return NextResponse.json(readStore());
}

export async function POST(request: NextRequest) {
  if (!isEnabled()) return forbidden();
  const body = await request.json();
  const now = new Date().toISOString();
  const store = readStore();
  const changeRequest: ChangeRequest = {
    id: nextId(store.changeRequests),
    pageId: String(body.pageId ?? ''),
    title: String(body.title ?? ''),
    type: body.type ?? 'feature',
    priority: body.priority ?? 'medium',
    status: body.status ?? 'requested',
    description: String(body.description ?? ''),
    filesLikelyAffected: Array.isArray(body.filesLikelyAffected) ? body.filesLikelyAffected : [],
    docsToUpdate: Array.isArray(body.docsToUpdate) ? body.docsToUpdate : [],
    createdAt: now,
    updatedAt: now,
  };

  if (!changeRequest.pageId || !changeRequest.title) {
    return NextResponse.json({ error: 'pageId and title are required.' }, { status: 400 });
  }

  store.changeRequests.push(changeRequest);
  writeStore(store);
  return NextResponse.json(store, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (!isEnabled()) return forbidden();
  const body = await request.json();
  const store = readStore();
  const index = store.changeRequests.findIndex((changeRequest) => changeRequest.id === body.id);

  if (index === -1) {
    return NextResponse.json({ error: 'Change request not found.' }, { status: 404 });
  }

  const current = store.changeRequests[index]!;
  store.changeRequests[index] = {
    ...current,
    ...body,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);
  return NextResponse.json(store);
}
