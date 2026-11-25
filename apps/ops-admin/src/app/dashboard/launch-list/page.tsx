import { Card, EmptyState, PageHeader } from '@ridendine/ui';
import { createAdminClient, listLaunchSignups, type LaunchSignup, type SupabaseClient } from '@ridendine/db';
import { Megaphone } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getOpsActorContext, hasPlatformApiCapability } from '@/lib/engine';
import { LaunchListDownload } from './launch-list-download';

export const dynamic = 'force-dynamic';

const SOURCE_LABELS = { home: 'Home page', 'coming-soon': 'Coming soon page' } as const;

export default async function LaunchListPage() {
  const actor = await getOpsActorContext();
  if (!actor || !hasPlatformApiCapability(actor, 'customers_write')) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl">
          <Card className="border-border bg-surface p-8">
            <h1 className="text-xl font-semibold text-text">Manager access required</h1>
            <p className="mt-2 text-textMuted">
              Sign in with an operations manager or admin role to see the launch list.
            </p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  let signups: LaunchSignup[] | null = null;
  try {
    signups = await listLaunchSignups(createAdminClient() as unknown as SupabaseClient);
  } catch (error) {
    console.error('Launch list failed to load:', (error as { code?: string })?.code ?? 'unknown');
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader
          title="Launch list"
          subtitle="People who asked to be emailed when ordering opens. Unsubscribed people are left out."
          actions={signups?.length ? <LaunchListDownload signups={signups} /> : undefined}
        />
        {signups === null ? (
          <Card className="border-border bg-surface p-6">
            <p role="alert" className="text-danger">
              The list could not be loaded. Reload the page to try again.
            </p>
          </Card>
        ) : signups.length === 0 ? (
          <EmptyState
            icon={<Megaphone className="h-10 w-10" />}
            title="No sign-ups yet"
            description="Sign-ups from ridendine.ca appear here."
          />
        ) : (
          <Card className="overflow-x-auto border-border bg-surface p-0">
            <p className="border-b border-border px-4 py-3 text-sm text-textMuted">
              {signups.length} {signups.length === 1 ? 'person' : 'people'}
            </p>
            <table className="w-full text-left text-sm">
              <thead className="text-textMuted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Email</th>
                  <th scope="col" className="px-4 py-2 font-medium">Signed up on</th>
                  <th scope="col" className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-4 py-2 text-text">{row.email}</td>
                    <td className="px-4 py-2 text-textMuted">{SOURCE_LABELS[row.source]}</td>
                    <td className="px-4 py-2 text-textMuted">
                      {new Date(row.consented_at).toLocaleDateString('en-CA', {
                        timeZone: 'America/Toronto',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
