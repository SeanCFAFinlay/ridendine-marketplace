// ==========================================
// PAYROLL SERVICE (Ghost-Kitchen Phase D.1 — Path A export)
//
// Pure payroll math for a commissary pay period. Path A: we compute HOURS and
// GROSS pay (hours × snapshotted rate) for export to a Canadian provider
// (Wagepoint / Payment Evolution). We deliberately do NOT compute CPP / EI /
// income tax / remittances — that is the provider's job. No DB access.
//
// Only CLOSED time entries are payable; an open shift (no clock_out) is reported
// but not paid, so a period can't be finalised over a shift still in progress.
// ==========================================

import { hoursBetween, type TimeEntryLike } from '../orchestrators/labor.engine';

export interface PayrollStaffInput {
  staffId: string;
  name: string;
  role?: string | null;
  hourlyRate: number;
  /** This staff member's time entries within the pay period. */
  entries: TimeEntryLike[];
}

export interface PayrollStaffLine {
  staffId: string;
  name: string;
  role: string | null;
  hourlyRate: number;
  /** Total payable hours (closed entries only). */
  hours: number;
  /** hours × hourlyRate. Pre-tax; the provider withholds. */
  grossPay: number;
  /** Count of still-open entries excluded from this run. */
  openEntries: number;
}

export interface PayrollRun {
  lines: PayrollStaffLine[];
  totalHours: number;
  totalGross: number;
  staffCount: number;
  /** True if any staff had an open shift excluded — the caller should warn. */
  hasOpenEntries: boolean;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computePayrollRun(staff: PayrollStaffInput[], now: Date): PayrollRun {
  const lines: PayrollStaffLine[] = staff.map((s) => {
    let hours = 0;
    let gross = 0;
    let openEntries = 0;
    for (const e of s.entries) {
      if (!e.clock_out) {
        openEntries += 1;
        continue;
      }
      const h = hoursBetween(e.clock_in, e.clock_out, now);
      hours += h;
      // Use the entry's snapshotted rate (rate at time worked); fall back to the
      // staff's current rate. Handles a mid-period raise correctly.
      gross += h * Number(e.hourly_rate ?? s.hourlyRate ?? 0);
    }
    return {
      staffId: s.staffId,
      name: s.name,
      role: s.role ?? null,
      hourlyRate: round2(Number(s.hourlyRate ?? 0)),
      hours: round2(hours),
      grossPay: round2(gross),
      openEntries,
    };
  });

  return {
    lines,
    totalHours: round2(lines.reduce((a, l) => a + l.hours, 0)),
    totalGross: round2(lines.reduce((a, l) => a + l.grossPay, 0)),
    staffCount: lines.length,
    hasOpenEntries: lines.some((l) => l.openEntries > 0),
  };
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Provider-friendly CSV: one row per staff member. Gross only (pre-tax). */
export function payrollRunToCsv(run: PayrollRun): string {
  const header = ['staff_id', 'name', 'role', 'hourly_rate', 'hours', 'gross_pay'];
  const rows = run.lines.map((l) =>
    [
      l.staffId,
      csvCell(l.name),
      csvCell(l.role ?? ''),
      l.hourlyRate.toFixed(2),
      l.hours.toFixed(2),
      l.grossPay.toFixed(2),
    ].join(','),
  );
  return [header.join(','), ...rows].join('\n');
}
