'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@ridendine/db';

interface SearchResult {
  type: 'order' | 'customer' | 'chef' | 'driver' | 'delivery';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<string, string> = {
  order: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  customer: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  chef: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  driver: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0',
  delivery: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
};

async function searchOrders(supabase: any, q: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('orders')
    .select('id, order_number, status, total')
    .ilike('order_number', `%${q}%`)
    .limit(5);
  return (data || []).map((o: any) => ({
    type: 'order' as const,
    id: o.id,
    title: `Order ${o.order_number}`,
    subtitle: `${o.status} — $${Number(o.total).toFixed(2)}`,
    href: `/dashboard/orders/${o.id}`,
  }));
}

async function searchCustomers(supabase: any, q: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('customers')
    .select('id, first_name, last_name, email')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(5);
  return (data || []).map((c: any) => ({
    type: 'customer' as const,
    id: c.id,
    title: `${c.first_name} ${c.last_name}`,
    subtitle: c.email,
    href: `/dashboard/customers/${c.id}`,
  }));
}

async function searchChefs(supabase: any, q: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('chef_profiles')
    .select('id, display_name, status')
    .ilike('display_name', `%${q}%`)
    .limit(5);
  return (data || []).map((ch: any) => ({
    type: 'chef' as const,
    id: ch.id,
    title: ch.display_name,
    subtitle: `Chef — ${ch.status}`,
    href: `/dashboard/chefs/${ch.id}`,
  }));
}

async function searchDrivers(supabase: any, q: string): Promise<SearchResult[]> {
  const { data } = await supabase
    .from('drivers')
    .select('id, first_name, last_name, status')
    .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
    .limit(5);
  return (data || []).map((d: any) => ({
    type: 'driver' as const,
    id: d.id,
    title: `${d.first_name} ${d.last_name}`,
    subtitle: `Driver — ${d.status}`,
    href: `/dashboard/drivers/${d.id}`,
  }));
}

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(), []);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const search = useCallback(async (q: string) => {
    if (!supabase || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const [orders, customers, chefs, drivers] = await Promise.all([
        searchOrders(supabase, q),
        searchCustomers(supabase, q),
        searchChefs(supabase, q),
        searchDrivers(supabase, q),
      ]);
      setResults([...orders, ...customers, ...chefs, ...drivers]);
      setSelectedIndex(0);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [supabase]);

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && results[selectedIndex]) {
      router.push(results[selectedIndex].href);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Open search"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-gray-500">⌘K</kbd>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
          onClick={() => setIsOpen(false)}
        >
          <div className="fixed inset-0 bg-black/60" />
          <div
            className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-[#0d1520] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-700 px-4 py-3">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={e => handleInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search orders, customers, chefs, drivers..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
              />
              <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="px-4 py-3 text-sm text-gray-500">Searching...</div>
              )}
              {!loading && query.length >= 2 && results.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">No results found</div>
              )}
              {!loading && query.length < 2 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  Type at least 2 characters to search
                </div>
              )}
              {results.map((result, idx) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => { router.push(result.href); setIsOpen(false); }}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    idx === selectedIndex ? 'bg-[#E85D26]/20' : 'hover:bg-white/5'
                  }`}
                >
                  <svg className="h-4 w-4 text-gray-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={TYPE_ICONS[result.type]} />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{result.title}</p>
                    <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-gray-600">{result.type}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
