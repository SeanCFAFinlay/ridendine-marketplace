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
  return <FinanceAccountDetailContent type="chefs" id={id} />;
}
