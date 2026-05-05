import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { finalizeOpsActor, getEngine, getOpsActorContext, guardPlatformApi } from '@/lib/engine';
import { automationRuleCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

// Rules are stored in platform_settings.setting_value.automation_rules[]
interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  condition: string;
  action: string;
  params: Record<string, unknown>;
  createdAt: string;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'auto-suspend-chef-rejections',
    name: 'Auto-suspend chef after 3 rejections in 24h',
    enabled: false,
    trigger: 'order.rejected',
    condition: 'chef_rejections_24h >= 3',
    action: 'suspend_chef',
    params: { threshold: 3, windowHours: 24 },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'auto-flag-high-value-orders',
    name: 'Flag orders over $200 for review',
    enabled: false,
    trigger: 'order.created',
    condition: 'order_total >= 20000',
    action: 'create_exception',
    params: { thresholdCents: 20000, severity: 'medium' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'auto-pause-overloaded-storefront',
    name: 'Auto-pause storefront at queue capacity',
    enabled: false,
    trigger: 'kitchen_queue.updated',
    condition: 'queue_size >= max_queue_size',
    action: 'pause_storefront',
    params: {},
    createdAt: new Date().toISOString(),
  },
  {
    id: 'auto-escalate-long-wait',
    name: 'Escalate orders waiting 45+ minutes',
    enabled: false,
    trigger: 'sla.check',
    condition: 'order_age_minutes >= 45 AND status IN (pending, accepted)',
    action: 'create_exception',
    params: { thresholdMinutes: 45, severity: 'high' },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'auto-notify-low-driver-supply',
    name: 'Alert when online drivers < 3',
    enabled: false,
    trigger: 'driver.status_changed',
    condition: 'online_drivers < 3',
    action: 'create_system_alert',
    params: { threshold: 3, severity: 'warning' },
    createdAt: new Date().toISOString(),
  },
];

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_rules');
  if (denied) return denied;

  const client = createAdminClient() as any;
  const { data: settings } = await client.from('platform_settings').select('setting_value').limit(1).single();

  const rules: AutomationRule[] = settings?.setting_value?.automation_rules || DEFAULT_RULES;

  return NextResponse.json({ success: true, data: rules });
}

export async function PATCH(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'engine_rules'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, automationRuleCommandSchema);
  if (actionInput instanceof Response) return actionInput;
  const result = await getEngine().operations.execute(actionInput as OpsCommandInput, opsActor);
  return operationResultResponse(result);
}
