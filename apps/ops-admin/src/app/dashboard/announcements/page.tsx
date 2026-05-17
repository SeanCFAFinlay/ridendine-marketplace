'use client';

import { useState } from 'react';
import { Card, Button } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

const AUDIENCES = [
  { value: 'all_customers', label: 'All Customers', icon: '👥', color: 'text-info' },
  { value: 'all_chefs', label: 'All Chefs', icon: '👨‍🍳', color: 'text-primary' },
  { value: 'all_drivers', label: 'All Drivers', icon: '🚗', color: 'text-success' },
  { value: 'all_ops', label: 'Ops Team', icon: '🛡️', color: 'text-info' },
];

export default function AnnouncementsPage() {
  const [audience, setAudience] = useState('all_customers');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; audience: string } | null>(null);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const submitAnnouncement = async () => {
    if (!title.trim() || !body.trim()) { setError('Title and message required'); return; }

    setSending(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audience, title, body }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.data);
      setTitle(''); setBody('');
      setConfirming(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setSending(false); }
  };

  const handleSend = () => {
    if (!title.trim() || !body.trim()) { setError('Title and message required'); return; }
    setConfirming(true);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Announcements</h1>
          <p className="mt-1 text-textMuted">Broadcast messages to customers, chefs, drivers, or your ops team</p>
        </div>

        {error && <div className="rounded-lg bg-danger/20 p-3 text-sm text-danger">{error}</div>}
        {result && (
          <div className="rounded-lg bg-success/20 p-3 text-sm text-success">
            Sent to {result.sent} {result.audience.replace('all_', '')}
          </div>
        )}

        <Card className="border-border bg-surface p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-textSubtle mb-2">Audience</label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {AUDIENCES.map((a) => (
                <button key={a.value} onClick={() => setAudience(a.value)}
                  className={`rounded-xl p-3 text-center transition-all border ${
                    audience === a.value ? 'border-primary bg-primary/10' : 'border-border bg-surface hover:border-border'
                  }`}>
                  <div className="text-2xl">{a.icon}</div>
                  <p className={`mt-1 text-xs font-medium ${audience === a.value ? 'text-white' : 'text-textMuted'}`}>{a.label}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Title</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Holiday Hours Update"
              className="w-full rounded-lg bg-surface border border-border text-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-textSubtle mb-1">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Write your announcement..."
              rows={4} maxLength={1000}
              className="w-full rounded-lg bg-surface border border-border text-white px-3 py-2 text-sm focus:border-primary focus:outline-none" />
            <p className="mt-1 text-xs text-textMuted">{body.length}/1000</p>
          </div>

          <Button onClick={handleSend} disabled={sending} className="w-full bg-primary hover:bg-primaryHover" size="lg">
            {sending ? 'Sending...' : `Send to ${AUDIENCES.find(a => a.value === audience)?.label}`}
          </Button>
          {confirming && (
            <div className="rounded-lg border border-warning/30 bg-warning/10 p-3">
              <p className="text-sm text-warning">
                Confirm sending "{title}" to {AUDIENCES.find(a => a.value === audience)?.label}.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={submitAnnouncement} disabled={sending}>
                  Confirm Send
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
