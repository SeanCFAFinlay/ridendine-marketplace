'use client';

import * as React from 'react';

type Status = 'WIRED' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
type ChangeType = 'feature' | 'bug' | 'design' | 'wiring' | 'docs';
type ChangePriority = 'critical' | 'high' | 'medium' | 'low';

interface PageEntry {
  id: string;
  app: string;
  name: string;
  route: string;
  screenshot: string;
  publicScreenshot: string;
  designIntent: string;
  components: string[];
  apis: string[];
  dbTables: string[];
  packages: string[];
  docs: string[];
  status: Status;
  missingWiring: string[];
  changeRequests: string[];
  implementationNotes?: string[];
}

interface Registry {
  generatedAt: string;
  pages: PageEntry[];
}

interface ChangeRequest {
  id: string;
  pageId: string;
  title: string;
  type: ChangeType;
  priority: ChangePriority;
  status: 'requested' | 'planned' | 'in_progress' | 'done' | 'blocked';
  description: string;
  filesLikelyAffected: string[];
  docsToUpdate: string[];
  createdAt: string;
  updatedAt: string;
}

const statusClass: Record<Status, string> = {
  WIRED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  PARTIAL: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  MISSING: 'border-red-400/30 bg-red-400/10 text-red-100',
  UNKNOWN: 'border-slate-400/30 bg-slate-400/10 text-slate-200',
};

const wiringMaps = [
  { title: 'Route Inventory', path: 'docs/wiring/ROUTE_INVENTORY.md' },
  { title: 'API Inventory', path: 'docs/wiring/API_INVENTORY.md' },
  { title: 'Page Wiring Matrix', path: 'docs/wiring/PAGE_WIRING_MATRIX.md' },
  { title: 'Missing Wiring Report', path: 'docs/wiring/MISSING_WIRING_REPORT.md' },
  { title: 'Master Wiring Diagram', path: 'docs/wiring/RIDENDINE_MASTER_WIRING_DIAGRAM.md' },
];

function docHref(path: string) {
  return `/internal/command-center/docs/${path}`;
}

function Badge({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) {
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

export default function CommandCenterClient({
  registry,
  initialChangeRequests,
  environment,
}: {
  registry: Registry;
  initialChangeRequests: ChangeRequest[];
  environment: string;
}) {
  const [appFilter, setAppFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState(registry.pages[0]?.id ?? '');
  const [changeRequests, setChangeRequests] = React.useState<ChangeRequest[]>(initialChangeRequests);
  const [formTitle, setFormTitle] = React.useState('');
  const [formDescription, setFormDescription] = React.useState('');
  const [formPriority, setFormPriority] = React.useState<ChangePriority>('medium');
  const [formType, setFormType] = React.useState<ChangeType>('design');
  const [apiMessage, setApiMessage] = React.useState('');

  const selected = registry.pages.find((page) => page.id === selectedId) ?? registry.pages[0];
  const total = registry.pages.length;
  const counts = registry.pages.reduce<Record<Status, number>>((acc, page) => {
    acc[page.status] += 1;
    return acc;
  }, { WIRED: 0, PARTIAL: 0, MISSING: 0, UNKNOWN: 0 });

  const apps = ['all', ...unique(registry.pages.map((page) => page.app))];
  const filtered = registry.pages.filter((page) => {
    const haystack = [
      page.name,
      page.route,
      page.designIntent,
      page.app,
      page.status,
      ...page.components,
      ...page.apis,
      ...page.dbTables,
      ...page.packages,
    ].join(' ').toLowerCase();
    return (appFilter === 'all' || page.app === appFilter)
      && (statusFilter === 'all' || page.status === statusFilter)
      && haystack.includes(query.toLowerCase());
  });

  async function addChangeRequest(page: PageEntry) {
    setApiMessage('');
    if (!formTitle.trim()) {
      setApiMessage('Add a title before submitting.');
      return;
    }

    const response = await fetch('/api/internal/command-center/change-requests', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        pageId: page.id,
        title: formTitle,
        type: formType,
        priority: formPriority,
        status: 'requested',
        description: formDescription,
        filesLikelyAffected: [],
        docsToUpdate: page.docs,
      }),
    });

    if (!response.ok) {
      setApiMessage(`Change request API returned ${response.status}.`);
      return;
    }

    const payload = await response.json();
    setChangeRequests(payload.changeRequests);
    setFormTitle('');
    setFormDescription('');
    setApiMessage(`Added change request for ${page.name}.`);
  }

  return (
    <main className="min-h-screen bg-[#080b10] text-slate-100">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-100">{environment}</Badge>
                <Badge className="border-sky-400/30 bg-sky-400/10 text-sky-100">Generated {new Date(registry.generatedAt).toLocaleString()}</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-normal text-white">Ridéndine Command Center</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Internal visual registry for UI blueprints, screenshots, wiring status, docs links, and change requests.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[['Pages', total], ['WIRED', counts.WIRED], ['PARTIAL', counts.PARTIAL], ['MISSING', counts.MISSING], ['UNKNOWN', counts.UNKNOWN]].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        <section className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-slate-950/70 p-4 lg:grid-cols-[12rem_12rem_1fr]">
          <select value={appFilter} onChange={(event) => setAppFilter(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white">
            {apps.map((app) => <option key={app}>{app}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white">
            {['all', 'WIRED', 'PARTIAL', 'MISSING', 'UNKNOWN'].map((status) => <option key={status}>{status}</option>)}
          </select>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search page, component, API, table, package" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-4 text-sm text-white placeholder:text-slate-500" />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_28rem]">
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {filtered.map((page) => (
              <article key={page.id} onClick={() => setSelectedId(page.id)} className="cursor-pointer overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-2xl transition hover:border-amber-300/40">
                <img src={page.publicScreenshot} alt={`${page.name} screenshot`} className="h-52 w-full bg-slate-900 object-cover object-top" />
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-white">{page.name}</h2>
                      <p className="mt-1 text-xs text-slate-400">{page.route}</p>
                    </div>
                    <Badge className={statusClass[page.status]}>{page.status}</Badge>
                  </div>
                  <p className="text-sm leading-5 text-slate-300">{page.designIntent}</p>
                  <div className="flex flex-wrap gap-1.5">{page.components.slice(0, 4).map((component) => <Badge key={component} className="border-white/10 bg-white/5 text-slate-300">{component}</Badge>)}</div>
                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <a href={page.route} className="rounded-xl bg-amber-400 px-3 py-2 text-center font-semibold text-slate-950">Open Page</a>
                    <a href={page.publicScreenshot} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-white">Open Screenshot</a>
                    <a href={docHref(page.docs[0] ?? 'docs/ui/COMMAND_CENTER.md')} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-white">Open Docs</a>
                    <button onClick={(event) => { event.stopPropagation(); setSelectedId(page.id); }} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">View Wiring</button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {selected && (
            <aside className="sticky top-5 h-fit rounded-3xl border border-white/10 bg-slate-950/90 p-5 shadow-2xl">
              <img src={selected.publicScreenshot} alt={`${selected.name} full screenshot`} className="max-h-[360px] w-full rounded-2xl border border-white/10 object-cover object-top" />
              <div className="mt-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{selected.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{selected.route}</p>
                </div>
                <Badge className={statusClass[selected.status]}>{selected.status}</Badge>
              </div>

              <Detail label="Components" values={selected.components} />
              <Detail label="APIs" values={selected.apis} />
              <Detail label="DB Tables" values={selected.dbTables} />
              <Detail label="Packages" values={selected.packages} />
              <Detail label="Missing Wiring" values={selected.missingWiring} />
              <Detail label="Implementation Notes" values={selected.implementationNotes ?? []} />

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Docs</p>
                <div className="space-y-2">{selected.docs.map((doc) => <a key={doc} href={docHref(doc)} className="block rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-amber-100">{doc}</a>)}</div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="font-semibold text-white">Add Change Request</p>
                <div className="mt-3 grid gap-2">
                  <input value={formTitle} onChange={(event) => setFormTitle(event.target.value)} placeholder="Title" className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white" />
                  <textarea value={formDescription} onChange={(event) => setFormDescription(event.target.value)} placeholder="Description" className="min-h-20 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={formType} onChange={(event) => setFormType(event.target.value as ChangeType)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">{['feature', 'bug', 'design', 'wiring', 'docs'].map((item) => <option key={item}>{item}</option>)}</select>
                    <select value={formPriority} onChange={(event) => setFormPriority(event.target.value as ChangePriority)} className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 text-sm text-white">{['critical', 'high', 'medium', 'low'].map((item) => <option key={item}>{item}</option>)}</select>
                  </div>
                  <button onClick={() => addChangeRequest(selected)} className="h-10 rounded-xl bg-amber-400 text-sm font-semibold text-slate-950">Add Change Request</button>
                  {apiMessage && <p className="text-xs text-slate-300">{apiMessage}</p>}
                </div>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Change Requests</p>
                <div className="space-y-2">
                  {changeRequests.filter((request) => request.pageId === selected.id).map((request) => (
                    <div key={request.id} className="rounded-xl border border-white/10 bg-slate-900 p-3">
                      <p className="text-sm font-semibold text-white">{request.id}: {request.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{request.type} · {request.priority} · {request.status}</p>
                    </div>
                  ))}
                  {changeRequests.filter((request) => request.pageId === selected.id).length === 0 && <p className="text-sm text-slate-500">No change requests for this page.</p>}
                </div>
              </div>
            </aside>
          )}
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-5">
          <h2 className="text-2xl font-semibold text-white">Wiring Maps</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {wiringMaps.map((map) => (
              <a key={map.path} href={docHref(map.path)} className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-amber-300/40">
                <p className="font-semibold text-white">{map.title}</p>
                <p className="mt-2 text-xs text-slate-400">{map.path}</p>
              </a>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.length ? values.map((value) => <Badge key={value} className="border-white/10 bg-white/5 text-slate-300">{value}</Badge>) : <span className="text-sm text-slate-500">None listed</span>}
      </div>
    </div>
  );
}
