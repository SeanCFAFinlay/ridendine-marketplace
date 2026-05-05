import * as React from 'react';
import { cn } from '../utils';

type Tone = 'neutral' | 'success' | 'danger' | 'warning' | 'info' | 'primary';
type Freshness = 'live' | 'fresh' | 'stale' | 'offline' | 'error';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-slate-700/80 bg-slate-900/70 text-slate-200',
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  danger: 'border-red-500/30 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  info: 'border-sky-500/30 bg-sky-500/10 text-sky-200',
  primary: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
};

const dotClasses: Record<Freshness, string> = {
  live: 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]',
  fresh: 'bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.65)]',
  stale: 'bg-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.65)]',
  offline: 'bg-slate-500',
  error: 'bg-red-400 shadow-[0_0_18px_rgba(248,113,113,0.65)]',
};

export interface NavItem {
  label: string;
  href: string;
  active?: boolean;
  badge?: string;
}

export function AppShell({
  children,
  nav = [],
  title = 'Ridéndine',
  subtitle,
  actions,
  freshness = 'live',
  className,
}: React.PropsWithChildren<{
  nav?: NavItem[];
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  freshness?: Freshness;
  className?: string;
}>) {
  return (
    <div className={cn('min-h-screen bg-[#080b10] text-slate-100', className)}>
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px]">
        {nav.length > 0 && <SidebarNav items={nav} />}
        <main className="min-w-0 flex-1">
          <TopNav title={title} subtitle={subtitle} actions={actions} freshness={freshness} />
          <div className="space-y-6 px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">{eyebrow}</p>}
        <h1 className="mt-2 text-3xl font-semibold tracking-normal text-white md:text-5xl">{title}</h1>
        {description && <p className="mt-3 text-sm leading-6 text-slate-300 md:text-base">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}

export function TopNav({
  title,
  subtitle,
  actions,
  freshness = 'live',
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  freshness?: Freshness;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b10]/90 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <HealthDot state={freshness} />
            <p className="text-sm font-semibold text-white">{title}</p>
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-slate-950/60 p-4 lg:block">
      <div className="mb-8 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
        <p className="text-lg font-semibold text-white">Ridéndine</p>
        <p className="text-xs text-amber-100/80">Platform control</p>
      </div>
      <nav className="space-y-1">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white',
              item.active && 'bg-white/10 text-white shadow-inner'
            )}
          >
            <span>{item.label}</span>
            {item.badge && <StatusBadge tone="primary">{item.badge}</StatusBadge>}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export function ActionButton({
  children,
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const variants = {
    primary: 'border-amber-400/40 bg-amber-400 text-slate-950 hover:bg-amber-300',
    secondary: 'border-white/10 bg-white/10 text-white hover:bg-white/15',
    danger: 'border-red-400/40 bg-red-500 text-white hover:bg-red-400',
    ghost: 'border-transparent bg-transparent text-slate-300 hover:bg-white/10 hover:text-white',
  };
  return (
    <button
      className={cn('inline-flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50', variants[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

export function StatusBadge({ children, tone = 'neutral' }: React.PropsWithChildren<{ tone?: Tone }>) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold', toneClasses[tone])}>{children}</span>;
}

export function HealthDot({ state = 'live', label }: { state?: Freshness; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs text-slate-300">
      <span className={cn('h-2.5 w-2.5 rounded-full', dotClasses[state])} />
      {label}
    </span>
  );
}

export function LastUpdated({ at, state = 'fresh' }: { at: string; state?: Freshness }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <HealthDot state={state} />
      <span>Updated {at}</span>
    </div>
  );
}

export function MetricCard({ label, value, delta, tone = 'neutral' }: { label: string; value: string; delta?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-400">{label}</p>
        {delta && <StatusBadge tone={tone}>{delta}</StatusBadge>}
      </div>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

export function MoneyCard(props: { label: string; value: string; delta?: string }) {
  return <MetricCard {...props} tone="success" />;
}

export function PayoutCard({ title, amount, status, meta }: { title: string; amount: string; status: string; meta?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-5">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-white">{title}</p>
        <StatusBadge tone={status.toLowerCase().includes('fail') ? 'danger' : 'success'}>{status}</StatusBadge>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{amount}</p>
      {meta && <p className="mt-2 text-sm text-slate-400">{meta}</p>}
    </div>
  );
}

export function LoadingState({ label = 'Loading live data' }: { label?: string }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-8 text-center text-sm text-slate-300">{label}</div>;
}

export function PlatformEmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-slate-900/50 p-8 text-center">
      <p className="font-semibold text-white">{title}</p>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-slate-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PlatformErrorState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
      <p className="font-semibold text-red-100">{title}</p>
      {description && <p className="mt-1 text-sm text-red-100/75">{description}</p>}
    </div>
  );
}

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
}

export function DataTable<T extends Record<string, React.ReactNode>>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/75">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>{columns.map((column) => <th key={String(column.key)} className="px-4 py-3 font-semibold">{column.header}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((row, index) => (
              <tr key={index} className="text-slate-200">
                {columns.map((column) => <td key={String(column.key)} className="px-4 py-3">{column.render ? column.render(row) : row[column.key]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function OrderCard({ id, title, meta, status, amount }: { id: string; title: string; meta: string; status: string; amount?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">{id}</p>
          <p className="mt-1 font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-slate-400">{meta}</p>
        </div>
        <StatusBadge tone="info">{status}</StatusBadge>
      </div>
      {amount && <p className="mt-4 text-lg font-semibold text-amber-200">{amount}</p>}
    </div>
  );
}

export function OrderTimeline({ steps }: { steps: Array<{ label: string; meta?: string; status: Freshness }> }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <HealthDot state={step.status} />
            {index < steps.length - 1 && <span className="mt-2 h-10 w-px bg-white/10" />}
          </div>
          <div>
            <p className="font-medium text-white">{step.label}</p>
            {step.meta && <p className="text-sm text-slate-400">{step.meta}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function LiveFeed({ items }: { items: Array<{ title: string; meta: string; tone?: Tone }> }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.title}-${item.meta}`} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-3">
          <HealthDot state={item.tone === 'danger' ? 'error' : 'live'} />
          <div>
            <p className="text-sm font-medium text-white">{item.title}</p>
            <p className="text-xs text-slate-400">{item.meta}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MapPlaceholder({ label = 'Live map surface' }: { label?: string }) {
  return (
    <div className="relative min-h-[320px] overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_25%_30%,rgba(245,158,11,0.20),transparent_24%),linear-gradient(135deg,#0f172a,#111827_45%,#172554)]">
      <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-1/3 top-1/2 h-3 w-3 rounded-full bg-amber-300 shadow-[0_0_0_8px_rgba(245,158,11,0.16)]" />
      <div className="absolute right-1/4 top-1/3 h-3 w-3 rounded-full bg-emerald-300 shadow-[0_0_0_8px_rgba(52,211,153,0.16)]" />
      <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-white backdrop-blur">{label}</div>
    </div>
  );
}

export function UserAvatar({ name, label }: { name: string; label?: string }) {
  const initials = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-sm font-bold text-slate-950">{initials}</div>
      <div>
        <p className="text-sm font-semibold text-white">{name}</p>
        {label && <p className="text-xs text-slate-400">{label}</p>}
      </div>
    </div>
  );
}

export function TabNav({ tabs }: { tabs: Array<{ label: string; active?: boolean }> }) {
  return <div className="flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70 p-1">{tabs.map((tab) => <button key={tab.label} className={cn('rounded-xl px-4 py-2 text-sm text-slate-300', tab.active && 'bg-white text-slate-950')}>{tab.label}</button>)}</div>;
}

export function SearchInput({ placeholder = 'Search' }: { placeholder?: string }) {
  return <input className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 text-sm text-white placeholder:text-slate-500 focus:border-amber-300 focus:outline-none" placeholder={placeholder} />;
}

export function FilterBar({ children }: React.PropsWithChildren) {
  return <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-3 sm:flex-row sm:items-center">{children}</div>;
}

export function DrawerPanel({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <aside className="rounded-2xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl"><p className="mb-4 text-lg font-semibold text-white">{title}</p>{children}</aside>;
}

export function PlatformModal({ title, children }: React.PropsWithChildren<{ title: string }>) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"><p className="text-lg font-semibold text-white">{title}</p><div className="mt-4">{children}</div></div>;
}

export function ToastMessage({ title, description, tone = 'success' }: { title: string; description?: string; tone?: Tone }) {
  return <div className={cn('rounded-2xl border p-4 shadow-2xl', toneClasses[tone])}><p className="font-semibold">{title}</p>{description && <p className="mt-1 text-sm opacity-80">{description}</p>}</div>;
}
