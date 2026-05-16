import { cookies } from 'next/headers';
import Link from 'next/link';
import {
  createServerClient,
  getStorefrontByChefId,
  getOrdersByStorefront,
  getMenuItemsByStorefront,
  getMenuCategoriesByStorefront,
} from '@ridendine/db';
import type { Tables } from '@ridendine/db';
import {
  AlertTriangle,
  Banknote,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChefHat,
  Clock,
  DollarSign,
  ExternalLink,
  Eye,
  Flame,
  Image,
  Package,
  PackageX,
  PauseCircle,
  Plus,
  ReceiptText,
  Store,
  TrendingUp,
  Utensils,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

type OrderRow = Awaited<ReturnType<typeof getOrdersByStorefront>>[number] & {
  customer?: { first_name: string | null; last_name: string | null } | null;
};

type MenuItemRow = Awaited<ReturnType<typeof getMenuItemsByStorefront>>[number];
type StorefrontRow = Awaited<ReturnType<typeof getStorefrontByChefId>>;
type ChefProfile = Pick<Tables<'chef_profiles'>, 'id' | 'display_name' | 'status' | 'phone' | 'bio'>;

const ACTIVE_ORDER_STATUSES = ['pending', 'accepted', 'preparing', 'ready_for_pickup'];
const ACTION_ORDER_STATUSES = ['pending', 'accepted', 'preparing'];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-warningSoft text-warning border border-warning/30',
  accepted: 'bg-infoSoft text-info border border-info/30',
  preparing: 'bg-infoSoft text-info border border-info/30',
  ready_for_pickup: 'bg-successSoft text-success border border-success/30',
  picked_up: 'bg-accentSoft text-accent border border-accent/30',
  delivered: 'bg-surfaceMuted text-text border border-border',
  cancelled: 'bg-dangerSoft text-danger border border-danger/30',
  rejected: 'bg-dangerSoft text-danger border border-danger/30',
};

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatStatus(status: string) {
  return status.replace(/_/g, ' ');
}

function getMinutesSince(dateValue: string) {
  return Math.max(0, Math.round((Date.now() - Date.parse(dateValue)) / 60000));
}

function getOrderAge(createdAt: string) {
  const minutes = getMinutesSince(createdAt);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function getDueLabel(order: OrderRow) {
  if (!order.estimated_ready_at) return order.estimated_prep_minutes ? `${order.estimated_prep_minutes} min prep` : 'Prep time not set';
  const minutes = Math.round((Date.parse(order.estimated_ready_at) - Date.now()) / 60000);
  if (minutes < -5) return `${Math.abs(minutes)} min late`;
  if (minutes < 0) return 'Due now';
  if (minutes < 60) return `Due in ${minutes} min`;
  return `Due ${new Date(order.estimated_ready_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function getCustomerName(order: OrderRow) {
  const name = order.customer ? `${order.customer.first_name ?? ''} ${order.customer.last_name ?? ''}`.trim() : '';
  return name || 'Customer order';
}

async function getChefContext(): Promise<{
  chef: ChefProfile | null;
  storefront: StorefrontRow;
}> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { chef: null, storefront: null };

    const { data: chef, error } = await supabase
      .from('chef_profiles')
      .select('id, display_name, status, phone, bio')
      .eq('user_id', user.id)
      .single();

    if (error || !chef) return { chef: null, storefront: null };
    const storefront = await getStorefrontByChefId(supabase as any, chef.id);
    return { chef: chef as ChefProfile, storefront };
  } catch {
    return { chef: null, storefront: null };
  }
}

async function hasStripeAccount(chefId: string): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data } = await supabase
      .from('chef_payout_accounts')
      .select('stripe_account_id')
      .eq('chef_id', chefId)
      .maybeSingle();
    return Boolean(data?.stripe_account_id);
  } catch {
    return false;
  }
}

async function getAvailabilitySummary(storefrontId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const { data } = await supabase
      .from('chef_availability')
      .select('day_of_week, is_available')
      .eq('storefront_id', storefrontId);
    const rows = data ?? [];
    return {
      configuredDays: rows.length,
      openDays: rows.filter((row: { is_available: boolean }) => row.is_available).length,
    };
  } catch {
    return { configuredDays: 0, openDays: 0 };
  }
}

async function getDashboardData(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  let allOrders: OrderRow[] = [];
  let menuItems: MenuItemRow[] = [];
  let menuCategories: Awaited<ReturnType<typeof getMenuCategoriesByStorefront>> = [];

  try {
    allOrders = (await getOrdersByStorefront(supabase as any, storefrontId)) as OrderRow[];
  } catch {
    allOrders = [];
  }

  try {
    menuItems = await getMenuItemsByStorefront(supabase as any, storefrontId, { includeUnavailable: true });
    menuCategories = await getMenuCategoriesByStorefront(supabase as any, storefrontId);
  } catch {
    menuItems = [];
    menuCategories = [];
  }

  const recentOrders = allOrders.slice(0, 8);
  const actionOrders = allOrders.filter((order) => ACTION_ORDER_STATUSES.includes(order.status)).slice(0, 6);
  const prepOrders = allOrders
    .filter((order) => ['accepted', 'preparing', 'ready_for_pickup'].includes(order.status))
    .slice()
    .sort((a, b) => Date.parse(a.estimated_ready_at ?? a.created_at) - Date.parse(b.estimated_ready_at ?? b.created_at))
    .slice(0, 6);
  const customerIds = [
    ...new Set([...recentOrders, ...actionOrders, ...prepOrders].map((order) => order.customer_id).filter(Boolean)),
  ];
  let customers: Array<{ id: string; first_name: string | null; last_name: string | null }> = [];
  if (customerIds.length > 0) {
    try {
      const { data } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .in('id', customerIds);
      customers = data ?? [];
    } catch {
      customers = [];
    }
  }

  const activeOrders = allOrders.filter((order) => ACTIVE_ORDER_STATUSES.includes(order.status));
  const readyOrders = allOrders.filter((order) => order.status === 'ready_for_pickup');
  const lateOrders = activeOrders.filter((order) => order.estimated_ready_at && Date.parse(order.estimated_ready_at) < Date.now());
  const todayOrders = allOrders.filter((order) => new Date(order.created_at) >= today);
  const monthOrders = allOrders.filter((order) => new Date(order.created_at) >= monthStart);
  const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const withCustomer = (order: OrderRow): OrderRow => ({
    ...order,
    customer: customers.find((customer) => customer.id === order.customer_id) ?? null,
  });

  const availableItems = menuItems.filter((item) => item.is_available && !item.is_sold_out);
  const soldOutItems = menuItems.filter((item) => item.is_sold_out);
  const lowStockItems = menuItems
    .filter((item) => item.daily_limit != null && Number(item.daily_limit) - Number(item.daily_sold ?? 0) <= 3)
    .slice(0, 5);
  const missingContentItems = menuItems.filter((item) => !item.image_url || !item.description).slice(0, 5);
  const featuredItems = menuItems.filter((item) => item.is_featured);

  return {
    stats: {
      activeOrders: activeOrders.length,
      actionOrders: actionOrders.length,
      readyOrders: readyOrders.length,
      lateOrders: lateOrders.length,
      todayOrders: todayOrders.length,
      todayRevenue,
      monthOrders: monthOrders.length,
      monthRevenue,
      averageTicket: todayOrders.length ? todayRevenue / todayOrders.length : 0,
    },
    recentOrders: recentOrders.map(withCustomer),
    actionOrders: actionOrders.map(withCustomer),
    prepOrders: prepOrders.map(withCustomer),
    menu: {
      total: menuItems.length,
      available: availableItems.length,
      soldOut: soldOutItems.length,
      missingImages: menuItems.filter((item) => !item.image_url).length,
      missingDescriptions: menuItems.filter((item) => !item.description).length,
      limited: menuItems.filter((item) => item.daily_limit != null).length,
      categories: menuCategories.length,
      featured: featuredItems.length,
      lowStockItems,
      soldOutItems: soldOutItems.slice(0, 5),
      missingContentItems,
    },
  };
}

function buildReadiness({
  chef,
  storefront,
  stripeConnected,
  availability,
  menu,
}: {
  chef: ChefProfile | null;
  storefront: NonNullable<StorefrontRow>;
  stripeConnected: boolean;
  availability: { configuredDays: number; openDays: number };
  menu: Awaited<ReturnType<typeof getDashboardData>>['menu'];
}) {
  return [
    {
      label: 'Ops approval',
      ready: chef?.status === 'approved',
      detail: chef?.status === 'approved' ? 'Chef profile approved' : `Profile status: ${chef?.status ?? 'missing'}`,
      href: '/dashboard/settings',
    },
    {
      label: 'Storefront live',
      ready: storefront.is_active && !storefront.is_paused,
      detail: storefront.is_paused
        ? storefront.paused_reason || 'Paused by ops'
        : storefront.is_active
          ? 'Visible to customers'
          : 'Waiting for ops publication',
      href: '/dashboard/storefront',
    },
    {
      label: 'Menu ready',
      ready: menu.available > 0 && menu.categories > 0,
      detail: `${menu.available} available items across ${menu.categories} categories`,
      href: '/dashboard/menu',
    },
    {
      label: 'Menu content',
      ready: menu.total > 0 && menu.missingImages === 0 && menu.missingDescriptions === 0,
      detail: `${menu.missingImages} missing images, ${menu.missingDescriptions} missing descriptions`,
      href: '/dashboard/menu',
    },
    {
      label: 'Hours configured',
      ready: availability.openDays > 0,
      detail: `${availability.openDays} open days configured`,
      href: '/dashboard/availability',
    },
    {
      label: 'Payout setup',
      ready: stripeConnected,
      detail: stripeConnected ? 'Stripe payout connected' : 'Stripe payout setup required',
      href: '/dashboard/payouts',
    },
  ];
}

function EmptyStorefront() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primarySoft">
        <Store className="h-8 w-8 text-primary" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-text">Set up your storefront</h2>
        <p className="mt-1 max-w-md text-textMuted">
          Your chef dashboard starts with a storefront. Add your business details, prep times, hours, and menu so ops can review and publish it.
        </p>
      </div>
      <Link
        href="/dashboard/storefront"
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover"
      >
        Set Up Storefront
      </Link>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-divider bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-textMuted">{label}</p>
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-text">{value}</p>
      <p className="mt-1 text-xs text-textMuted">{detail}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const { chef, storefront } = await getChefContext();

  if (!storefront) return <EmptyStorefront />;

  const [dashboard, stripeConnected, availability] = await Promise.all([
    getDashboardData(storefront.id),
    chef ? hasStripeAccount(chef.id) : Promise.resolve(false),
    getAvailabilitySummary(storefront.id),
  ]);

  const readiness = buildReadiness({
    chef,
    storefront,
    stripeConnected,
    availability,
    menu: dashboard.menu,
  });
  const readinessComplete = readiness.filter((item) => item.ready).length;

  const alerts = [
    !stripeConnected
      ? {
          label: 'Payout setup required',
          detail: 'Connect Stripe so finance can release chef payouts.',
          href: '/dashboard/payouts',
          tone: 'amber',
        }
      : null,
    dashboard.stats.actionOrders > 0
      ? {
          label: `${dashboard.stats.actionOrders} orders need action`,
          detail: 'Accept, start preparing, or mark ready from the order queue.',
          href: '/dashboard/orders',
          tone: 'orange',
        }
      : null,
    dashboard.stats.lateOrders > 0
      ? {
          label: `${dashboard.stats.lateOrders} orders are late`,
          detail: 'Review the prep timeline and update the order state.',
          href: '/dashboard/orders',
          tone: 'red',
        }
      : null,
    dashboard.menu.missingImages + dashboard.menu.missingDescriptions > 0
      ? {
          label: 'Menu content needs polish',
          detail: `${dashboard.menu.missingImages} images and ${dashboard.menu.missingDescriptions} descriptions missing.`,
          href: '/dashboard/menu',
          tone: 'gray',
        }
      : null,
    availability.openDays === 0
      ? {
          label: 'Kitchen hours are closed',
          detail: 'Add available days so customers know when they can order.',
          href: '/dashboard/availability',
          tone: 'red',
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; detail: string; href: string; tone: string }>;

  const statCards = [
    {
      label: 'Orders Today',
      value: dashboard.stats.todayOrders,
      detail: `${dashboard.stats.actionOrders} need action`,
      icon: ReceiptText,
      accent: 'text-info bg-infoSoft',
    },
    {
      label: 'Today Revenue',
      value: money(dashboard.stats.todayRevenue),
      detail: `${money(dashboard.stats.averageTicket)} average ticket`,
      icon: DollarSign,
      accent: 'text-primary bg-primarySoft',
    },
    {
      label: 'Menu Ready',
      value: `${dashboard.menu.available}/${dashboard.menu.total}`,
      detail: `${dashboard.menu.soldOut} sold out, ${dashboard.menu.lowStockItems.length} low stock`,
      icon: Utensils,
      accent: 'text-success bg-successSoft',
    },
    {
      label: 'This Month',
      value: money(dashboard.stats.monthRevenue),
      detail: `${dashboard.stats.monthOrders} orders`,
      icon: TrendingUp,
      accent: 'text-info bg-infoSoft',
    },
  ];

  const serviceLabel = storefront.is_paused ? 'Paused' : storefront.is_active ? 'Live and accepting visibility' : 'Draft';
  const serviceTone = storefront.is_paused
    ? 'border-warning/30 bg-warningSoft text-warning'
    : storefront.is_active
      ? 'border-success/30 bg-successSoft text-success'
      : 'border-border bg-surfaceMuted text-text';

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-primary">
                <ChefHat className="h-3.5 w-3.5" />
                Chef operating dashboard
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${serviceTone}`}>
                {storefront.is_paused ? <PauseCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {serviceLabel}
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-text">{storefront.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-textMuted">
              Start service here: watch orders, protect prep time, manage stock, keep the storefront ready, and jump straight to the work that makes money.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap xl:justify-end">
            <Link href="/dashboard/orders" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover">
              <BellRing className="mr-2 h-4 w-4" />
              Orders
            </Link>
            <Link href="/dashboard/menu" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:border-primary/40">
              <Plus className="mr-2 h-4 w-4" />
              Menu item
            </Link>
            <Link href="/dashboard/availability" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:border-primary/40">
              <CalendarClock className="mr-2 h-4 w-4" />
              Hours
            </Link>
            <Link href={`https://ridendine.ca/chefs/${storefront.slug}`} className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text hover:border-primary/40">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Link>
          </div>
        </div>
      </section>

      {alerts.length > 0 && (
        <section className="grid gap-3 lg:grid-cols-2">
          {alerts.slice(0, 4).map((alert) => (
            <Link
              key={alert.label}
              href={alert.href}
              className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors hover:border-primary/40 ${
                alert.tone === 'red'
                  ? 'border-danger/30 bg-dangerSoft'
                  : alert.tone === 'amber'
                    ? 'border-warning/30 bg-warningSoft'
                    : alert.tone === 'orange'
                      ? 'border-primary/20 bg-primarySoft'
                      : 'border-border bg-white'
              }`}
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{alert.label}</p>
                <p className="mt-1 text-xs text-textMuted">{alert.detail}</p>
              </div>
              <ExternalLink className="mt-1 h-4 w-4 flex-shrink-0 text-textSubtle" />
            </Link>
          ))}
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr,0.75fr]">
        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-divider px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-text">Today&apos;s Action Queue</h2>
              <p className="mt-1 text-xs text-textMuted">The orders that need a chef decision or next state right now.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-primary hover:text-primaryHover">
              Open live orders
            </Link>
          </div>
          <div className="divide-y divide-divider">
            {dashboard.actionOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="mt-3 text-sm font-semibold text-text">No orders need action</p>
                <p className="mt-1 text-xs text-textMuted">New, accepted, and preparing orders will appear here.</p>
              </div>
            ) : (
              dashboard.actionOrders.map((order) => (
                <div key={order.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-text">#{order.order_number}</p>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                        {formatStatus(order.status)}
                      </span>
                      {getMinutesSince(order.created_at) >= 8 && order.status === 'pending' ? (
                        <span className="rounded-full bg-dangerSoft px-2.5 py-0.5 text-xs font-semibold text-danger">accept late</span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-text">{getCustomerName(order)}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-textMuted">
                      <Clock className="h-3.5 w-3.5" />
                      {getOrderAge(order.created_at)} - {getDueLabel(order)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-text">{money(order.total)}</p>
                    <Link
                      href="/dashboard/orders"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-text hover:border-primary/40"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="border-b border-divider px-5 py-4">
            <h2 className="font-bold text-text">Prep Timeline</h2>
            <p className="mt-1 text-xs text-textMuted">Keep kitchen timing organized for active service.</p>
          </div>
          <div className="space-y-3 p-5">
            {dashboard.prepOrders.length === 0 ? (
              <div className="rounded-xl bg-surfaceMuted p-4 text-sm text-textMuted">No active prep tickets right now.</div>
            ) : (
              dashboard.prepOrders.map((order) => (
                <Link key={order.id} href="/dashboard/orders" className="flex gap-3 rounded-xl border border-divider p-3 hover:border-primary/40">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate font-mono text-sm font-semibold text-text">#{order.order_number}</p>
                      <span className="text-xs font-semibold text-textMuted">{getDueLabel(order)}</span>
                    </div>
                    <p className="mt-1 text-xs text-textMuted">{formatStatus(order.status)} - {getCustomerName(order)}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-divider px-5 py-4">
            <div>
              <h2 className="font-bold text-text">Menu Health</h2>
              <p className="mt-1 text-xs text-textMuted">Stock, content, and sales readiness.</p>
            </div>
            <Package className="h-5 w-5 text-textSubtle" />
          </div>
          <div className="grid grid-cols-2 gap-3 p-5">
            {[
              ['Available', dashboard.menu.available],
              ['Sold out', dashboard.menu.soldOut],
              ['Low stock', dashboard.menu.lowStockItems.length],
              ['Featured', dashboard.menu.featured],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-surfaceMuted p-4">
                <p className="text-xs font-medium text-textMuted">{label}</p>
                <p className="mt-1 text-xl font-bold text-text">{value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 px-5 pb-5">
            {dashboard.menu.lowStockItems.slice(0, 3).map((item) => (
              <Link key={item.id} href="/dashboard/menu" className="flex items-center justify-between rounded-lg border border-warning/20 bg-warningSoft px-3 py-2 text-sm">
                <span className="truncate font-medium text-warning">{item.name}</span>
                <span className="text-xs text-warning">{Number(item.daily_limit) - Number(item.daily_sold ?? 0)} left</span>
              </Link>
            ))}
            {dashboard.menu.soldOutItems.slice(0, 2).map((item) => (
              <Link key={item.id} href="/dashboard/menu" className="flex items-center gap-2 rounded-lg border border-danger/20 bg-dangerSoft px-3 py-2 text-sm text-danger">
                <PackageX className="h-4 w-4" />
                <span className="truncate font-medium">{item.name}</span>
              </Link>
            ))}
            <Link href="/dashboard/menu" className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-text px-4 py-2 text-sm font-semibold text-white hover:bg-text/85">
              Manage Menu
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="border-b border-divider px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-bold text-text">Storefront Readiness</h2>
                <p className="mt-1 text-xs text-textMuted">{readinessComplete} of {readiness.length} checks complete</p>
              </div>
              <span className="rounded-full bg-surfaceMuted px-3 py-1 text-xs font-semibold text-text">
                {Math.round((readinessComplete / readiness.length) * 100)}%
              </span>
            </div>
          </div>
          <div className="space-y-3 p-5">
            {readiness.map((item) => (
              <Link key={item.label} href={item.href} className="flex items-start gap-3 rounded-xl border border-divider p-3 transition-colors hover:border-primary/30">
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text">{item.label}</p>
                  <p className="mt-0.5 text-xs text-textMuted">{item.detail}</p>
                </div>
                <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-textSubtle" />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="border-b border-divider px-5 py-4">
            <h2 className="font-bold text-text">Quick Tools</h2>
            <p className="mt-1 text-xs text-textMuted">Common tasks without hunting through the app.</p>
          </div>
          <div className="grid gap-3 p-5">
            {[
              { label: 'Add or edit menu item', href: '/dashboard/menu', icon: Plus },
              { label: 'Mark items sold out', href: '/dashboard/menu', icon: PackageX },
              { label: 'Update kitchen hours', href: '/dashboard/availability', icon: CalendarClock },
              { label: 'Improve storefront photos', href: '/dashboard/storefront', icon: Image },
              { label: 'Open payout center', href: '/dashboard/payouts', icon: Banknote },
              { label: 'Preview customer storefront', href: `https://ridendine.ca/chefs/${storefront.slug}`, icon: Eye },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.label} href={tool.href} className="flex items-center gap-3 rounded-xl border border-divider p-3 text-sm font-semibold text-text hover:border-primary/40">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primarySoft text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{tool.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <div className="rounded-2xl border border-divider bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-text">Business Snapshot</h2>
              <p className="mt-1 text-xs text-textMuted">Simple numbers for the chef to make decisions.</p>
            </div>
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-surfaceMuted px-4 py-3">
              <span className="text-sm text-textMuted">Today revenue</span>
              <span className="font-bold text-text">{money(dashboard.stats.todayRevenue)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surfaceMuted px-4 py-3">
              <span className="text-sm text-textMuted">Average ticket</span>
              <span className="font-bold text-text">{money(dashboard.stats.averageTicket)}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-surfaceMuted px-4 py-3">
              <span className="text-sm text-textMuted">Month revenue</span>
              <span className="font-bold text-text">{money(dashboard.stats.monthRevenue)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-divider bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-divider px-5 py-4">
            <div>
              <h2 className="font-bold text-text">Recent Orders</h2>
              <p className="mt-1 text-xs text-textMuted">Latest customer orders for this storefront.</p>
            </div>
            <Link href="/dashboard/orders" className="text-sm font-semibold text-primary hover:text-primaryHover">
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            {dashboard.recentOrders.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm font-medium text-text">No orders yet</p>
                <p className="mt-1 text-xs text-textMuted">Orders will appear here once customers start ordering.</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-divider text-left text-xs font-medium uppercase tracking-wide text-textSubtle">
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                  {dashboard.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-surfaceMuted/50">
                      <td className="px-5 py-3.5 font-mono text-sm font-semibold text-text">#{order.order_number}</td>
                      <td className="px-5 py-3.5 text-sm text-textMuted">{getCustomerName(order)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[order.status] ?? STATUS_STYLES.pending}`}>
                          {formatStatus(order.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-text">{money(order.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
