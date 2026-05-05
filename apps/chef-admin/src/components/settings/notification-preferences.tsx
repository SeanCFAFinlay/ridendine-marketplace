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
      <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
      <p className="mt-1 text-sm text-gray-500">
        Choose how you want to be notified for each event.{' '}
        <span className="text-xs text-amber-600">(Stored locally — production will sync to DB)</span>
      </p>

      <Card className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left font-medium text-gray-700">Event</th>
                <th className="pb-3 text-center font-medium text-gray-700">Email</th>
                <th className="pb-3 text-center font-medium text-gray-700">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {EVENTS.map(({ key, label, description }) => (
                <tr key={key}>
                  <td className="py-3 pr-4">
                    <p className="font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400">{description}</p>
                  </td>
                  {(['email', 'sms'] as NotificationChannel[]).map((ch) => (
                    <td key={ch} className="py-3 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(key, ch)}
                        className={`inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E85D26] ${
                          prefs[key][ch] ? 'bg-[#E85D26]' : 'bg-gray-200'
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
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </Card>
    </div>
  );
}
