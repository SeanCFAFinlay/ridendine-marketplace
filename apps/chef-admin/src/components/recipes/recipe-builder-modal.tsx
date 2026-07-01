'use client';

import { useMemo, useState } from 'react';
import { Modal, Button, Input } from '@ridendine/ui';
import { computeMenuItemCosting } from '@ridendine/engine';
import { Plus, Trash2 } from 'lucide-react';

export interface MenuItemLite {
  id: string;
  name: string;
  price: number;
}

interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  costPerUnit: string;
  wasteFactor: string;
}
interface Step {
  instruction: string;
  phase: 'prep' | 'cook';
}

interface RecipeBuilderModalProps {
  menuItems: MenuItemLite[];
  onClose: () => void;
  onSuccess: () => void;
}

const num = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function money(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `$${(Math.round(n * 100) / 100).toFixed(2)}`;
}
function pct(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function RecipeBuilderModal({ menuItems, onClose, onSuccess }: RecipeBuilderModalProps) {
  const [name, setName] = useState('');
  const [menuItemId, setMenuItemId] = useState('');
  const [batchYield, setBatchYield] = useState('1');
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { name: '', quantity: '', unit: 'unit', costPerUnit: '', wasteFactor: '0' },
  ]);
  const [steps] = useState<Step[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sellPrice = useMemo(
    () => Number(menuItems.find((m) => m.id === menuItemId)?.price ?? 0),
    [menuItems, menuItemId]
  );

  // Live cost preview from the pure costing engine.
  const costing = useMemo(
    () =>
      computeMenuItemCosting({
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({ quantity: num(i.quantity), costPerUnit: num(i.costPerUnit), wasteFactor: num(i.wasteFactor) })),
        batchYield: num(batchYield) || 1,
        sellPrice,
      }),
    [ingredients, batchYield, sellPrice]
  );

  const setIng = (idx: number, patch: Partial<Ingredient>) =>
    setIngredients((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addIng = () =>
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: 'unit', costPerUnit: '', wasteFactor: '0' }]);
  const removeIng = (idx: number) => setIngredients((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        menuItemId: menuItemId || null,
        batchYield: num(batchYield) || 1,
        ingredients: ingredients
          .filter((i) => i.name.trim())
          .map((i, idx) => ({
            name: i.name.trim(),
            quantity: num(i.quantity),
            unit: i.unit.trim() || 'unit',
            costPerUnit: num(i.costPerUnit),
            wasteFactor: num(i.wasteFactor),
            sortOrder: idx,
          })),
        steps: steps
          .filter((s) => s.instruction.trim())
          .map((s, idx) => ({ stepNumber: idx + 1, instruction: s.instruction.trim(), phase: s.phase })),
      };
      const res = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => null);
        throw new Error(b?.error || `Request failed (${res.status})`);
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New recipe" size="xl">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Recipe name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-textMuted">Menu item (optional)</span>
            <select
              value={menuItemId}
              onChange={(e) => setMenuItemId(e.target.value)}
              className="min-h-10 rounded-lg border border-borderStrong px-3 text-sm text-text"
            >
              <option value="">— none —</option>
              {menuItems.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({money(m.price)})
                </option>
              ))}
            </select>
          </label>
          <Input label="Batch yield (portions)" type="number" inputMode="decimal" value={batchYield} onChange={(e) => setBatchYield(e.target.value)} />
        </div>

        {/* Ingredients */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-text">Ingredients</h3>
            <button onClick={addIng} className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {ingredients.map((ing, idx) => (
              <div key={idx} className="grid grid-cols-[1fr_70px_70px_80px_70px_32px] items-center gap-2">
                <input placeholder="Name" value={ing.name} onChange={(e) => setIng(idx, { name: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Qty" type="number" value={ing.quantity} onChange={(e) => setIng(idx, { quantity: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Unit" value={ing.unit} onChange={(e) => setIng(idx, { unit: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="$/unit" type="number" value={ing.costPerUnit} onChange={(e) => setIng(idx, { costPerUnit: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" />
                <input placeholder="Waste" type="number" value={ing.wasteFactor} onChange={(e) => setIng(idx, { wasteFactor: e.target.value })} className="min-h-9 rounded-lg border border-borderStrong px-2 text-sm" title="Waste factor 0–1" />
                <button onClick={() => removeIng(idx)} aria-label="Remove ingredient" className="flex h-9 w-8 items-center justify-center rounded-lg text-textMuted hover:bg-dangerSoft hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Live cost preview */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-divider bg-surfaceMuted p-3 sm:grid-cols-4">
          <div><p className="text-xs text-textMuted">Cost / portion</p><p className="text-lg font-bold text-text">{money(costing.perPortionFoodCost)}</p></div>
          <div><p className="text-xs text-textMuted">Sell price</p><p className="text-lg font-bold text-text">{money(sellPrice)}</p></div>
          <div><p className="text-xs text-textMuted">Food cost %</p><p className={`text-lg font-bold ${costing.marginWarning ? 'text-danger' : 'text-success'}`}>{pct(costing.foodCostPct)}</p></div>
          <div><p className="text-xs text-textMuted">Suggested price</p><p className="text-lg font-bold text-text">{money(costing.suggestedPrice)}</p></div>
        </div>
        {costing.marginWarning && (
          <p className="text-sm text-danger">Food cost is above the 30% target — consider raising the price or reducing cost.</p>
        )}

        {error && <p className="rounded-lg bg-dangerSoft px-3 py-2 text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || submitting}>{submitting ? 'Saving…' : 'Create recipe'}</Button>
        </div>
      </div>
    </Modal>
  );
}
