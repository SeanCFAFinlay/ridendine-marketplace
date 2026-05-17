import { Card, Badge } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, hasPlatformApiCapability } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasPlatformApiCapability(actor, 'audit_timeline_read')) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-4xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-2xl font-bold text-white">Access restricted</h1>
            <p className="mt-2 text-textMuted">
              Activity and audit views require ops admin, ops manager, or super admin.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const client = createAdminClient() as any;

  // Recent audit logs from ops actions
  const { data: auditLogs } = await client
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, actor_type, actor_id, actor_role, reason, created_at')
    .in('actor_type', ['admin', 'user'])
    .order('created_at', { ascending: false })
    .limit(100);

  // Ops override logs
  const { data: overrideLogs } = await client
    .from('ops_override_logs')
    .select('id, action, entity_type, entity_id, reason, actor_user_id, actor_role, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  // Get platform user names for display
  const actorIds = new Set<string>();
  for (const log of auditLogs || []) { if (log.actor_id) actorIds.add(log.actor_id); }
  for (const log of overrideLogs || []) { if (log.actor_user_id) actorIds.add(log.actor_user_id); }

  const { data: users } = actorIds.size > 0
    ? await client.from('platform_users').select('user_id, name, role').in('user_id', [...actorIds])
    : { data: [] };

  const userMap = new Map<string, { user_id: string; name: string; role: string }>(
    (users || []).map((u: any) => [u.user_id, u])
  );

  // Merge and sort all activity
  const activity = [
    ...(auditLogs || []).map((l: any) => ({
      id: l.id,
      type: 'audit' as const,
      action: l.action,
      entity: `${l.entity_type}/${l.entity_id?.slice(0, 8)}`,
      actor: userMap.get(l.actor_id)?.name || l.actor_role || 'System',
      role: userMap.get(l.actor_id)?.role || l.actor_role || l.actor_type,
      reason: l.reason,
      time: l.created_at,
    })),
    ...(overrideLogs || []).map((l: any) => ({
      id: `ovr-${l.id}`,
      type: 'override' as const,
      action: l.action,
      entity: `${l.entity_type}/${l.entity_id?.slice(0, 8)}`,
      actor: userMap.get(l.actor_user_id)?.name || l.actor_role || 'Unknown',
      role: l.actor_role,
      reason: l.reason,
      time: l.created_at,
    })),
  ].sort((a, b) => (a.time > b.time ? -1 : 1)).slice(0, 100);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Log</h1>
          <p className="mt-1 text-textMuted">Who did what, when — all ops team actions and overrides</p>
        </div>

        <Card className="border-border bg-surface overflow-hidden">
          {activity.length === 0 ? (
            <div className="p-8 text-center text-textMuted">No activity recorded yet.</div>
          ) : (
            <div className="divide-y divide-divider">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-4 px-4 py-3 hover:bg-surfaceMuted">
                  <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    item.type === 'override' ? 'bg-danger' : 'bg-info'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white">{item.actor}</span>
                      <Badge className={item.type === 'override' ? 'bg-danger/20 text-danger' : 'bg-info/20 text-info'}>
                        {item.type === 'override' ? 'Override' : item.action}
                      </Badge>
                      <span className="text-xs text-textMuted">{item.entity}</span>
                    </div>
                    {item.reason && <p className="mt-0.5 text-xs text-textMuted">{item.reason}</p>}
                  </div>
                  <span className="text-xs text-textMuted flex-shrink-0 whitespace-nowrap">
                    {new Date(item.time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
