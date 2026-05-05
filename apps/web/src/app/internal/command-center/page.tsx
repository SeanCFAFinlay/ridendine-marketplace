import CommandCenterClient from './command-center-client';
import { loadCommandCenterChangeRequests, loadCommandCenterRegistry } from '@/lib/internal-command-center';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

function environmentLabel() {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') return 'PROD';
  if (process.env.VERCEL_ENV === 'preview') return 'PREVIEW';
  return 'LOCAL';
}

export default function InternalCommandCenterPage() {
  if (process.env.NODE_ENV === 'production' && process.env.INTERNAL_COMMAND_CENTER_ENABLED !== 'true') {
    notFound();
  }

  const registry = loadCommandCenterRegistry();
  const changeRequests = loadCommandCenterChangeRequests();

  return (
    <CommandCenterClient
      registry={registry}
      initialChangeRequests={changeRequests}
      environment={environmentLabel()}
    />
  );
}
