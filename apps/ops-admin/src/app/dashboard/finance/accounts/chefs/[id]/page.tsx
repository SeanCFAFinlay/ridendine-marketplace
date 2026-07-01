import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceAccessDenied } from '../../../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../../../_lib/roles';
import { FinanceAccountDetailContent } from '../../account-detail-content';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceChefAccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }
  // @ts-ignore Async Server Component — valid in Next.js App Router. @ts-ignore (not @ts-expect-error) so `next build` (which sees no error via .next/types) doesn't fail on an unused directive.
  return <FinanceAccountDetailContent type="chefs" id={id} />;
}
