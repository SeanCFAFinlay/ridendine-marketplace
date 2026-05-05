import {
  ActionButton,
  AppShell,
  DataTable,
  DrawerPanel,
  EmptyState,
  ErrorState,
  FilterBar,
  LastUpdated,
  LiveFeed,
  LoadingState,
  MapPlaceholder,
  MetricCard,
  MoneyCard,
  OrderCard,
  OrderTimeline,
  PageHeader,
  PayoutCard,
  SearchInput,
  StatusBadge,
  TabNav,
  ToastMessage,
  UserAvatar,
} from '@ridendine/ui';

const nav = [
  { label: 'Customer', href: '/ui-blueprint/customer-home' },
  { label: 'Chef', href: '/ui-blueprint/chef-dashboard' },
  { label: 'Driver', href: '/ui-blueprint/driver-home' },
  { label: 'Ops', href: '/ui-blueprint/ops-dashboard', badge: 'Live' },
];

const feed = [
  { title: 'Order RDN-1042 moved to preparing', meta: '12 seconds ago' },
  { title: 'Driver Maya checked into Midtown', meta: '41 seconds ago' },
  { title: 'Payment retry succeeded', meta: '2 minutes ago' },
];

const timeline = [
  { label: 'Accepted', meta: 'Chef confirmed the ticket', status: 'live' as const },
  { label: 'Preparing', meta: 'Estimated 18 minutes', status: 'fresh' as const },
  { label: 'Ready for pickup', meta: 'Waiting on kitchen signal', status: 'stale' as const },
  { label: 'Delivered', meta: 'Pending driver handoff', status: 'offline' as const },
];

const tables = [
  { id: 'RDN-1042', customer: 'Ari Chen', status: <StatusBadge tone="success">Matched</StatusBadge>, amount: '$64.20' },
  { id: 'RDN-1043', customer: 'Mina Patel', status: <StatusBadge tone="warning">Review</StatusBadge>, amount: '$42.10' },
  { id: 'RDN-1044', customer: 'Jon Bell', status: <StatusBadge tone="danger">Failed</StatusBadge>, amount: '$88.40' },
];

const screenMeta: Record<string, { app: string; title: string; description: string }> = {
  'customer-home': { app: 'Customer Web', title: 'Marketplace', description: 'Premium discovery, search, active order visibility, and chef-led merchandising.' },
  'customer-menu': { app: 'Customer Web', title: 'Chef Menu', description: 'Menu categories, item cards, status, and a mobile-friendly sticky cart.' },
  'customer-checkout': { app: 'Customer Web', title: 'Checkout', description: 'Cart, address, fees, payment state, and clear order placement.' },
  'customer-order-tracking': { app: 'Customer Web', title: 'Order Tracking', description: 'ETA, timeline, map surface, driver and chef state.' },
  'customer-account': { app: 'Customer Web', title: 'Account', description: 'Addresses, favorites, orders, and settings.' },
  'chef-dashboard': { app: 'Chef Admin', title: 'Chef Dashboard', description: 'Revenue, availability, live orders, prep pressure, and freshness state.' },
  'chef-orders': { app: 'Chef Admin', title: 'Orders Queue', description: 'New, preparing, ready columns with an order detail drawer.' },
  'chef-menu-manager': { app: 'Chef Admin', title: 'Menu Manager', description: 'Sections, item cards, availability controls, and price actions.' },
  'chef-analytics': { app: 'Chef Admin', title: 'Analytics', description: 'Sales, order volume, popular items, and operating rhythm.' },
  'chef-settings': { app: 'Chef Admin', title: 'Settings', description: 'Profile, payout status, hours, and service area.' },
  'driver-home': { app: 'Driver App', title: 'Driver Home', description: 'Online state, current zone, earnings, and offer stack.' },
  'driver-offer': { app: 'Driver App', title: 'Offer', description: 'Pickup, dropoff, distance, pay estimate, and accept or reject actions.' },
  'driver-active-delivery': { app: 'Driver App', title: 'Active Delivery', description: 'Map, delivery timeline, contact actions, and status progression.' },
  'driver-earnings': { app: 'Driver App', title: 'Earnings', description: 'Daily and weekly payout summary with completed delivery history.' },
  'driver-settings': { app: 'Driver App', title: 'Settings', description: 'Vehicle, profile, and notification preferences.' },
  'ops-dashboard': { app: 'Ops Admin', title: 'Main Ops Dashboard', description: 'Active orders, live drivers, SLA alerts, failed payments, health, and feed.' },
  'ops-dispatch': { app: 'Ops Admin', title: 'Dispatch Board', description: 'Map, unassigned orders, drivers, and manual assignment panel.' },
  'ops-finance': { app: 'Ops Admin', title: 'Finance', description: 'Revenue, payouts, platform fees, and reconciliation state.' },
  'ops-payouts': { app: 'Ops Admin', title: 'Payouts', description: 'Payout runs, pending and failed payouts, approve and hold actions.' },
  'ops-reconciliation': { app: 'Ops Admin', title: 'Reconciliation', description: 'Stripe match status, ledger entries, discrepancies, and audit trail.' },
  'ops-users': { app: 'Ops Admin', title: 'Users and Accounts', description: 'Customers, chefs, drivers, risk, and account status.' },
  'ops-system-health': { app: 'Ops Admin', title: 'System Health', description: 'API, database, webhook, cron, and queue status.' },
};

export function generateStaticParams() {
  return Object.keys(screenMeta).map((screen) => ({ screen }));
}

export default function BlueprintScreen({ params }: { params: { screen: string } }) {
  const meta = screenMeta[params.screen] ?? screenMeta['ops-dashboard']!;
  return (
    <AppShell nav={nav.map((item) => {
      const prefix = item.label.toLowerCase().split(' ')[0] ?? '';
      return { ...item, active: params.screen.startsWith(prefix) };
    })} title={meta.app} subtitle="UI blueprint preview. Demo data only." freshness="live">
      <PageHeader
        eyebrow="Ridéndine UI Blueprint"
        title={meta.title}
        description={meta.description}
        actions={<><LastUpdated at="just now" state="fresh" /><ActionButton>Primary action</ActionButton></>}
      />
      <StateBand />
      {renderScreen(params.screen)}
    </AppShell>
  );
}

function StateBand() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <LoadingState label="Loading state: skeletons and live fetch indicators use this compact surface." />
      <EmptyState title="Empty state" description="Shown when a real API returns no records." />
      <ErrorState title="Unavailable state" description="Shown when live data cannot be reached." />
    </div>
  );
}

function renderScreen(screen: string) {
  if (screen.includes('menu')) return <MenuSurface />;
  if (screen.includes('checkout')) return <CheckoutSurface />;
  if (screen.includes('tracking') || screen.includes('active-delivery')) return <TrackingSurface />;
  if (screen.includes('orders')) return <OrdersSurface />;
  if (screen.includes('dispatch')) return <DispatchSurface />;
  if (screen.includes('finance') || screen.includes('payout') || screen.includes('earnings') || screen.includes('reconciliation')) return <FinanceSurface />;
  if (screen.includes('health')) return <HealthSurface />;
  if (screen.includes('settings') || screen.includes('account') || screen.includes('users')) return <AccountSurface />;
  if (screen.includes('offer')) return <OfferSurface />;
  return <DashboardSurface />;
}

function DashboardSurface() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_.8fr]">
      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Active orders" value="128" delta="+12%" tone="success" />
          <MetricCard label="Live drivers" value="42" delta="4 stale" tone="warning" />
          <MoneyCard label="Today revenue" value="$18.4k" delta="+8.6%" />
          <MetricCard label="SLA alerts" value="7" delta="Needs action" tone="danger" />
        </div>
        <MapPlaceholder label="Demand, driver, and order density" />
        <DataTable columns={[{ key: 'id', header: 'Order' }, { key: 'customer', header: 'Customer' }, { key: 'status', header: 'Status' }, { key: 'amount', header: 'Amount' }]} rows={tables} />
      </section>
      <section className="space-y-4"><ToastMessage title="Action result" description="Manual assignment saved to the dispatch log." /><LiveFeed items={feed} /></section>
    </div>
  );
}

function MenuSurface() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <section className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[linear-gradient(135deg,rgba(245,158,11,.22),rgba(15,23,42,.92))] p-6"><UserAvatar name="Sofia Marin" label="Mediterranean bowls. 4.9 rating." /></div>
        <TabNav tabs={[{ label: 'Bowls', active: true }, { label: 'Skewers' }, { label: 'Sides' }, { label: 'Drinks' }]} />
        <div className="grid gap-4 md:grid-cols-2">{['Harissa chicken bowl', 'Lemon herb salmon', 'Falafel mezze', 'Saffron rice plate'].map((title) => <OrderCard key={title} id="$18.00" title={title} meta="Ready in 20-25 min" status="Available" />)}</div>
      </section>
      <DrawerPanel title="Sticky cart"><OrderCard id="2 items" title="Estimated total" meta="Includes fees and taxes" status="Ready" amount="$42.80" /><ActionButton className="mt-4 w-full">Checkout</ActionButton></DrawerPanel>
    </div>
  );
}

function CheckoutSurface() {
  return <div className="grid gap-6 lg:grid-cols-[1fr_24rem]"><section className="space-y-4"><OrderCard id="Cart item" title="Harissa chicken bowl" meta="Qty 2, no onions" status="Confirmed" /><OrderCard id="Delivery" title="121 King St W" meta="Leave with concierge" status="Validated" /><OrderCard id="Payment" title="Visa ending 4242" meta="Authorization pending" status="Fresh" /></section><DrawerPanel title="Order summary"><PayoutCard title="Subtotal" amount="$36.00" status="Ready" meta="Fees $3.20, tax $3.60" /><ActionButton className="mt-4 w-full">Place order</ActionButton></DrawerPanel></div>;
}

function TrackingSurface() {
  return <div className="grid gap-6 lg:grid-cols-[1fr_24rem]"><MapPlaceholder label="Driver route and ETA" /><DrawerPanel title="ETA 24 min"><OrderTimeline steps={timeline} /><div className="mt-5 grid grid-cols-2 gap-2"><ActionButton variant="secondary">Contact chef</ActionButton><ActionButton variant="secondary">Contact driver</ActionButton></div></DrawerPanel></div>;
}

function OrdersSurface() {
  return <div className="grid gap-4 lg:grid-cols-4">{['New', 'Preparing', 'Ready'].map((column) => <section key={column} className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/50 p-3"><h2 className="font-semibold text-white">{column}</h2><OrderCard id="RDN-1042" title="2 bowls, 1 drink" meta="Pickup in 18 min" status={column} /><OrderCard id="RDN-1048" title="Family mezze set" meta="VIP customer" status={column} /></section>)}<DrawerPanel title="Order detail"><OrderTimeline steps={timeline.slice(0, 3)} /><ActionButton className="mt-4 w-full">Mark ready</ActionButton></DrawerPanel></div>;
}

function DispatchSurface() {
  return <div className="grid gap-6 xl:grid-cols-[1fr_24rem]"><MapPlaceholder label="Dispatch map" /><DrawerPanel title="Manual assignment"><FilterBar><SearchInput placeholder="Search drivers or orders" /></FilterBar><div className="mt-4 space-y-3"><OrderCard id="RDN-1080" title="Unassigned order" meta="3.2 km pickup" status="Needs driver" /><UserAvatar name="Maya Singh" label="0.8 km away. Fresh GPS." /><ActionButton className="w-full">Assign driver</ActionButton></div></DrawerPanel></div>;
}

function FinanceSurface() {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-4"><MoneyCard label="Revenue" value="$84.2k" delta="+11%" /><PayoutCard title="Chef payouts" amount="$42.1k" status="Pending" /><PayoutCard title="Driver payouts" amount="$18.6k" status="Approved" /><MetricCard label="Discrepancies" value="3" delta="Review" tone="warning" /></div><DataTable columns={[{ key: 'id', header: 'Ledger' }, { key: 'customer', header: 'Owner' }, { key: 'status', header: 'Match' }, { key: 'amount', header: 'Amount' }]} rows={tables} /></div>;
}

function HealthSurface() {
  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">{['API', 'Database', 'Webhooks', 'Cron', 'Queue'].map((name, i) => <MetricCard key={name} label={`${name} status`} value={i === 2 ? 'Degraded' : 'Healthy'} delta={i === 2 ? 'Stale' : 'Live'} tone={i === 2 ? 'warning' : 'success'} />)}</div>;
}

function AccountSurface() {
  return <div className="grid gap-6 lg:grid-cols-[20rem_1fr]"><DrawerPanel title="Profile"><UserAvatar name="Ari Chen" label="Customer since 2026" /><div className="mt-4 space-y-2"><StatusBadge tone="success">Verified</StatusBadge><StatusBadge tone="info">Notifications on</StatusBadge></div></DrawerPanel><section className="grid gap-4 md:grid-cols-2"><OrderCard id="Address" title="121 King St W" meta="Default delivery address" status="Saved" /><OrderCard id="Favorites" title="8 chefs saved" meta="Mediterranean, Thai, Korean" status="Fresh" /><OrderCard id="Settings" title="Payment and alerts" meta="Managed through secure flows" status="Ready" /><OrderCard id="Orders" title="24 past orders" meta="Most recent today" status="Live" /></section></div>;
}

function OfferSurface() {
  return <div className="mx-auto max-w-xl space-y-5"><MapPlaceholder label="Offer route preview" /><OrderCard id="Offer" title="$14.80 estimated pay" meta="Pickup 1.1 km. Dropoff 4.2 km." status="Expires in 42s" /><div className="grid grid-cols-2 gap-3"><ActionButton variant="danger">Reject</ActionButton><ActionButton>Accept</ActionButton></div></div>;
}
