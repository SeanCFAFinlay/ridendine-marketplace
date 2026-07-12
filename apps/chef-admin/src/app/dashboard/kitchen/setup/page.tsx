// ==========================================
// KITCHEN SETUP / ONBOARDING (Ghost-Kitchen)
//
// A guided checklist an operator works through to bring a commissary kitchen
// online: suppliers -> inventory -> recipes -> staff -> labour tracking. Reads
// live counts for the operator's kitchen (server-rendered, no spinner) and
// routes each step to the existing functional page. Steps reflect reality —
// nothing is faked; an incomplete step shows what's missing and where to fix it.
// ==========================================

import Link from 'next/link';
import { createAdminClient } from '@ridendine/db';
import { getKitchenScopeData } from '@/lib/kitchen-scope';

export const dynamic = 'force-dynamic';

type StepStatus = { count: number; done: boolean };

export default async function KitchenSetupPage() {
  const scope = await getKitchenScopeData();

  if (!scope) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-border bg-surface p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-text">Kitchen setup</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-textMuted">
            This checklist is for commissary operators. Your account isn&apos;t attached to a
            multi-brand kitchen yet.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const brandIds = scope.brands.map((b) => b.id);
  const kId = scope.kitchenId;
  const headCount = { count: 'exact' as const, head: true };

  const [suppliersRes, inventoryRes, staffRes, timeRes, recipesRes] = await Promise.all([
    admin.from('suppliers').select('id', headCount).eq('kitchen_id', kId),
    admin.from('inventory_items').select('id', headCount).eq('kitchen_id', kId),
    admin.from('kitchen_staff').select('id', headCount).eq('kitchen_id', kId),
    admin.from('time_entries').select('id', headCount).eq('kitchen_id', kId),
    brandIds.length > 0
      ? admin.from('recipes').select('id', headCount).in('storefront_id', brandIds)
      : Promise.resolve({ count: 0 }),
  ]);

  const suppliers = suppliersRes.count ?? 0;
  const inventory = inventoryRes.count ?? 0;
  const staff = staffRes.count ?? 0;
  const timeEntries = timeRes.count ?? 0;
  const recipes = recipesRes.count ?? 0;

  const steps: {
    key: string;
    title: string;
    description: string;
    href: string;
    cta: string;
    status: StepStatus;
    metric: (n: number) => string;
  }[] = [
    {
      key: 'suppliers',
      title: 'Add your suppliers',
      description:
        'Who you buy from. Suppliers hold the pack sizes and prices that keep ingredient costs accurate.',
      href: '/dashboard/suppliers',
      cta: 'Manage suppliers',
      status: { count: suppliers, done: suppliers > 0 },
      metric: (n) => `${n} supplier${n === 1 ? '' : 's'}`,
    },
    {
      key: 'inventory',
      title: 'Stock your inventory',
      description:
        'The shared ingredient pool every brand draws from. Set pars and reorder points so low-stock alerts work.',
      href: '/dashboard/inventory',
      cta: 'Open inventory',
      status: { count: inventory, done: inventory > 0 },
      metric: (n) => `${n} item${n === 1 ? '' : 's'}`,
    },
    {
      key: 'recipes',
      title: 'Build your recipes',
      description:
        'Map each menu item to the ingredients it uses. Recipes drive food cost, auto stock decrement, and prep planning.',
      href: '/dashboard/recipes',
      cta: 'Open recipes',
      status: { count: recipes, done: recipes > 0 },
      metric: (n) => `${n} recipe${n === 1 ? '' : 's'}`,
    },
    {
      key: 'staff',
      title: 'Add kitchen staff',
      description: 'The line, prep, and expo team. Each staff member carries an hourly rate used for labour cost.',
      href: '/dashboard/labor',
      cta: 'Manage staff',
      status: { count: staff, done: staff > 0 },
      metric: (n) => `${n} staff`,
    },
    {
      key: 'labour',
      title: 'Track labour',
      description:
        'Clock staff in and out. Recorded hours split across brands by order share so your P&L prime cost is real.',
      href: '/dashboard/labor',
      cta: 'Open labour',
      status: { count: timeEntries, done: timeEntries > 0 },
      metric: (n) => `${n} time ${n === 1 ? 'entry' : 'entries'}`,
    },
  ];

  const doneCount = steps.filter((s) => s.status.done).length;
  const allDone = doneCount === steps.length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text">Kitchen setup</h1>
        <p className="mt-1 text-sm text-textMuted">
          Bring <span className="font-medium text-text">{scope.kitchenName}</span> online. Work through
          these steps to stock the shared pool and make every dashboard accurate.
        </p>
      </div>

      {/* Progress */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-text">
            {allDone ? 'Setup complete' : `${doneCount} of ${steps.length} steps done`}
          </span>
          <span className="tabular-nums text-textMuted">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surfaceMuted">
          <div
            className={`h-full rounded-full transition-all ${allDone ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        {allDone && (
          <p className="mt-3 text-sm text-success">
            Your kitchen is fully set up. These pages stay here whenever you need to add more.
          </p>
        )}
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className={`rounded-lg border p-4 ${
              step.status.done ? 'border-success/30 bg-successSoft/40' : 'border-border bg-surface'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  step.status.done
                    ? 'bg-success text-white'
                    : 'bg-surfaceMuted text-textMuted'
                }`}
                aria-hidden="true"
              >
                {step.status.done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-text">{step.title}</h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      step.status.done ? 'bg-successSoft text-success' : 'bg-surfaceMuted text-textMuted'
                    }`}
                  >
                    {step.status.count > 0 ? step.metric(step.status.count) : 'Not started'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-textMuted">{step.description}</p>
              </div>
              <Link
                href={step.href}
                className={`flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  step.status.done
                    ? 'border border-border text-text hover:bg-surfaceMuted'
                    : 'bg-primary text-white hover:bg-primaryHover'
                }`}
              >
                {step.status.done ? 'Review' : step.cta}
              </Link>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-textMuted">
        Suppliers, inventory, and staff are shared across every brand in this kitchen. Recipes are
        per brand — switch the active brand from the header to build another brand&apos;s menu.
      </p>
    </div>
  );
}
