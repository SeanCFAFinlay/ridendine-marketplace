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
  { key: 'new_order', label: 'New Order', description: 'When a new order is available nearby' },
  { key: 'order_accepted', label: 'Order Accepted', description: 'When an order is accepted' },
  { key: 'order_ready', label: 'Order Ready', description: 'When your pickup order is ready' },
  { key: 'delivery_offer', label: 'Delivery Offer', description: 'When a delivery offer arrives' },
  { key: 'delivery_assigned', label: 'Delivery Assigned', description: 'When a delivery is assigned to you' },
  { key: 'payment_received', label: 'Payment Received', description: 'When you receive a payment' },
];

const STORAGE_KEY = 'driver_notification_prefs';

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
    <div className="mt-6">
      <h2 className="text-[17px] font-semibold text-[#1a1a1a]">Notification Preferences</h2>
      <p className="mt-1 text-[13px] text-[#6b7280]">
        Choose how you want to be notified.{' '}
        <span className="text-xs text-amber-600">(Stored locally — production will sync to DB)</span>
      </p>

      <Card className="mt-3 border-0 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left text-[13px] font-medium text-[#6b7280]">Event</th>
                <th className="pb-3 text-center text-[13px] font-medium text-[#6b7280]">Email</th>
                <th className="pb-3 text-center text-[13px] font-medium text-[#6b7280]">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {EVENTS.map(({ key, label, description }) => (
                <tr key={key}>
                  <td className="py-3 pr-4">
                    <p className="text-[14px] font-medium text-[#1a1a1a]">{label}</p>
                    <p className="text-[12px] text-[#9ca3af]">{description}</p>
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

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} className="rounded-lg bg-[#E85D26] hover:bg-[#d44e1e]">
            Save Preferences
          </Button>
          {saved && <span className="text-[13px] text-green-600">Saved!</span>}
        </div>
      </Card>
    </div>
  );
}
