'use client';

import { useState, useEffect } from 'react';
import { Card, Button } from '@ridendine/ui';

type NotificationChannel = 'email' | 'sms';
type NotificationEvent =
  | 'new_order'
  | 'order_accepted'
  | 'order_ready'
  | 'delivery_offer'
  | 'delivery_assigned'
  | 'payment_received';

type Preferences = Record<NotificationEvent, Record<NotificationChannel, boolean>>;

const EVENTS: { key: NotificationEvent; label: string; description: string }[] = [
  { key: 'new_order', label: 'New Order', description: 'When a customer places an order' },
  { key: 'order_accepted', label: 'Order Accepted', description: 'When you accept an order' },
  { key: 'order_ready', label: 'Order Ready', description: 'When your order is marked ready for pickup' },
  { key: 'delivery_offer', label: 'Delivery Offer', description: 'When a delivery is offered' },
  { key: 'delivery_assigned', label: 'Delivery Assigned', description: 'When a driver is assigned' },
  { key: 'payment_received', label: 'Payment Received', description: 'When you receive a payment' },
];

const STORAGE_KEY = 'chef_notification_prefs';

function buildDefaultPrefs(): Preferences {
  const defaults = {} as Preferences;
  for (const ev of EVENTS) {
    defaults[ev.key] = { email: true, sms: true };
  }
  return defaults;
}

function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...buildDefaultPrefs(), ...JSON.parse(raw) };
  } catch {
    // Ignore
  }
  return buildDefaultPrefs();
}

function savePrefs(prefs: Preferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore
  }
}

export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<Preferences>(buildDefaultPrefs);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  const toggle = (event: NotificationEvent, channel: NotificationChannel) => {
    setPrefs((prev) => ({
      ...prev,
      [event]: { ...prev[event], [channel]: !prev[event][channel] },
    }));
    setSaved(false);
  };

  const handleSave = () => {
    savePrefs(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold text-text">Notification Preferences</h2>
      <p className="mt-1 text-sm text-textMuted">
        Choose how you want to be notified for each event.{' '}
        <span className="text-xs text-warning">(Stored locally — production will sync to DB)</span>
      </p>

      <Card className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-divider">
                <th className="pb-3 text-left font-medium text-text">Event</th>
                <th className="pb-3 text-center font-medium text-text">Email</th>
                <th className="pb-3 text-center font-medium text-text">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {EVENTS.map(({ key, label, description }) => (
                <tr key={key}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-text">{label}</p>
                    <p className="text-xs text-textSubtle">{description}</p>
                  </td>
                  {(['email', 'sms'] as NotificationChannel[]).map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(key, ch)}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:shadow-focus ${
                          prefs[key][ch] ? 'bg-primary' : 'bg-surfaceMuted'
                        }`}
                        aria-checked={prefs[key][ch]}
                        role="switch"
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            prefs[key][ch] ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Button onClick={handleSave}>Save Preferences</Button>
          {saved && <span className="text-sm text-success">Saved!</span>}
        </div>
      </Card>
    </div>
  );
}
