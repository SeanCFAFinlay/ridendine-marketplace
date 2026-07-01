'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, Badge, Button, Modal, Input, EmptyState, Spinner } from '@ridendine/ui';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
}
interface PurchaseOrder {
  id: string;
  reference: string | null;
  status: string;
  total_cost: number;
  supplier_id: string | null;
}
interface POLine {
  description: string;
  quantity: string;
  packSize: string;
  unitCost: string;
}

function money(n: number) {
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const [addSupplierOpen, setAddSupplierOpen] = useState(false);
  const [sName, setSName] = useState('');
  const [sContact, setSContact] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [savingSupplier, setSavingSupplier] = useState(false);

  const [poOpen, setPoOpen] = useState(false);
  const [poSupplier, setPoSupplier] = useState('');
  const [poLines, setPoLines] = useState<POLine[]>([{ description: '', quantity: '', packSize: '1', unitCost: '' }]);
  const [savingPo, setSavingPo] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, pRes] = await Promise.all([fetch('/api/suppliers'), fetch('/api/purchase-orders')]);
      if (sRes.ok) setSuppliers((await sRes.json()).data?.suppliers ?? []);
      if (pRes.ok) setOrders((await pRes.json()).data?.purchaseOrders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const supplierName = new Map(suppliers.map((s) => [s.id, s.name]));

  const addSupplier = async () => {
    if (!sName.trim() || savingSupplier) return;
    setSavingSupplier(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: sName.trim(), contactName: sContact.trim() || null, phone: sPhone.trim() || null }),
      });
      if (res.ok) {
        setAddSupplierOpen(false);
        setSName('');
        setSContact('');
        setSPhone('');
        await fetchData();
      }
    } finally {
      setSavingSupplier(false);
    }
  };

  const createPo = async () => {
    if (savingPo) return;
    const lines = poLines
      .filter((l) => Number(l.quantity) > 0)
      .map((l) => ({ description: l.description.trim() || null, quantity: Number(l.quantity), packSize: Number(l.packSize) || 1, unitCost: Number(l.unitCost) || 0 }));
    if (lines.length === 0) return;
    setSavingPo(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: poSupplier || null, lines }),
      });
      if (res.ok) {
        setPoOpen(false);
        setPoSupplier('');
        setPoLines([{ description: '', quantity: '', packSize: '1', unitCost: '' }]);
        await fetchData();
      }
    } finally {
      setSavingPo(false);
    }
  };

  const receivePo = async (poId: string) => {
    setBusy((b) => ({ ...b, [poId]: true }));
    try {
      // Fetch lines, then receive all outstanding.
      const detail = await fetch(`/api/purchase-orders/${poId}`);
      if (!detail.ok) return;
      const lines = (await detail.json()).data?.lines ?? [];
      const receiptLines = lines
        .map((l: { id: string; quantity: number; received_quantity: number }) => ({
          purchaseOrderLineId: l.id,
          receivedPacks: Math.max(0, Number(l.quantity ?? 0) - Number(l.received_quantity ?? 0)),
        }))
        .filter((l: { receivedPacks: number }) => l.receivedPacks > 0);
      if (receiptLines.length === 0) return;
      await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: receiptLines }),
      });
      await fetchData();
    } finally {
      setBusy((b) => ({ ...b, [poId]: false }));
    }
  };

  const setLine = (idx: number, patch: Partial<POLine>) =>
    setPoLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Suppliers &amp; Purchasing</h1>
          <p className="mt-1 text-sm text-textMuted">Manage suppliers and purchase orders. Receiving updates inventory automatically.</p>
        </div>
        <button onClick={fetchData} aria-label="Refresh" className="flex items-center gap-2 rounded-lg bg-surfaceMuted px-3 py-2 text-sm font-medium text-textMuted hover:text-text">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Suppliers */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-text">Suppliers</h2>
          <Button size="sm" onClick={() => setAddSupplierOpen(true)}><Plus className="mr-1 h-4 w-4" />Add supplier</Button>
        </div>
        {suppliers.length === 0 ? (
          <p className="py-4 text-center text-sm text-textMuted">No suppliers yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s) => (
              <div key={s.id} className="rounded-lg border border-divider p-3">
                <p className="font-medium text-text">{s.name}</p>
                <p className="text-xs text-textMuted">{s.contact_name ?? ''}{s.phone ? ` · ${s.phone}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Purchase orders */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-text">Purchase orders</h2>
          <Button size="sm" onClick={() => setPoOpen(true)} disabled={suppliers.length === 0}><Plus className="mr-1 h-4 w-4" />New PO</Button>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="No purchase orders" description="Create a PO to order stock; receiving it updates inventory and cost." />
        ) : (
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="flex items-center justify-between rounded-lg bg-surfaceMuted px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-text">{o.reference || `PO ${o.id.slice(0, 8)}`}</span>
                  <span className="ml-2 text-textMuted">{o.supplier_id ? supplierName.get(o.supplier_id) ?? '' : 'No supplier'} · {money(Number(o.total_cost ?? 0))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={o.status === 'received' ? 'success' : o.status === 'cancelled' ? 'error' : 'info'}>{o.status}</Badge>
                  {o.status !== 'received' && o.status !== 'cancelled' && (
                    <Button size="sm" variant="outline" disabled={Boolean(busy[o.id])} onClick={() => receivePo(o.id)}>
                      {busy[o.id] ? '…' : 'Receive'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add supplier modal */}
      {addSupplierOpen && (
        <Modal isOpen onClose={() => setAddSupplierOpen(false)} title="Add supplier" size="sm">
          <div className="space-y-3">
            <Input label="Name" value={sName} onChange={(e) => setSName(e.target.value)} autoFocus />
            <Input label="Contact" value={sContact} onChange={(e) => setSContact(e.target.value)} />
            <Input label="Phone" value={sPhone} onChange={(e) => setSPhone(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddSupplierOpen(false)} disabled={savingSupplier}>Cancel</Button>
              <Button onClick={addSupplier} disabled={!sName.trim() || savingSupplier}>{savingSupplier ? 'Saving…' : 'Add'}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create PO modal */}
      {poOpen && (
        <Modal isOpen onClose={() => setPoOpen(false)} title="New purchase order" size="lg">
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-textMuted">Supplier</span>
              <select value={poSupplier} onChange={(e) => setPoSupplier(e.target.value)} className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm">
                <option value="">— none —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-semibold text-text">Lines</h3>
                <button onClick={() => setPoLines((p) => [...p, { description: '', quantity: '', packSize: '1', unitCost: '' }])} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                  <Plus className="h-4 w-4" />Add line
                </button>
              </div>
              <div className="space-y-2">
                {poLines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_70px_70px_80px_32px] items-center gap-2">
                    <input placeholder="Item" value={l.description} onChange={(e) => setLine(idx, { description: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                    <input placeholder="Packs" type="number" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                    <input placeholder="Pack size" type="number" value={l.packSize} onChange={(e) => setLine(idx, { packSize: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                    <input placeholder="$/pack" type="number" value={l.unitCost} onChange={(e) => setLine(idx, { unitCost: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                    <button onClick={() => setPoLines((p) => p.filter((_, i) => i !== idx))} aria-label="Remove line" className="flex h-9 w-8 items-center justify-center rounded-lg text-textMuted hover:bg-dangerSoft hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPoOpen(false)} disabled={savingPo}>Cancel</Button>
              <Button onClick={createPo} disabled={savingPo}>{savingPo ? 'Saving…' : 'Create PO'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
