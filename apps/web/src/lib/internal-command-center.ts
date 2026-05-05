import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export type CommandCenterStatus = 'WIRED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';

export interface CommandCenterPage {
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
  status: CommandCenterStatus;
  missingWiring: string[];
  changeRequests: string[];
  implementationNotes?: string[];
}

export interface CommandCenterRegistry {
  generatedAt: string;
  pages: CommandCenterPage[];
}

export interface CommandCenterChangeRequest {
  id: string;
  pageId: string;
  title: string;
  type: 'feature' | 'bug' | 'design' | 'wiring' | 'docs';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'requested' | 'planned' | 'in_progress' | 'done' | 'blocked';
  description: string;
  filesLikelyAffected: string[];
  docsToUpdate: string[];
  createdAt: string;
  updatedAt: string;
}

function repoPath(relativePath: string) {
  const fromApp = path.join(process.cwd(), '../../', relativePath);
  if (existsSync(fromApp)) return fromApp;
  return path.join(process.cwd(), relativePath);
}

export function loadCommandCenterRegistry(): CommandCenterRegistry {
  const file = repoPath('docs/ui/page-registry.json');
  return JSON.parse(readFileSync(file, 'utf8')) as CommandCenterRegistry;
}

export function loadCommandCenterChangeRequests(): CommandCenterChangeRequest[] {
  const file = repoPath('docs/ui/change-requests.json');
  if (!existsSync(file)) return [];
  const payload = JSON.parse(readFileSync(file, 'utf8')) as { changeRequests: CommandCenterChangeRequest[] };
  return payload.changeRequests;
}
