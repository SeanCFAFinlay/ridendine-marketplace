import { describe, it, expect } from 'vitest';
import { computePayrollRun, payrollRunToCsv, type PayrollStaffInput } from './payroll.service';

const now = new Date('2026-07-12T20:00:00Z');

describe('computePayrollRun', () => {
  it('pays gross = hours × rate for closed entries', () => {
    const staff: PayrollStaffInput[] = [
      {
        staffId: 's1',
        name: 'Alex Prep',
        role: 'line_staff',
        hourlyRate: 17.5,
        entries: [
          { clock_in: '2026-07-10T14:00:00Z', clock_out: '2026-07-10T22:00:00Z', hourly_rate: 17.5 }, // 8h
          { clock_in: '2026-07-11T14:00:00Z', clock_out: '2026-07-11T18:30:00Z', hourly_rate: 17.5 }, // 4.5h
        ],
      },
    ];
    const run = computePayrollRun(staff, now);
    expect(run.lines[0]!.hours).toBe(12.5);
    expect(run.lines[0]!.grossPay).toBe(218.75); // 12.5 × 17.5
    expect(run.totalGross).toBe(218.75);
    expect(run.hasOpenEntries).toBe(false);
  });

  it('excludes open shifts from pay but reports them', () => {
    const staff: PayrollStaffInput[] = [
      {
        staffId: 's2',
        name: 'Sam Cook',
        hourlyRate: 24,
        entries: [
          { clock_in: '2026-07-11T13:00:00Z', clock_out: '2026-07-11T18:00:00Z', hourly_rate: 24 }, // 5h paid
          { clock_in: '2026-07-12T13:00:00Z', clock_out: null, hourly_rate: 24 }, // open → not paid
        ],
      },
    ];
    const run = computePayrollRun(staff, now);
    expect(run.lines[0]!.hours).toBe(5);
    expect(run.lines[0]!.grossPay).toBe(120);
    expect(run.lines[0]!.openEntries).toBe(1);
    expect(run.hasOpenEntries).toBe(true);
  });

  it('totals across staff', () => {
    const run = computePayrollRun(
      [
        { staffId: 'a', name: 'A', hourlyRate: 20, entries: [{ clock_in: '2026-07-10T14:00:00Z', clock_out: '2026-07-10T24:00:00Z', hourly_rate: 20 }] }, // 10h → 200
        { staffId: 'b', name: 'B', hourlyRate: 15, entries: [{ clock_in: '2026-07-10T14:00:00Z', clock_out: '2026-07-10T18:00:00Z', hourly_rate: 15 }] }, // 4h → 60
      ],
      now,
    );
    expect(run.staffCount).toBe(2);
    expect(run.totalHours).toBe(14);
    expect(run.totalGross).toBe(260);
  });
});

describe('payrollRunToCsv', () => {
  it('emits a header + one row per staff, quoting risky cells', () => {
    const run = computePayrollRun(
      [{ staffId: 's1', name: 'Prep, Alex', role: 'line', hourlyRate: 17.5, entries: [{ clock_in: '2026-07-10T14:00:00Z', clock_out: '2026-07-10T22:00:00Z', hourly_rate: 17.5 }] }],
      now,
    );
    const csv = payrollRunToCsv(run);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('staff_id,name,role,hourly_rate,hours,gross_pay');
    expect(lines[1]).toBe('s1,"Prep, Alex",line,17.50,8.00,140.00');
  });
});
