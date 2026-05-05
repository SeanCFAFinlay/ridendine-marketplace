'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: string;
  condition: string;
  action: string;
  params: Record<string, unknown>;
}

const ACTION_LABELS: Record<string, string> = {
  suspend_chef: 'Suspend Chef',
  create_exception: 'Create Exception',
  pause_storefront: 'Pause Storefront',
  create_system_alert: 'Create Alert',
};

const TRIGGER_LABELS: Record<string, string> = {
  'order.rejected': 'Order Rejected',
  'order.created': 'Order Created',
  'kitchen_queue.updated': 'Kitchen Queue Changed',
  'sla.check': 'SLA Timer Check',
  'driver.status_changed': 'Driver Status Changed',
};

export default function AutomationPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/engine/rules')
      .then(r => r.json())
      .then(d => { if (d.success) setRules(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggleRule = async (ruleId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch('/api/engine/rules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_automation_rule', ruleId, enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error('Failed');
      setRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !currentEnabled } : r));
    } catch { setError('Failed to update rule'); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Automation Rules</h1>
          <p className="mt-1 text-gray-400">Configure automated responses to platform events. Rules run during SLA processor cycles.</p>
        </div>

        {error && <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-700/20 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-4">
            {rules.map((rule) => (
              <Card key={rule.id} className={`p-5 transition-colors ${
                rule.enabled ? 'border-emerald-500/30 bg-[#16213e]' : 'border-gray-800 bg-[#16213e]/50'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`font-semibold ${rule.enabled ? 'text-white' : 'text-gray-400'}`}>{rule.name}</h3>
                      <Badge className={rule.enabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-700 text-gray-500'}>
                        {rule.enabled ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs text-blue-300">
                        Trigger: {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300">
                        If: {rule.condition}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                        Then: {ACTION_LABELS[rule.action] || rule.action}
                      </span>
                    </div>
                    {Object.keys(rule.params).length > 0 && (
                      <p className="mt-1.5 text-xs text-gray-500">
                        Params: {Object.entries(rule.params).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <button onClick={() => toggleRule(rule.id, rule.enabled)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 ${
                      rule.enabled ? 'bg-emerald-500' : 'bg-gray-600'
                    }`}>
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200 ${
                      rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                    } mt-0.5`} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h3 className="text-sm font-semibold text-white mb-2">How Rules Work</h3>
          <ul className="space-y-1 text-xs text-gray-400">
            <li>Rules are evaluated during each SLA processor cycle (every 60 seconds)</li>
            <li>When a trigger condition is met, the configured action executes automatically</li>
            <li>All automated actions are logged in the Activity Log with actor_role = "system"</li>
            <li>Disabled rules are skipped entirely — no processing overhead</li>
          </ul>
        </Card>
      </div>
    </DashboardLayout>
  );
}
