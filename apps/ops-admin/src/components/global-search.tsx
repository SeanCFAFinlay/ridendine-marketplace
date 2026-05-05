'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Package, User, ChefHat, Truck, MapPin } from 'lucide-react';
import { createBrowserClient } from '@ridendine/db';

interface SearchResult {
  type: 'order' | 'customer' | 'chef' | 'driver' | 'delivery';
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  order: Package,
  customer: User,
  chef: ChefHat,
  driver: Truck,
  delivery: MapPin,
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
        <Search className="h-4 w-4" />
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
            className="relative w-full max-w-lg rounded-xl border border-gray-700 bg-opsCanvas shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-gray-700 px-4 py-3">
              <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />
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
              {results.map((result, idx) => {
                const IconComp = TYPE_ICON_COMPONENTS[result.type] ?? Package;
                return (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => { router.push(result.href); setIsOpen(false); }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === selectedIndex ? 'bg-[#E85D26]/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <IconComp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{result.title}</p>
                      <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-600">{result.type}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
