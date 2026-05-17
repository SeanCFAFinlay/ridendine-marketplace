import Link from 'next/link';
import { Card } from '@ridendine/ui';
import {
  CONTROL_CENTER_AREAS,
  getControlCenterSummary,
  type ControlCenterTone,
} from './control-center-model';

const toneClass: Record<ControlCenterTone, string> = {
  critical: 'border-danger/30 bg-danger/10 text-danger',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  healthy: 'border-success/30 bg-success/10 text-success',
  neutral: 'border-border bg-[#101827] text-textSubtle',
};

export function ControlCenter() {
  const summary = getControlCenterSummary();

  return (
    <Card className="border-border bg-surface p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Admin Control Center</p>
          <p className="text-xs text-textMuted">
            {summary.wiredAreas}/{summary.totalAreas} domains wired · {summary.totalActions} operator actions mapped
          </p>
        </div>
        <Link
          href="/dashboard/settings"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 text-sm font-medium text-textSubtle transition-colors hover:border-primary hover:text-white"
        >
          Engine settings
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {CONTROL_CENTER_AREAS.map((area) => (
          <Link
            key={area.key}
            href={area.href}
            className={`block rounded-lg border p-3 transition-colors hover:border-primary ${toneClass[area.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{area.title}</p>
                <p className="mt-1 line-clamp-2 text-xs opacity-80">{area.purpose}</p>
              </div>
              <span className="rounded border border-current/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-80">
                {area.apiRoutes.length} APIs
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {area.signals.slice(0, 3).map((signal) => (
                <span
                  key={signal}
                  className="rounded bg-black/20 px-1.5 py-0.5 text-[11px] opacity-85"
                >
                  {signal}
                </span>
              ))}
            </div>
            <p className="mt-2 text-[11px] opacity-70">
              Actions: {area.actions.slice(0, 3).join(', ')}
              {area.actions.length > 3 ? '...' : ''}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
