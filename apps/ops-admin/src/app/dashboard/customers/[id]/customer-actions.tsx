'use client';

import { useState } from 'react';
import { Button } from '@ridendine/ui';

interface CustomerActionsProps {
  customerId: string;
  customerName: string;
}

export function CustomerActions({ customerId, customerName }: CustomerActionsProps) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const [status, setStatus] = useState('');

  const sendNotification = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/customers/${customerId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Message from RideNDine', body: message }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setStatus('Notification sent');
      setMessage('');
      setShowMessage(false);
    } catch {
      setStatus('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMessage(!showMessage)}
          className="border-border text-textSubtle"
        >
          Send Notification
        </Button>
        <a href={`/api/export?type=orders&customerId=${customerId}`}>
          <Button variant="outline" size="sm" className="border-border text-textSubtle">
            Export Orders
          </Button>
        </a>
      </div>
      {showMessage && (
        <div className="rounded-lg bg-surface p-4">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={`Send a notification to ${customerName}...`}
            rows={3}
            className="w-full rounded-lg bg-background border border-border text-white px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMessage(false)}
              className="border-border text-textSubtle"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={sendNotification}
              disabled={sending}
              className="bg-primary"
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      )}
      {status && <p className="text-xs text-textMuted">{status}</p>}
    </div>
  );
}
