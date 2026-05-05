import { loadCommandCenterRegistry } from '@/lib/internal-command-center';

export default function UiBlueprintIndex() {
  const registry = loadCommandCenterRegistry();

  return (
    <main className="min-h-screen bg-[#080b10] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Ridéndine UI Blueprint</p>
            <h1 className="mt-2 text-4xl font-semibold text-white">Visual Gallery</h1>
            <p className="mt-2 text-sm text-slate-400">Static entry point for blueprint pages and screenshots generated from the command center registry.</p>
          </div>
          <a href="/internal/command-center" className="rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950">Open Command Center</a>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {registry.pages.map((page) => (
            <a key={page.id} href={page.route} className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/80 shadow-2xl transition hover:border-amber-300/40">
              <img src={page.publicScreenshot} alt={`${page.name} screenshot`} className="h-56 w-full object-cover object-top" />
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-white">{page.name}</h2>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">{page.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{page.designIntent}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
