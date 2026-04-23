import { apiSuccess } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  return apiSuccess({
    status: 'ok',
    app: 'ops-admin',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
