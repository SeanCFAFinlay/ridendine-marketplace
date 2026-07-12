'use client';

// ==========================================
// BRAND SWITCHER
//
// Top-bar control for a ghost-kitchen operator to pick the ACTIVE brand (or go
// kitchen-wide). Writes the x-brand-id cookie via the KitchenScopeProvider and
// refreshes so brand-scoped server surfaces re-fetch. Renders nothing for a
// non-operator, and a static kitchen label for a single-brand chef.
// ==========================================

import { useEffect, useRef, useState } from 'react';
import { cn } from '@ridendine/ui';
import { useKitchenScope } from './kitchen-scope-provider';

export function BrandSwitcher() {
  const scope = useKitchenScope();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  // Non-operator: nothing to show.
  if (!scope) return null;

  // Single-brand chef: a static label, no switcher.
  if (scope.brands.length <= 1) {
    return (
      <span className="hidden items-center gap-2 text-sm text-textMuted lg:inline-flex">
        <BrandGlyph />
        {scope.kitchenName}
      </span>
    );
  }

  const active = scope.brands.find((b) => b.id === scope.activeBrandId) ?? null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
      >
        <BrandGlyph />
        <span className="max-w-[10rem] truncate">{active ? active.name : 'All brands'}</span>
        <span className="hidden text-xs text-textMuted sm:inline">· {scope.kitchenName}</span>
        <svg className="h-4 w-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 z-dropdown mt-1 w-64 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg"
        >
          <BrandOption
            label="All brands"
            hint="Kitchen-wide view"
            selected={!scope.activeBrandId}
            onSelect={() => {
              scope.setActiveBrand('');
              setOpen(false);
            }}
          />
          <div className="my-1 border-t border-border" />
          {scope.brands.map((b) => (
            <BrandOption
              key={b.id}
              label={b.name}
              hint={b.isActive ? undefined : 'Inactive'}
              selected={scope.activeBrandId === b.id}
              onSelect={() => {
                scope.setActiveBrand(b.id);
                setOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BrandOption({
  label,
  hint,
  selected,
  onSelect,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors',
        selected ? 'bg-primarySoft text-primary' : 'text-text hover:bg-surfaceMuted',
      )}
    >
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-xs text-textMuted">{hint}</span>}
      {selected && (
        <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

function BrandGlyph() {
  return (
    <svg className="h-4 w-4 text-textMuted" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}
