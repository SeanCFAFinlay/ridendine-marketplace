'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Input } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

interface PromoCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  usage_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function PromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  const fetchPromos = async () => {
    try {
      const res = await fetch('/api/promos');
      const data = await res.json();
      if (data.success) setPromos(data.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPromos(); }, []);

  const toggleActive = async (id: string, currentActive: boolean) => {
    try {
      await fetch('/api/promos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentActive }),
      });
      fetchPromos();
    } catch { setError('Failed to update'); }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Promo Codes</h1>
            <p className="mt-1 text-gray-400">Create and manage promotional discount codes</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="bg-[#E85D26] hover:bg-[#d44e1e]">
            Create Promo Code
          </Button>
        </div>

        {error && <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>}

        <Card className="border-gray-800 bg-opsPanel overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : promos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No promo codes yet. Create one to get started.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Min Order</th>
                  <th className="px-4 py-3">Usage</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {promos.map((promo) => {
                  const isExpired = promo.expires_at && new Date(promo.expires_at) < new Date();
                  const isExhausted = promo.usage_limit && promo.usage_count >= promo.usage_limit;
                  return (
                    <tr key={promo.id} className="border-b border-gray-800 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="rounded bg-gray-700 px-2 py-1 font-mono text-sm font-bold text-white">{promo.code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `$${promo.discount_value.toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {promo.min_order_amount > 0 ? `$${promo.min_order_amount.toFixed(2)}` : 'None'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {promo.usage_count}{promo.usage_limit ? ` / ${promo.usage_limit}` : ' / unlimited'}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {promo.starts_at ? new Date(promo.starts_at).toLocaleDateString() : 'Any'} — {promo.expires_at ? new Date(promo.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={
                          !promo.is_active ? 'bg-gray-700 text-gray-400' :
                          isExpired ? 'bg-red-500/20 text-red-300' :
                          isExhausted ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-emerald-500/20 text-emerald-300'
                        }>
                          {!promo.is_active ? 'Disabled' : isExpired ? 'Expired' : isExhausted ? 'Exhausted' : 'Active'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm"
                          onClick={() => toggleActive(promo.id, promo.is_active)}
                          className="border-gray-600 text-gray-300 hover:bg-white/10">
                          {promo.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>

        {showCreate && (
          <CreatePromoModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); fetchPromos(); }} />
        )}
      </div>
    </DashboardLayout>
  );
}

function CreatePromoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    code: '', discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '', minOrderAmount: '', usageLimit: '', expiresAt: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/promos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue),
          minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : 0,
          usageLimit: form.usageLimit ? parseInt(form.usageLimit) : null,
          expiresAt: form.expiresAt || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSuccess();
    } catch (err) { setError(err instanceof Error ? err.message : 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl bg-opsPanel p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-white">Create Promo Code</h2>
        {error && <div className="mt-2 rounded-lg bg-red-500/20 p-3 text-sm text-red-300">{error}</div>}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Code</label>
            <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              placeholder="SUMMER25" required className="bg-opsPanel border-gray-600 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type</label>
              <select value={form.discountType} onChange={e => setForm(f => ({ ...f, discountType: e.target.value as any }))}
                className="w-full rounded-lg bg-opsPanel border border-gray-600 text-white px-3 py-2 text-sm">
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Value</label>
              <Input type="number" step="0.01" value={form.discountValue}
                onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                placeholder={form.discountType === 'percentage' ? '25' : '5.00'} required
                className="bg-opsPanel border-gray-600 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Min Order ($)</label>
              <Input type="number" step="0.01" value={form.minOrderAmount}
                onChange={e => setForm(f => ({ ...f, minOrderAmount: e.target.value }))}
                placeholder="0.00" className="bg-opsPanel border-gray-600 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Usage Limit</label>
              <Input type="number" value={form.usageLimit}
                onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))}
                placeholder="Unlimited" className="bg-opsPanel border-gray-600 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Expires At</label>
            <Input type="datetime-local" value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="bg-opsPanel border-gray-600 text-white" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-gray-600 text-gray-300">Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-[#E85D26]">{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
