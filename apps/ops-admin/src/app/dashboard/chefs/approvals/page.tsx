import { Card, Badge } from '@ridendine/ui';
import { cookies } from 'next/headers';
import { createServerClient, getPendingChefApprovals } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default async function ChefApprovalsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const pendingChefs = await getPendingChefApprovals(supabase as any);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Chef Approvals</h1>
            <p className="mt-2 text-gray-400">Review and approve new chef applications</p>
          </div>
          <Badge className="bg-[#E85D26] text-white">
            {pendingChefs.length} Pending
          </Badge>
        </div>

        <div className="space-y-4">
          {pendingChefs.map((chef) => (
            <Card key={chef.id} className="border-gray-800 bg-[#16213e] p-6">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-[#E85D26] text-xl font-bold text-white">
                  {getInitials(chef.display_name)}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{chef.display_name}</h3>
                  {chef.phone && (
                    <p className="mt-1 text-sm text-gray-400">{chef.phone}</p>
                  )}

                  {chef.bio && (
                    <p className="mt-3 text-sm text-gray-300">{chef.bio}</p>
                  )}

                  <div className="mt-4 flex items-center gap-3">
                    <Badge variant="warning">Pending Review</Badge>
                    <span className="text-xs text-gray-500">
                      Applied {new Date(chef.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {pendingChefs.length === 0 && (
            <div className="rounded-lg border border-gray-800 bg-[#16213e] py-16 text-center">
              <p className="text-gray-400">No pending chef approvals</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
