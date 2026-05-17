'use client';

import { useEta } from '@/hooks/use-eta';

interface StorefrontEtaBadgeProps {
  storefrontId: string;
  prepTimeMin: number;
  prepTimeMax: number;
}

export function StorefrontEtaBadge({ storefrontId, prepTimeMin, prepTimeMax }: StorefrontEtaBadgeProps) {
  const { eta, loading } = useEta(storefrontId, null);

  const prepLabel = `${prepTimeMin}–${prepTimeMax} min prep`;

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-textSubtle">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{prepLabel}</span>
      </div>
    );
  }

  if (!eta) {
    return (
      <div className="flex items-center gap-1 text-textMuted">
        <svg className="h-4 w-4 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{prepLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-textMuted">
      <svg className="h-4 w-4 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{prepLabel} · ~{eta.minMinutes}–{eta.maxMinutes} min delivery</span>
    </div>
  );
}
