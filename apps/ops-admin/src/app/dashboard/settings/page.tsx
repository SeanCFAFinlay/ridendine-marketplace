import { Badge, Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine, getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { SettingsForm } from './settings-form';
import { MaintenanceToggle } from './maintenance-toggle';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const actor = await getOpsActorContext();
  const rules = await getEngine().ops.getPlatformRules();
  const canEdit = !!actor && hasRequiredRole(actor, ['super_admin']);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <MaintenanceToggle />

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Platform Rules</h1>
            <p className="mt-1 text-gray-400">
              Persisted business settings that now govern dispatch, refund review thresholds, and operating defaults.
            </p>
          </div>
          <Badge className={canEdit ? 'bg-emerald-500/20 text-emerald-200' : 'bg-gray-700 text-gray-200'}>
            {canEdit ? 'Editable' : 'Read only'}
          </Badge>
        </div>

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <div className="mb-6 grid gap-4 lg:grid-cols-4">
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Dispatch radius</p>
              <p className="mt-2 text-2xl font-semibold text-white">{rules.dispatchRadiusKm} km</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Offer timeout</p>
              <p className="mt-2 text-2xl font-semibold text-white">{rules.offerTimeoutSeconds}s</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Refund threshold</p>
              <p className="mt-2 text-2xl font-semibold text-white">${(rules.refundAutoReviewThresholdCents / 100).toFixed(2)}</p>
            </div>
            <div className="rounded-lg bg-[#1a1a2e] p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Last update</p>
              <p className="mt-2 text-lg font-semibold text-white">{new Date(rules.updatedAt).toLocaleString()}</p>
            </div>
          </div>

          <SettingsForm initialRules={rules} canEdit={canEdit} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
