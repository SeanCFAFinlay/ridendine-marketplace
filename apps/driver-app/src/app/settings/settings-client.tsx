'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Card, Button } from '@ridendine/ui';
import type { Driver } from '@ridendine/db';
import { NotificationPreferences } from '@/components/settings/notification-preferences';

type Props = {
  driver: Driver;
  balanceCents: number;
};

export default function SettingsClient({ driver, balanceCents }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(
    Boolean((driver as { instant_payouts_enabled?: boolean }).instant_payouts_enabled)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function saveToggle(next: boolean) {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/driver', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instant_payouts_enabled: next }),
      });
      if (!res.ok) throw new Error('update failed');
      setEnabled(next);
      router.refresh();
    } catch {
      setMessage('Could not update preference. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-24">
      <div className="bg-brand-600 p-6 text-white">
        <h1 className="text-[22px] font-bold tracking-tight">Payout settings</h1>
        <p className="mt-1 text-sm text-white/90">Instant payouts are optional and include a 1.5% fee.</p>
      </div>

      <div className="p-4 space-y-4">
        <Card className="border-0 shadow-sm">
          <p className="text-[14px] text-[#6b7280]">Available driver payable balance (ledger-derived)</p>
          <p className="mt-2 text-[32px] font-bold text-[#15803d]">${(balanceCents / 100).toFixed(2)}</p>
        </Card>

        <Card className="border-0 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Instant payouts</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-[#6b7280]">
                When enabled, you can request an on-demand payout from Earnings. Ridendine charges a{' '}
                <span className="font-semibold text-[#1a1a1a]">1.5%</span> fee on each instant payout; the fee is
                recorded on your ledger before funds move.
              </p>
            </div>
            <Button
              type="button"
              variant={enabled ? 'secondary' : 'default'}
              disabled={saving}
              onClick={() => void saveToggle(!enabled)}
            >
              {saving ? 'Saving…' : enabled ? 'Turn off' : 'Turn on'}
            </Button>
          </div>
          {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
        </Card>

        <Link href="/earnings" className="block text-center text-[15px] font-medium text-brand-600">
          Go to Earnings
        </Link>

        <NotificationPreferences />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-[#e5e7eb] bg-white">
        <div className="flex justify-around py-3">
          <Link href="/" className="text-[12px] font-medium text-[#9ca3af]">
            Home
          </Link>
          <Link href="/earnings" className="text-[12px] font-medium text-[#9ca3af]">
            Earnings
          </Link>
          <Link href="/profile" className="text-[12px] font-medium text-[#9ca3af]">
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}
