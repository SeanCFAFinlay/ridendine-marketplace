import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';
import { FinanceAccessDenied } from '../../../_components/FinanceAccessDenied';
import { FINANCE_PAGE_ROLES } from '../../../_lib/roles';
import { FinanceAccountDetailContent } from '../../account-detail-content';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function FinanceDriverAccountDetailPage({ params }: PageProps) {
  const { id } = await params;
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, [...FINANCE_PAGE_ROLES])) {
    return <FinanceAccessDenied />;
  }
  // @ts-ignore Async Server Component — valid in Next.js App Router (see chefs/[id]/page.tsx note).
  return <FinanceAccountDetailContent type="drivers" id={id} />;
}
