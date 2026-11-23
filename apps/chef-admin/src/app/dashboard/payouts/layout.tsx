import { Card } from '@ridendine/ui';
import { getChefOwnerContext, OWNER_ONLY_MESSAGE } from '@/lib/chef-owner';

export const dynamic = 'force-dynamic';

/** Payouts (balance, bank setup, payout requests) are for the kitchen owner only. */
export default async function PayoutsLayout({ children }: { children: React.ReactNode }) {
  const { isOwner } = await getChefOwnerContext().catch(() => ({ isOwner: false }));
  if (isOwner) return <>{children}</>;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text">Payouts</h1>
      <Card>
        <p className="py-6 text-center text-sm text-textMuted">{OWNER_ONLY_MESSAGE}</p>
      </Card>
    </div>
  );
}
